const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');

const TIPMINER_PW = process.env.TIPMINER_PW || '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = process.env.GAME_PID || '0194b478-7a59-73aa-96aa-2217057b286c';
const PROXY_URL = process.env.TIPMINER_PROXY_URL || 'https://tipminer-proxy.riltonmaciel.workers.dev';

function tipMinerKey(uuid) {
  const k = uuid.length >= 32 ? uuid : [uuid, TIPMINER_PW].join('').slice(0, 32);
  return uuidv5(k, uuid);
}

async function fetchTipMinerAPI(limit, retries = 3) {
  const directUrl = `https://www.tipminer.com/api/v3/history/double/${GAME_PID}?timezone=America/Sao_Paulo&limit=${limit}&subject=filter`;
  const proxyUrl = PROXY_URL ? `${PROXY_URL}?limit=${limit}&pid=${GAME_PID}` : null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const useProxy = attempt > 0 && proxyUrl;
    const url = useProxy ? proxyUrl : directUrl;

    try {
      const headers = useProxy ? {} : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.tipminer.com/',
        'Origin': 'https://www.tipminer.com',
        'stack': 'redux',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      };

      const r = await fetch(url, { headers, timeout: 15000 });
      const text = await r.text();

      if (!r.ok) throw new Error(`HTTP ${r.status} - ${text.slice(0, 100)}`);

      let json;
      try { json = JSON.parse(text); } catch (e) {
        throw new Error(`Resposta não é JSON: ${text.slice(0, 100)}`);
      }

      if (Array.isArray(json)) return json;
      if (json.data) {
        const seal = json.data.split('~')[0];
        const pw = tipMinerKey(GAME_PID);
        const decrypted = await Iron.unseal(seal, { '1': pw }, Iron.defaults);
        const parsed = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        return Array.isArray(parsed) ? parsed : [];
      }
      throw new Error(`Formato inesperado: ${JSON.stringify(json).slice(0, 100)}`);
    } catch (err) {
      console.error(`[TipMiner] Tentativa ${attempt + 1}/${retries} (${useProxy ? 'proxy' : 'direto'}) falhou: ${err.message}`);
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { fetchTipMinerAPI, PROXY_URL, GAME_PID };
