const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');
const fs = require('fs');
const path = require('path');

const TIPMINER_PW = process.env.TIPMINER_PW || '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = process.env.GAME_PID || '6ee2f33f-7dbf-40ae-b01c-b05368c806ba';
const PROXY_URL = process.env.TIPMINER_PROXY_URL || 'https://tipminer-proxy.riltonmaciel.workers.dev';
const BLAZE_RECENT_URL = process.env.BLAZE_RECENT_URL || 'https://blaze.com/api/roulette_games/recent';
const TIPMINER_API_BASE = process.env.TIPMINER_API_BASE || 'https://api.core.public.tipminer.com/v1';
const TIPMINER_BACKOFF_MS = parseInt(process.env.TIPMINER_BACKOFF_MS || '60000', 10);
const TIPMINER_CACHE_MS = parseInt(process.env.TIPMINER_CACHE_MS || '60000', 10); // 60s - evita spam nas APIs
const BLAZE_BACKOFF_MS = parseInt(process.env.BLAZE_BACKOFF_MS || '60000', 10);
const LAST_ROUNDS_FILE = path.join(__dirname, '..', 'data', 'last-rounds.json');

let tipMinerBlockedUntil = 0;
let blazeBlockedUntil = 0;
let lastRoundsCache = [];
let lastRoundsCacheAt = 0;
let fetchInFlight = null;

// Inicializa cache com backup em disco no startup
(function initCache() {
  const backup = readLastRoundsBackup();
  if (backup.length > 0) {
    lastRoundsCache = backup;
    lastRoundsCacheAt = Date.now() - TIPMINER_CACHE_MS; // força refresh na próxima chamada
    console.log(`[TipMiner] Cache inicializado com ${backup.length} rodadas do backup local.`);
  }
}());

function readLastRoundsBackup() {
  try {
    if (!fs.existsSync(LAST_ROUNDS_FILE)) return [];
    const raw = fs.readFileSync(LAST_ROUNDS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLastRoundsBackup(rounds) {
  try {
    if (!Array.isArray(rounds) || rounds.length === 0) return;
    fs.writeFileSync(LAST_ROUNDS_FILE, JSON.stringify(rounds), 'utf8');
  } catch (_) {
    // ignora falha de backup local
  }
}

function tipMinerKey(uuid) {
  const k = uuid.length >= 32 ? uuid : [uuid, TIPMINER_PW].join('').slice(0, 32);
  return uuidv5(k, uuid);
}

async function fetchBlazeRecentAPI(limit) {
  if (Date.now() < blazeBlockedUntil) {
    return [];
  }

  const targetLimit = Math.max(1, Math.min(parseInt(limit) || 20, 20));

  try {
    const r = await fetch(BLAZE_RECENT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://blaze.com/'
      },
      timeout: 15000
    });

    const text = await r.text();
    if (!r.ok) {
      blazeBlockedUntil = Date.now() + BLAZE_BACKOFF_MS;
      throw new Error(`Blaze HTTP ${r.status}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('Blaze retornou formato inválido');
    }

    if (!Array.isArray(json) || json.length === 0) return [];

    const rounds = json.map(item => ({
      result: item.roll,
      time: item.created_at,
      date: item.created_at,
      created_at: item.created_at
    }));

    return rounds.slice(0, targetLimit);
  } catch (e) {
    blazeBlockedUntil = Date.now() + BLAZE_BACKOFF_MS;
    console.error(`[Blaze] Fallback falhou: ${e.message}`);
    return [];
  }
}

async function fetchTipMinerAPI(limit, retries = 3) {
  const requestedLimit = Math.max(1, parseInt(limit) || 200);

  // --- deduplicação de chamadas concorrentes ---
  if (fetchInFlight) {
    const shared = await fetchInFlight;
    return shared.slice(0, requestedLimit);
  }

  // --- cache em memória ainda válido ---
  if (lastRoundsCache.length > 0 && (Date.now() - lastRoundsCacheAt) < TIPMINER_CACHE_MS) {
    return lastRoundsCache.slice(0, requestedLimit);
  }

  // --- backoff ativo: usa cache/backup sem bater nas APIs ---
  if (Date.now() < tipMinerBlockedUntil) {
    const cached = lastRoundsCache.length > 0 ? lastRoundsCache : readLastRoundsBackup();
    if (cached.length > 0) {
      lastRoundsCache = cached;
      lastRoundsCacheAt = Date.now(); // renova TTL do cache durante backoff
      return cached.slice(0, requestedLimit);
    }
    // sem cache, tenta Blaze mesmo em backoff
    const blazeFallback = await fetchBlazeRecentAPI(requestedLimit);
    if (blazeFallback.length > 0) {
      lastRoundsCache = blazeFallback;
      lastRoundsCacheAt = Date.now();
      writeLastRoundsBackup(blazeFallback);
    }
    return blazeFallback.slice(0, requestedLimit);
  }

  const doFetch = async () => {
    const directUrl = `${TIPMINER_API_BASE}/double/rounds/${GAME_PID}/history?limit=${requestedLimit}&timezone=America%2FSao_Paulo`;
    const proxyUrl = PROXY_URL ? `${PROXY_URL}?limit=${requestedLimit}&pid=${GAME_PID}` : null;

    // --- tenta TipMiner (direto na 1ª tentativa, proxy nas demais) ---
    for (let attempt = 0; attempt < retries; attempt++) {
      const useProxy = attempt > 0 && proxyUrl;
      const url = useProxy ? proxyUrl : directUrl;

      try {
        const headers = useProxy ? {} : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': 'https://www.tipminer.com/',
          'Origin': 'https://www.tipminer.com',
          'stack': 'redux'
        };

        const r = await fetch(url, { headers, timeout: 15000 });
        const text = await r.text();

        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        let json;
        try { json = JSON.parse(text); }
        catch { throw new Error(`Resposta não é JSON: ${text.slice(0, 80)}`); }

        // Nova API: array de { uuid, type, result, instant }
        if (Array.isArray(json) && json.length > 0) {
          // Normaliza para o formato interno { result, time, date, created_at }
          const normalized = json.map(item => ({
            result: item.result,
            time: item.instant,
            date: item.instant,
            created_at: item.instant
          }));
          tipMinerBlockedUntil = 0;
          lastRoundsCache = normalized;
          lastRoundsCacheAt = Date.now();
          writeLastRoundsBackup(normalized);
          return normalized;
        }

        // Legado: resposta criptografada com json.data
        if (json && json.data) {
          const seal = json.data.split('~')[0];
          const pw = tipMinerKey(GAME_PID);
          const decrypted = await Iron.unseal(seal, { '1': pw }, Iron.defaults);
          const parsed = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
          const parsedArray = Array.isArray(parsed) ? parsed : [];
          if (parsedArray.length > 0) {
            tipMinerBlockedUntil = 0;
            lastRoundsCache = parsedArray;
            lastRoundsCacheAt = Date.now();
            writeLastRoundsBackup(parsedArray);
            return parsedArray;
          }
        }

        throw new Error(`Formato inesperado da resposta`);
      } catch (err) {
        console.error(`[TipMiner] Tentativa ${attempt + 1}/${retries} (${useProxy ? 'proxy' : 'direto'}) falhou: ${err.message}`);
        if (attempt < retries - 1) await new Promise(r => setTimeout(r, 2000));
      }
    }

    // --- TipMiner falhou: tenta fallback Blaze ---
    const blazeRounds = await fetchBlazeRecentAPI(requestedLimit);
    if (blazeRounds.length > 0) {
      tipMinerBlockedUntil = Date.now() + TIPMINER_BACKOFF_MS;
      lastRoundsCache = blazeRounds;
      lastRoundsCacheAt = Date.now();
      writeLastRoundsBackup(blazeRounds);
      console.warn(`[TipMiner] Usando fallback Blaze com ${blazeRounds.length} rodadas.`);
      return blazeRounds;
    }

    // --- Blaze também falhou: usa cache/backup (NÃO lança exceção) ---
    const cached = lastRoundsCache.length > 0 ? lastRoundsCache : readLastRoundsBackup();
    if (cached.length > 0) {
      console.warn(`[TipMiner] Todas as fontes falharam. Retornando ${cached.length} rodadas do cache local.`);
      lastRoundsCache = cached;
      lastRoundsCacheAt = Date.now();
      return cached;
    }

    // --- sem absolutamente nada: retorna vazio (nunca lança para o HTTP layer) ---
    console.error('[TipMiner] Nenhuma fonte disponível e sem cache/backup. Retornando [].');
    return [];
  };

  fetchInFlight = doFetch();
  try {
    const rounds = await fetchInFlight;
    return rounds.slice(0, requestedLimit);
  } finally {
    fetchInFlight = null;
  }
}

module.exports = { fetchTipMinerAPI, PROXY_URL, GAME_PID };
