const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const state = require('../state');
const { fetchTipMinerAPI, PROXY_URL, GAME_PID } = require('../services/tipminer');
const { preverProximosBrancos } = require('../services/padraoX');
const { analisarPadraoX, analisarHistoricoSinais } = require('../services/analise');
const { analisarPadraoCadeia } = require('../services/padraoCadeia');
const { analisarPrevisaoTempo } = require('../services/previsaoTempo');
const { analisarRec } = require('../services/recDetector');
const { analisarBot, registrarResultado, configurarBot } = require('../services/bot');
const { calcularHistoricoRetroativo } = require('../services/historicoPrevisoes');

let ultimaSincronizacaoRecentes = 0;
const INTERVALO_SYNC_RECENTES_MS = 10000;

function atualizarEstadoComRounds(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return false;

  const parseRoundTimestamp = (r) => {
    const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
    if (!ts) return null;
    if (typeof ts === 'number') return new Date(ts);
    if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const nums = rounds.map(r => {
    const n = parseInt(r.result);
    return isNaN(n) ? 0 : n;
  }).reverse();

  const horas = rounds.map(r => {
    const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
    if (ts) {
      if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      }
    }
    return '--:--';
  }).reverse();

  state.historicoGlobal = nums;
  state.horariosGlobal = horas;
  state.ultimaBusca = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo'
  });

  const dMaisRecente = parseRoundTimestamp(rounds[0]);
  if (dMaisRecente) {
    const atrasoMin = Math.max(0, Math.floor((Date.now() - dMaisRecente.getTime()) / 60000));
    state.ultimaDataFonteISO = dMaisRecente.toISOString();
    state.fonteAtrasoMinutos = atrasoMin;
    state.fonteAtrasada = atrasoMin > 30;
  } else {
    state.ultimaDataFonteISO = null;
    state.fonteAtrasoMinutos = null;
    state.fonteAtrasada = false;
  }

  return true;
}

async function sincronizarRecentesSeNecessario(force = false) {
  const agora = Date.now();
  if (!force && (agora - ultimaSincronizacaoRecentes) < INTERVALO_SYNC_RECENTES_MS) return;

  try {
    const rounds = await fetchTipMinerAPI(1000);
    if (atualizarEstadoComRounds(rounds)) {
      ultimaSincronizacaoRecentes = agora;
    }
  } catch (e) {
    console.error(`[Sync recentes] Falha: ${e.message}`);
  }
}

// GET /api/diagnostico
router.get('/diagnostico', async (req, res) => {
  const results = { proxy_url: PROXY_URL || '(não configurado)', tentativas: [] };
  const directUrl = `https://api.core.public.tipminer.com/v1/double/rounds/${GAME_PID}/history?limit=5&timezone=America%2FSao_Paulo`;

  try {
    const r = await fetch(directUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'stack': 'redux', 'Referer': 'https://www.tipminer.com/' },
      timeout: 10000
    });
    const t = await r.text();
    results.tentativas.push({ tipo: 'direto', status: r.status, body: t.slice(0, 200) });
  } catch (e) {
    results.tentativas.push({ tipo: 'direto', erro: e.message });
  }

  if (PROXY_URL) {
    try {
      const r2 = await fetch(`${PROXY_URL}?limit=5&pid=${GAME_PID}`, { timeout: 10000 });
      const t2 = await r2.text();
      results.tentativas.push({ tipo: 'proxy', status: r2.status, body: t2.slice(0, 200) });
    } catch (e2) {
      results.tentativas.push({ tipo: 'proxy', erro: e2.message });
    }
  }

  res.json(results);
});

// GET /api/previsoes
router.get('/previsoes', (req, res) => {
  const quantidade = req.query.quantidade || 10;
  const resultado = preverProximosBrancos(quantidade);
  res.json(resultado);
});

// POST /api/buscar
router.post('/buscar', async (req, res) => {
  const { limit } = req.body;
  const lim = Math.min(Math.max(parseInt(limit) || 500, 20), 2000);

  const rounds = await fetchTipMinerAPI(lim); // nunca lança exceção

  if (rounds.length > 0) {
    atualizarEstadoComRounds(rounds);
    ultimaSincronizacaoRecentes = Date.now();
  }

  // Responde com o que temos no estado global (pode ser do cache/backup)
  const temDados = state.historicoGlobal.length > 0;
  res.json({
    sucesso: temDados,
    rodadas: state.historicoGlobal.length,
    ultimaBusca: state.ultimaBusca,
    mensagem: temDados
      ? `${state.historicoGlobal.length} rodadas carregadas`
      : 'Fontes temporariamente indisponíveis. Aguardando dados.'
  });
});

// GET /api/historico-sinais
router.get('/historico-sinais', (req, res) => {
  res.json(analisarHistoricoSinais());
});

// GET /api/padrao-x
router.get('/padrao-x', (req, res) => {
  res.json(analisarPadraoX());
});

// GET /api/padrao-cadeia
router.get('/padrao-cadeia', (req, res) => {
  res.json(analisarPadraoCadeia());
});

// GET /api/previsao-tempo
router.get('/previsao-tempo', (req, res) => {
  res.json(analisarPrevisaoTempo());
});

// GET /api/historico-previsoes
router.get('/historico-previsoes', (req, res) => {
  res.json(calcularHistoricoRetroativo());
});

// GET /api/rec-detector
router.get('/rec-detector', (req, res) => {
  res.json(analisarRec());
});

// GET /api/status
router.get('/status', (req, res) => {
  res.json({
    rodadas: state.historicoGlobal.length,
    ultimoNumero: state.historicoGlobal.length > 0 ? state.historicoGlobal[state.historicoGlobal.length - 1] : null,
    ultimaBusca: state.ultimaBusca,
    ultimaDataFonteISO: state.ultimaDataFonteISO,
    fonteAtrasada: state.fonteAtrasada,
    fonteAtrasoMinutos: state.fonteAtrasoMinutos
  });
});

// GET /api/debug-brancos
router.get('/debug-brancos', (req, res) => {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;
  
  const brancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) {
      brancos.push({
        indice: i,
        hora: horas[i] || '--:--',
        rodadaGlobal: nums.length - 1 - i
      });
    }
  }
  
  res.json({
    totalRodadas: nums.length,
    totalBrancos: brancos.length,
    brancos: brancos.slice(-20), // últimos 20 brancos
    proximosOperacoesPorBranco: 'T1:Verm, T2:Diff, T3:Preto, T4:Média'
  });
});

// GET /api/ultimos-resultados?limit=50
router.get('/ultimos-resultados', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 10), 5000);
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;

  if (nums.length === 0) {
    return res.json({ erro: 'Sem dados', resultados: [], total: 0 });
  }

  // Encontrar brancos e calcular previsões para marcar no painel
  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  // Para cada branco, calcular onde era a previsão (posição prevista)
  // e marcar se acertou ou errou
  const marcacoes = new Map(); // idx -> { tipo, info }

  for (let b = 0; b < idxBrancos.length; b++) {
    const idx = idxBrancos[b];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    const a = nums[p1], c = nums[p2];
    if (a === 0 || c === 0) continue;
    const prev = Math.max(a, c);

    // Posição onde o branco ERA previsto
    const posAlvo = idx + prev;

    // Próximo branco real
    const proxBrancoIdx = b < idxBrancos.length - 1 ? idxBrancos[b + 1] : null;

    if (proxBrancoIdx !== null) {
      const real = proxBrancoIdx - idx;
      const erro = Math.abs(real - prev);
      const acertou = erro <= 3;

      // Marcar a posição do branco real
      marcacoes.set(proxBrancoIdx, {
        tipo: 'branco-real',
        acertou,
        previsto: prev,
        real,
        erro: real - prev,
        horaPrev: horas[Math.min(posAlvo, nums.length - 1)] || '--:--'
      });

      // Marcar a posição onde ERA previsto (se diferente do branco real)
      if (posAlvo < nums.length && posAlvo !== proxBrancoIdx) {
        marcacoes.set(posAlvo, {
          tipo: acertou ? 'previsao-proxima' : 'previsao-errou',
          previsto: prev,
          real,
          alvo: true,
          horaPrev: horas[posAlvo] || '--:--'
        });
      }
    }
  }

  // Marcar previsão ativa (próximo branco esperado)
  if (idxBrancos.length >= 1) {
    const ultimoIdx = idxBrancos[idxBrancos.length - 1];
    const pp1 = ultimoIdx - 2, pp2 = ultimoIdx - 3;
    if (pp2 >= 0 && nums[pp1] !== 0 && nums[pp2] !== 0) {
      const prevAtual = Math.max(nums[pp1], nums[pp2]);
      const posAlvoAtual = ultimoIdx + prevAtual;
      if (posAlvoAtual < nums.length) {
        marcacoes.set(posAlvoAtual, {
          tipo: 'previsao-ativa',
          previsto: prevAtual,
          rodadasRestantes: posAlvoAtual - (nums.length - 1)
        });
      }
    }
  }

  // Calcular delta para ajustar horas ao tempo real atual
  const horaAtualRes = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const ultimoDadoRes = horas[horas.length - 1] || '--:--';
  let deltaRes = 0;
  if (ultimoDadoRes !== '--:--') {
    const [dh, dm] = ultimoDadoRes.split(':').map(Number);
    const [rh, rm] = horaAtualRes.split(':').map(Number);
    const dadosM = dh * 60 + dm, realM = rh * 60 + rm;
    deltaRes = realM >= dadosM ? realM - dadosM : realM + 1440 - dadosM;
  }
  const ajustarHoraRes = (h) => {
    if (!h || h === '--:--' || deltaRes === 0) return h;
    const [hh, mm] = h.split(':').map(Number);
    const tot = ((hh * 60 + mm) + deltaRes + 1440) % 1440;
    return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
  };

  const startIdx = Math.max(0, nums.length - limit);
  const resultados = [];
  for (let i = nums.length - 1; i >= startIdx; i--) {
    const item = {
      num: nums[i],
      cor: nums[i] === 0 ? 'branco' : nums[i] <= 7 ? 'vermelho' : 'preto',
      hora: ajustarHoraRes(horas[i] || '--:--')
    };
    if (marcacoes.has(i)) {
      item.marcacao = marcacoes.get(i);
    }
    resultados.push(item);
  }

  res.json({
    resultados,
    total: nums.length,
    exibindo: resultados.length,
    ultimaBusca: state.ultimaBusca
  });
});

// ========== BOT ==========

// GET /api/bot-status
router.get('/bot-status', (req, res) => {
  res.json(analisarBot());
});

// POST /api/bot-config
router.post('/bot-config', (req, res) => {
  res.json(configurarBot(req.body));
});

// POST /api/bot-resultado
router.post('/bot-resultado', (req, res) => {
  const { tipo, casas } = req.body; // green, red, pulou, pulou-rec
  if (!tipo || !['green', 'red', 'pulou', 'pulou-rec'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use: green, red, pulou, pulou-rec' });
  }
  res.json(registrarResultado(tipo, casas ? parseInt(casas) : undefined));
});

module.exports = router;
