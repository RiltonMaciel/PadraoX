const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');
const XLSX = require('xlsx');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== TIPMINER API (encrypted) ==========
const TIPMINER_PW = process.env.TIPMINER_PW || '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = process.env.GAME_PID || '0194b478-7a59-73aa-96aa-2217057b286c'; // Blaze Double

function tipMinerKey(uuid) {
  const k = uuid.length >= 32 ? uuid : [uuid, TIPMINER_PW].join('').slice(0, 32);
  return uuidv5(k, uuid);
}

async function fetchTipMinerAPI(limit) {
  const url = `https://www.tipminer.com/api/v3/history/double/${GAME_PID}?timezone=America/Sao_Paulo&limit=${limit}&subject=filter`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'stack': 'redux',
      'referer': 'https://www.tipminer.com'
    },
    timeout: 15000
  });
  if (!r.ok) throw new Error(`TipMiner HTTP ${r.status}`);
  const json = await r.json();
  const xcrypt = r.headers.get('X-Crypt');
  if (!xcrypt || !json.data) return Array.isArray(json) ? json : [];
  const seal = json.data.split('~')[0];
  const pw = tipMinerKey(GAME_PID);
  const decrypted = await Iron.unseal(seal, { '1': pw }, Iron.defaults);
  const parsed = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
  return Array.isArray(parsed) ? parsed : [];
}

// ========== ESTADO ==========
let historicoGlobal = [];   // números em ordem cronológica
let horariosGlobal = [];    // horários correspondentes
let ultimaBusca = null;     // timestamp da última busca

// ========== ENDPOINTS ==========

// POST /api/buscar — busca dados via TipMiner API
app.post('/api/buscar', async (req, res) => {
  try {
    const { limit } = req.body;
    const lim = Math.min(Math.max(parseInt(limit) || 500, 20), 2000);

    const rounds = await fetchTipMinerAPI(lim);

    if (rounds.length > 0) {
      const nums = rounds.map(r => {
        const n = parseInt(r.result);
        return isNaN(n) ? 0 : n;
      }).reverse(); // cronológico

      const horas = rounds.map(r => {
        const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
        if (ts) {
          if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
          const d = new Date(ts);
          if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
      }).reverse();

      // Detectar novos números
      let novos = 0;
      if (historicoGlobal.length > 0) {
        const matchLen = Math.min(10, historicoGlobal.length);
        const oldSuffix = historicoGlobal.slice(-matchLen);
        const oldSuffixStr = JSON.stringify(oldSuffix);

        let novosInicio = -1;
        for (let i = nums.length - matchLen; i >= 0; i--) {
          const segment = nums.slice(i, i + matchLen);
          if (JSON.stringify(segment) === oldSuffixStr) {
            novosInicio = i + matchLen;
            break;
          }
        }
        novos = novosInicio > 0 ? nums.length - novosInicio : 0;
      } else {
        novos = nums.length;
      }

      historicoGlobal = nums;
      horariosGlobal = horas;
      ultimaBusca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return res.json({
        sucesso: true,
        rodadas: nums.length,
        novos,
        ultimaBusca,
        mensagem: `${nums.length} rodadas carregadas (${novos} novas)`
      });
    }

    res.json({ sucesso: false, rodadas: 0, novos: 0, mensagem: 'Nenhum dado retornado pela API.' });
  } catch (err) {
    res.status(500).json({ erro: `Erro ao acessar TipMiner: ${err.message}` });
  }
});

// GET /api/dados — retorna os dados atuais
app.get('/api/dados', (req, res) => {
  const total = historicoGlobal.length;
  if (total === 0) return res.json({ rodadas: [], total: 0, ultimaBusca: null });

  const limite = Math.min(parseInt(req.query.limite) || 100, total);
  const inicio = total - limite;

  const rodadas = [];
  for (let i = total - 1; i >= inicio; i--) {
    const num = historicoGlobal[i];
    rodadas.push({
      pos: total - i,
      num,
      cor: num === 0 ? 'branco' : num <= 7 ? 'vermelho' : 'preto',
      hora: horariosGlobal[i] || '--:--'
    });
  }

  res.json({
    rodadas,
    total,
    ultimaBusca,
    ultimoNumero: historicoGlobal[total - 1],
    ultimos10: historicoGlobal.slice(-10).reverse()
  });
});

// GET /api/status — status rápido
app.get('/api/status', (req, res) => {
  res.json({
    rodadas: historicoGlobal.length,
    ultimoNumero: historicoGlobal.length > 0 ? historicoGlobal[historicoGlobal.length - 1] : null,
    ultimaBusca
  });
});

// ========== PADRÃO X — Previsão do Branco ==========
const BLOQUEADORES = [2, 3, 11, 4, 12, 9];
const FAVORAVEIS = [14, 8, 1];
const BLOQUEADORES_EXATOS = [3, 6, 9, 13];
const FAVORAVEIS_EXATOS = [14, 2, 8];
const PADROES_ALERTA = ['PVP', 'VVV', 'VVP', 'PPP'];
const PADROES_BOM = ['VBP', 'PBV'];

function corDoNumero(n) {
  if (n === 0) return 'B';
  if (n <= 7) return 'V';
  return 'P';
}

function analisarPadraoX() {
  const nums = historicoGlobal;
  const horas = horariosGlobal;
  if (nums.length < 10) return { erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' };

  // Encontrar todos os brancos
  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 2) return { erro: 'Poucos brancos encontrados.' };

  // Último branco
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';

  // N1 = 2º antes, N2 = 3º antes
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;

  if (pos2 < 0) return { erro: 'Branco muito no início dos dados.' };

  const n1 = nums[pos1];
  const n2 = nums[pos2];
  const cor1 = corDoNumero(n1);
  const cor2 = corDoNumero(n2);

  // Se algum vizinho é branco, não prever
  if (n1 === 0 || n2 === 0) return { erro: 'Vizinhos do branco contêm outro branco. Aguardar próximo ciclo.' };

  const previsaoRodadas = Math.max(n1, n2);
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;
  const coresDiferentes = cor1 !== cor2;

  // Calcular horário previsto (~30s por rodada)
  const rodadasRestantes = previsaoRodadas - rodadasDesdeUltimo;

  // Verificar sinais nas últimas rodadas (posições entre branco e agora)
  const bloqueadoresVistos = [];
  const favoraveisVistos = [];
  const ultimasRodadas = nums.slice(ultimoBrancoIdx + 1);

  for (const n of ultimasRodadas) {
    if (BLOQUEADORES.includes(n)) bloqueadoresVistos.push(n);
    if (FAVORAVEIS.includes(n)) favoraveisVistos.push(n);
  }

  // Padrão de cor das últimas 3 rodadas
  const ultimas3 = nums.slice(-3).map(corDoNumero).join('');
  const padraoAlerta = PADROES_ALERTA.includes(ultimas3);
  const padraoBom = PADROES_BOM.includes(ultimas3);

  // Número na posição exata da previsão (se já chegou lá)
  const posPrevisao = ultimoBrancoIdx + previsaoRodadas;
  let numNaPosPrevisao = null;
  let bloqueadorExato = false;
  let favoravelExato = false;
  if (posPrevisao < nums.length) {
    numNaPosPrevisao = nums[posPrevisao];
    bloqueadorExato = BLOQUEADORES_EXATOS.includes(numNaPosPrevisao);
    favoravelExato = FAVORAVEIS_EXATOS.includes(numNaPosPrevisao);
  }

  // Calcular confiança
  let confianca = 50; // base
  if (coresDiferentes) confianca += 15;
  else confianca -= 10;
  if (favoraveisVistos.length > 0) confianca += 10;
  if (bloqueadoresVistos.length >= 3) confianca -= 20;
  else if (bloqueadoresVistos.length >= 1) confianca -= 8;
  if (padraoAlerta) confianca -= 20;
  if (padraoBom) confianca += 20;
  if (bloqueadorExato) confianca -= 25;
  if (favoravelExato) confianca += 15;
  confianca = Math.max(5, Math.min(95, confianca));

  // Status
  let status = 'aguardando';
  if (rodadasRestantes <= 0) {
    status = rodadasDesdeUltimo > previsaoRodadas + 15 ? 'expirado' : 'atrasado';
  } else if (rodadasRestantes <= 3) {
    status = 'iminente';
  }

  // Histórico de acertos recentes (últimos 5 brancos)
  const historico = [];
  const maxHist = Math.min(5, idxBrancos.length - 1);
  for (let i = idxBrancos.length - 2; i >= Math.max(0, idxBrancos.length - 1 - maxHist); i--) {
    const idx = idxBrancos[i];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    const a = nums[p1], b = nums[p2];
    if (a === 0 || b === 0) continue;
    const prev = Math.max(a, b);
    const real = idxBrancos[i + 1] - idx;
    const erro = Math.abs(real - prev);
    historico.push({
      hora: horas[idx] || '--:--',
      n1: a, n2: b,
      previsao: prev,
      real,
      acertou: erro <= 3
    });
  }

  return {
    ultimoBranco: {
      posicao: ultimoBrancoIdx + 1,
      hora: ultimoBrancoHora,
      rodadasAtras: rodadasDesdeUltimo
    },
    formula: {
      n1, cor1: cor1 === 'V' ? 'Vermelho' : 'Preto',
      n2, cor2: cor2 === 'V' ? 'Vermelho' : 'Preto',
      coresDiferentes,
      resultado: previsaoRodadas
    },
    previsao: {
      rodadasPrevistas: previsaoRodadas,
      rodadasJaPassaram: rodadasDesdeUltimo,
      rodadasRestantes: Math.max(0, rodadasRestantes),
      tempoEstimado: Math.max(0, Math.round(rodadasRestantes * 0.5)) + ' min',
      status
    },
    sinais: {
      bloqueadoresVistos,
      favoraveisVistos,
      padraoCores: ultimas3,
      padraoAlerta,
      padraoBom,
      numNaPosPrevisao,
      bloqueadorExato,
      favoravelExato
    },
    confianca,
    historico,
    dica: status === 'atrasado'
      ? 'Branco atrasou! 52% vem em +10 rodadas, 65% em +15.'
      : status === 'iminente'
      ? 'Branco pode sair nas próximas rodadas!'
      : status === 'expirado'
      ? 'Previsão expirou. Aguarde o próximo branco para novo ciclo.'
      : `Faltam ~${Math.max(0, rodadasRestantes)} rodadas para a previsão.`
  };
}

app.get('/api/padrao-x', (req, res) => {
  const resultado = analisarPadraoX();
  res.json(resultado);
});

// ========== EXCEL EXPORT ==========
const EXPORTS_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

app.post('/api/exportar', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.body.limit) || 200, 50), 5000);

  try {
    // Usar a função existente que já faz decriptação corretamente
    const dados = await fetchTipMinerAPI(limit);

    if (!dados || dados.length === 0) {
      return res.json({ erro: 'Nenhum resultado para exportar.' });
    }

    const nums = [];
    const horas = [];
    const rawRows = [];

    for (const item of dados) {
      const num = typeof item === 'object' ? (item.result ?? item.number ?? item.num ?? item.n) : item;
      const hora = typeof item === 'object' ? (item.time || item.hora || item.created_at || '') : '';
      if (num !== undefined && num !== null) {
        nums.push(Number(num));
        horas.push(hora);
        rawRows.push({
          Numero: Number(num),
          Cor: Number(num) === 0 ? 'Branco' : Number(num) <= 7 ? 'Vermelho' : 'Preto',
          Horario: hora || '--:--'
        });
      }
    }

    if (rawRows.length === 0) {
      return res.json({ erro: 'Nenhum resultado para exportar.' });
    }

    // Atualizar histórico global
    historicoGlobal = nums;
    horariosGlobal = horas;
    ultimaBusca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Criar Excel
    const ws = XLSX.utils.json_to_sheet(rawRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nomeArquivo = `blaze-double-${rawRows.length}-${timestamp}.xlsx`;
    const caminho = path.join(EXPORTS_DIR, nomeArquivo);
    XLSX.writeFile(wb, caminho);

    res.json({
      sucesso: true,
      mensagem: `${rawRows.length} resultados exportados com sucesso!`,
      arquivo: nomeArquivo,
      caminho: caminho
    });
  } catch (err) {
    res.json({ erro: `Erro na exportação: ${err.message}` });
  }
});

app.get('/api/arquivos', (req, res) => {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) return res.json([]);
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => {
        const stats = fs.statSync(path.join(EXPORTS_DIR, f));
        const kb = (stats.size / 1024).toFixed(1) + ' KB';
        const data = stats.mtime.toLocaleDateString('pt-BR') + ' ' +
                     stats.mtime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return { nome: f, tamanho: kb, data };
      })
      .sort((a, b) => b.data.localeCompare(a.data));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/abrir-pasta', (req, res) => {
  const dir = EXPORTS_DIR.replace(/\//g, '\\');
  exec(`explorer "${dir}"`);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Blaze Fetcher rodando em http://localhost:${PORT}`);
});
