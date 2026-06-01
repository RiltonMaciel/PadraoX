const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== TIPMINER API (encrypted) ==========
const TIPMINER_PW = process.env.TIPMINER_PW || '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = process.env.GAME_PID || '0194b478-7a59-73aa-96aa-2217057b286c';

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
let historicoGlobal = [];
let horariosGlobal = [];
let ultimaBusca = null;

// ========== PADRÃO X — CONSTANTES ==========
const BLOQUEADORES = [2, 3, 11, 4, 12, 9];
const FAVORAVEIS = [14, 8, 1];
const BLOQUEADORES_EXATOS = [3, 6, 9, 13];
const FAVORAVEIS_EXATOS = [14, 2, 8];
const PADROES_ALERTA = ['PVP', 'VVV', 'VVP', 'PPP'];
const PADROES_BOM = ['VBP', 'PBV'];

function corLetra(n) {
  if (n === 0) return 'B';
  if (n <= 7) return 'V';
  return 'P';
}

function corNome(n) {
  if (n === 0) return 'Branco';
  if (n <= 7) return 'Vermelho';
  return 'Preto';
}

// ========== FUNÇÃO PRINCIPAL: PREVER PRÓXIMOS BRANCOS ==========

function preverProximosBrancos(nums, horas, quantidade) {
  quantidade = Math.min(Math.max(parseInt(quantidade) || 10, 5), 1000);

  if (nums.length < 10) return { erro: 'Dados insuficientes' };

  // Encontrar todos os brancos
  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 3) return { erro: 'Poucos brancos para calcular padrão' };

  // Calcular intervalos reais entre brancos
  const intervalosReais = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalosReais.push(idxBrancos[i] - idxBrancos[i - 1]);
  }

  const medianaIntervalo = [...intervalosReais].sort((a, b) => a - b)[Math.floor(intervalosReais.length / 2)];

  // Previsão do PRIMEIRO branco via Padrão X + Cadeia
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;

  let previsaoRodadas;
  let metodo = 'MAX';
  let cadeiaSaltos = 0;

  if (pos2 >= 0 && nums[pos1] !== 0 && nums[pos2] !== 0) {
    const maxVal = Math.max(nums[pos1], nums[pos2]);
    const posAlvo = ultimoBrancoIdx + maxVal;

    // Aplicar cadeia se alvo já foi ultrapassado e não é branco
    if (posAlvo < nums.length && nums[posAlvo] !== 0) {
      let posAtual = posAlvo;
      let passos = 0;
      while (posAtual < nums.length && nums[posAtual] !== 0 && passos < 10) {
        posAtual += nums[posAtual];
        passos++;
      }
      previsaoRodadas = posAtual - ultimoBrancoIdx;
      cadeiaSaltos = passos;
      metodo = 'CADEIA';
    } else {
      previsaoRodadas = maxVal;
    }
  } else {
    previsaoRodadas = medianaIntervalo;
    metodo = 'MEDIANA';
  }

  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;
  const agora = new Date();

  const SEGUNDOS_POR_RODADA = 30;

  // Gerar lista de previsões
  const previsoes = [];

  for (let i = 0; i < quantidade; i++) {
    let rodadasAteEste;

    if (i === 0) {
      rodadasAteEste = previsaoRodadas - rodadasDesdeUltimo;
    } else {
      const prevAnterior = previsoes[i - 1];
      rodadasAteEste = prevAnterior.rodadasRestantes + medianaIntervalo;
    }

    const segundosAte = Math.max(0, rodadasAteEste) * SEGUNDOS_POR_RODADA;
    const horaPrevista = new Date(agora.getTime() + segundosAte * 1000);
    const horaFormatada = horaPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    previsoes.push({
      ordem: i + 1,
      horario: horaFormatada,
      rodadasRestantes: Math.max(0, Math.round(rodadasAteEste)),
      tempoRestante: formatarTempo(segundosAte),
      metodo: i === 0 ? metodo : 'MEDIANA',
      cadeiaSaltos: i === 0 ? cadeiaSaltos : 0
    });
  }

  const n1 = pos2 >= 0 ? nums[pos1] : '?';
  const n2 = pos2 >= 0 ? nums[pos2] : '?';
  const formulaBase = `MAX(${n1}, ${n2}) = ${pos2 >= 0 ? Math.max(nums[pos1], nums[pos2]) : '?'}`;
  const formulaTexto = metodo === 'CADEIA'
    ? `${formulaBase} + Cadeia(${cadeiaSaltos}x) = ${previsaoRodadas} rodadas`
    : `${formulaBase} rodadas`;

  return {
    previsoes,
    formula: formulaTexto,
    metodo,
    cadeiaSaltos,
    medianaIntervalo,
    ultimoBranco: {
      hora: horas[ultimoBrancoIdx] || '--:--',
      rodadasAtras: rodadasDesdeUltimo
    },
    totalBrancos: idxBrancos.length,
    totalRodadas: nums.length
  };
}

function formatarTempo(segundos) {
  if (segundos <= 0) return 'AGORA';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.round(segundos % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

// ========== ENDPOINTS ==========

// GET /api/previsoes — retorna previsões dos próximos brancos
// ?quantidade=10 (5 a 1000)
app.get('/api/previsoes', (req, res) => {
  const quantidade = req.query.quantidade || 10;
  const resultado = preverProximosBrancos(historicoGlobal, horariosGlobal, quantidade);
  res.json(resultado);
});

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
      }).reverse();

      const horas = rounds.map(r => {
        const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
        if (ts) {
          if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
          const d = new Date(ts);
          if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
      }).reverse();

      historicoGlobal = nums;
      horariosGlobal = horas;
      ultimaBusca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return res.json({
        sucesso: true,
        rodadas: nums.length,
        ultimaBusca,
        mensagem: `${nums.length} rodadas carregadas`
      });
    }

    res.json({ sucesso: false, rodadas: 0, mensagem: 'Nenhum dado retornado pela API.' });
  } catch (err) {
    res.status(500).json({ erro: `Erro ao acessar TipMiner: ${err.message}` });
  }
});

// GET /api/historico-sinais — histórico de sinais passados com cadeia
app.get('/api/historico-sinais', (req, res) => {
  const nums = historicoGlobal;
  const horas = horariosGlobal;

  if (nums.length < 10) return res.json({ erro: 'Dados insuficientes' });

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 3) return res.json({ erro: 'Poucos brancos' });

  const sinais = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    const idx = idxBrancos[i - 1];
    const realIdx = idxBrancos[i];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    const a = nums[p1], b = nums[p2];
    if (a === 0 || b === 0) continue;

    const previsto = Math.max(a, b);
    const real = realIdx - idx;
    const diferencaMax = real - previsto;
    const acertouMax = Math.abs(diferencaMax) <= 3;

    // Aplicar cadeia
    const posAlvo = idx + previsto;
    let cadeiaPosicao = posAlvo;
    let cadeiaSaltos = 0;
    const cadeiaNumeros = [];

    if (posAlvo < realIdx && posAlvo < nums.length) {
      // MAX ficou antes do branco → cadeia necessária
      let pos = posAlvo;
      while (pos < realIdx && pos < nums.length && nums[pos] !== 0 && cadeiaSaltos < 10) {
        cadeiaNumeros.push(nums[pos]);
        pos += nums[pos];
        cadeiaSaltos++;
      }
      cadeiaPosicao = pos;
    }

    const erroCadeia = cadeiaPosicao - realIdx;
    const acertouCadeia = Math.abs(erroCadeia) <= 1;

    const horaBranco = horas[idx] || '--:--';
    const horaReal = horas[realIdx] || '--:--';

    sinais.push({
      horaBranco,
      horaReal,
      n1: a,
      n2: b,
      previsto,
      real,
      diferencaMax,
      acertouMax,
      // Cadeia
      cadeiaSaltos,
      cadeiaNumeros: cadeiaNumeros.join('→'),
      erroCadeia,
      acertouCadeia,
      // Status final — acerta se QUALQUER método acertou
      acertou: acertouMax || acertouCadeia,
      metodo: cadeiaSaltos > 0 ? 'CADEIA' : 'MAX',
      status: (acertouMax || acertouCadeia)
        ? 'acertou'
        : (cadeiaSaltos > 0
          ? `cadeia +${erroCadeia}`
          : (diferencaMax > 0 ? `+${diferencaMax} atrasou` : `${diferencaMax} adiantou`))
    });
  }

  // Estatísticas
  const total = sinais.length;
  const acertosTotal = sinais.filter(s => s.acertou).length;
  const acertosMax = sinais.filter(s => s.acertouMax).length;
  const casosCadeia = sinais.filter(s => s.cadeiaSaltos > 0);
  const acertosCadeia = casosCadeia.filter(s => s.acertouCadeia).length;

  res.json({
    sinais: sinais.reverse(),
    stats: {
      total,
      acertos: acertosTotal,
      erros: total - acertosTotal,
      taxa: total > 0 ? ((acertosTotal / total) * 100).toFixed(1) + '%' : '0%',
      // Detalhamento
      acertosMaxDireto: acertosMax,
      taxaMax: total > 0 ? ((acertosMax / total) * 100).toFixed(1) + '%' : '0%',
      casosCadeia: casosCadeia.length,
      acertosCadeia,
      taxaCadeia: casosCadeia.length > 0 ? ((acertosCadeia / casosCadeia.length) * 100).toFixed(1) + '%' : '0%'
    }
  });
});

// GET /api/padrao-x — análise completa do Padrão X
app.get('/api/padrao-x', (req, res) => {
  const nums = historicoGlobal;
  const horas = horariosGlobal;

  if (nums.length < 10) {
    return res.json({ erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' });
  }

  // Encontrar todos os brancos
  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 2) {
    return res.json({ erro: 'Poucos brancos encontrados.' });
  }

  // Último branco
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';

  // N1 = 2º antes, N2 = 3º antes (pula vizinho imediato)
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;

  if (pos2 < 0) {
    return res.json({ erro: 'Branco muito no início dos dados.' });
  }

  const n1 = nums[pos1];
  const n2 = nums[pos2];

  if (n1 === 0 || n2 === 0) {
    return res.json({ erro: 'Vizinhos do branco contêm outro branco. Aguardar próximo ciclo.' });
  }

  const cor1 = corLetra(n1);
  const cor2 = corLetra(n2);
  const coresDiferentes = cor1 !== cor2;
  const previsaoRodadas = Math.max(n1, n2);
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;
  const rodadasRestantes = previsaoRodadas - rodadasDesdeUltimo;

  // Sinais nas rodadas após o branco
  const rodadasApos = nums.slice(ultimoBrancoIdx + 1);
  const bloqueadoresVistos = [];
  const favoraveisVistos = [];

  for (const n of rodadasApos) {
    if (BLOQUEADORES.includes(n) && !bloqueadoresVistos.includes(n)) bloqueadoresVistos.push(n);
    if (FAVORAVEIS.includes(n) && !favoraveisVistos.includes(n)) favoraveisVistos.push(n);
  }

  // Padrão de cor das últimas 3 rodadas
  const ultimas3 = nums.slice(-3).map(corLetra).join('');
  const padraoAlerta = PADROES_ALERTA.includes(ultimas3);
  const padraoBom = PADROES_BOM.includes(ultimas3);

  // Número na posição exata da previsão
  const posPrevisao = ultimoBrancoIdx + previsaoRodadas;
  let numNaPosPrevisao = null;
  let bloqueadorExato = false;
  let favoravelExato = false;
  if (posPrevisao < nums.length) {
    numNaPosPrevisao = nums[posPrevisao];
    bloqueadorExato = BLOQUEADORES_EXATOS.includes(numNaPosPrevisao);
    favoravelExato = FAVORAVEIS_EXATOS.includes(numNaPosPrevisao);
  }

  // Confiança
  let confianca = 50;
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

  // Histórico de acertos (últimos 10 ciclos)
  const historico = [];
  for (let i = Math.max(0, idxBrancos.length - 11); i < idxBrancos.length - 1; i++) {
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

  // Últimos 30 resultados para exibir bolinhas
  const ultimos30 = [];
  const startIdx = Math.max(0, nums.length - 30);
  for (let i = startIdx; i < nums.length; i++) {
    ultimos30.push({
      num: nums[i],
      cor: nums[i] === 0 ? 'branco' : nums[i] <= 7 ? 'vermelho' : 'preto',
      hora: horas[i] || '--:--'
    });
  }

  // Estatísticas gerais
  const totalBrancos = idxBrancos.length;
  const taxaBranco = ((totalBrancos / nums.length) * 100).toFixed(1);
  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalos.push(idxBrancos[i] - idxBrancos[i - 1]);
  }
  const mediaIntervalo = intervalos.length > 0
    ? (intervalos.reduce((a, b) => a + b, 0) / intervalos.length).toFixed(1)
    : 0;

  // Dica
  let dica;
  if (status === 'atrasado') dica = 'Branco atrasou! 52% vem em +10 rodadas, 65% em +15. Mantenha atenção.';
  else if (status === 'iminente') dica = 'Branco pode sair nas próximas 1-3 rodadas!';
  else if (status === 'expirado') dica = 'Previsão expirou. Aguarde o próximo branco para novo ciclo.';
  else dica = `Faltam ~${Math.max(0, rodadasRestantes)} rodadas (~${Math.max(0, Math.round(rodadasRestantes * 0.5))} min) para a previsão.`;

  res.json({
    ultimoBranco: {
      posicao: ultimoBrancoIdx + 1,
      hora: ultimoBrancoHora,
      rodadasAtras: rodadasDesdeUltimo
    },
    formula: {
      n1, cor1: corNome(n1),
      n2, cor2: corNome(n2),
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
    ultimos30,
    stats: {
      totalRodadas: nums.length,
      totalBrancos,
      taxaBranco: taxaBranco + '%',
      mediaIntervalo: mediaIntervalo + ' rodadas',
      ultimaBusca
    },
    dica
  });
});

// GET /api/status
app.get('/api/status', (req, res) => {
  res.json({
    rodadas: historicoGlobal.length,
    ultimoNumero: historicoGlobal.length > 0 ? historicoGlobal[historicoGlobal.length - 1] : null,
    ultimaBusca
  });
});

// ========== PADRÃO CADEIA — Previsão Refinada ==========
app.get('/api/padrao-cadeia', (req, res) => {
  const nums = historicoGlobal;
  const horas = horariosGlobal;

  if (nums.length < 20) return res.json({ erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' });

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return res.json({ erro: 'Poucos brancos encontrados.' });

  // Último branco
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;

  // Passo 1: Padrão X
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;
  if (pos2 < 0) return res.json({ erro: 'Branco muito no início dos dados.' });

  const n1 = nums[pos1];
  const n2 = nums[pos2];
  if (n1 === 0 || n2 === 0) return res.json({ erro: 'Vizinhos contêm branco. Aguardar próximo ciclo.' });

  const maxVal = Math.max(n1, n2);
  const posAlvo = ultimoBrancoIdx + maxVal;

  // Passo 2: Cadeia de saltos
  const chain = [];
  let posAtual = posAlvo;
  let previsaoFinal = posAlvo;

  if (posAlvo < nums.length && nums[posAlvo] !== 0) {
    let passos = 0;
    while (posAtual < nums.length && nums[posAtual] !== 0 && passos < 10) {
      const n = nums[posAtual];
      chain.push({ pos: posAtual, num: n, hora: horas[posAtual] || '--:--' });
      posAtual += n;
      passos++;
    }
    previsaoFinal = posAtual;
  } else if (posAlvo < nums.length && nums[posAlvo] === 0) {
    previsaoFinal = posAlvo;
  }

  const rodadasRestantes = previsaoFinal - (nums.length - 1);
  const rodadasRestantesMinus1 = rodadasRestantes - 1;

  // Status
  let status = 'aguardando';
  if (rodadasRestantes <= 0) status = 'atrasado';
  else if (rodadasRestantes <= 2) status = 'iminente';
  else if (rodadasRestantes <= 5) status = 'proximo';

  // Confiança
  let confianca = 60;
  if (chain.length > 0) {
    const ultimoNum = chain[chain.length - 1].num;
    if (ultimoNum <= 5) confianca += 20;
    else if (ultimoNum <= 8) confianca += 5;
    else confianca -= 15;
  }
  if (chain.length <= 2) confianca += 10;
  if (chain.length >= 5) confianca -= 15;
  confianca = Math.max(10, Math.min(95, confianca));

  const ultimoNumCadeia = chain.length > 0 ? chain[chain.length - 1].num : 0;
  const riscoOvershoot = ultimoNumCadeia >= 8;

  // Histórico de cadeia (últimos ciclos)
  const historicoCadeia = [];
  for (let i = idxBrancos.length - 2; i >= Math.max(0, idxBrancos.length - 8); i--) {
    const idx = idxBrancos[i];
    const real = idxBrancos[i + 1];
    const p1b = idx - 2, p2b = idx - 3;
    if (p2b < 0) continue;
    const a = nums[p1b], b = nums[p2b];
    if (a === 0 || b === 0) continue;
    const prev = Math.max(a, b);
    const alvo = idx + prev;
    if (alvo >= real) {
      historicoCadeia.push({ hora: horas[idx], tipo: 'MAX_DIRETO', acertou: alvo === real, erro: alvo - real });
      continue;
    }
    let pos = alvo, steps = 0;
    const ch = [];
    while (pos < real && steps < 10) {
      const n = nums[pos];
      ch.push(n);
      pos += n;
      steps++;
    }
    const erro = pos - real;
    historicoCadeia.push({
      hora: horas[idx], tipo: 'CADEIA', saltos: steps,
      cadeia: ch.join('→'), acertou: Math.abs(erro) <= 1, erro
    });
  }

  res.json({
    ultimoBranco: { hora: ultimoBrancoHora, rodadasAtras: rodadasDesdeUltimo },
    padraoX: { n1, n2, max: maxVal, posAlvo, alvoJaPassou: posAlvo < nums.length },
    cadeia: { saltos: chain, totalSaltos: chain.length, previsaoFinal, posicaoMinus1: previsaoFinal - 1 },
    previsao: {
      rodadasRestantes: Math.max(0, rodadasRestantes),
      rodadasRestantesMinus1: Math.max(0, rodadasRestantesMinus1),
      tempoEstimadoSeg: Math.max(0, rodadasRestantes * 30),
      status, riscoOvershoot, ultimoNumCadeia
    },
    confianca,
    historicoCadeia
  });
});

app.listen(PORT, () => {
  console.log(`Padrão X rodando em http://localhost:${PORT}`);
});
