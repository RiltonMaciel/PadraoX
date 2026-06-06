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

// GET /api/diagnostico
router.get('/diagnostico', async (req, res) => {
  const results = { proxy_url: PROXY_URL || '(não configurado)', tentativas: [] };
  const directUrl = `https://www.tipminer.com/api/v3/history/double/${GAME_PID}?timezone=America/Sao_Paulo&limit=5&subject=filter`;

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
  try {
    const { limit } = req.body;
    const lim = Math.min(Math.max(parseInt(limit) || 500, 20), 2000);

    const rounds = await fetchTipMinerAPI(lim);

    if (rounds.length > 0) {
      const nums = rounds.map(r => {
        const n = parseInt(r.result);
        return isNaN(n) ? 0 : n;
      }).reverse();

      const horas = rounds.map(r => {
        const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
        if (ts) {
          if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
          const d = new Date(ts);
          if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        }
        return '--:--';
      }).reverse();

      state.historicoGlobal = nums;
      state.horariosGlobal = horas;
      state.ultimaBusca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });

      return res.json({
        sucesso: true,
        rodadas: nums.length,
        ultimaBusca: state.ultimaBusca,
        mensagem: `${nums.length} rodadas carregadas`
      });
    }

    res.json({ sucesso: false, rodadas: 0, mensagem: 'Nenhum dado retornado pela API.' });
  } catch (err) {
    res.status(500).json({ erro: `Erro ao acessar TipMiner: ${err.message}` });
  }
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

// GET /api/rec-detector
router.get('/rec-detector', (req, res) => {
  res.json(analisarRec());
});

// GET /api/status
router.get('/status', (req, res) => {
  res.json({
    rodadas: state.historicoGlobal.length,
    ultimoNumero: state.historicoGlobal.length > 0 ? state.historicoGlobal[state.historicoGlobal.length - 1] : null,
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
  const { tipo } = req.body; // green, red, pulou, pulou-rec
  if (!tipo || !['green', 'red', 'pulou', 'pulou-rec'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use: green, red, pulou, pulou-rec' });
  }
  res.json(registrarResultado(tipo));
});

module.exports = router;
