const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== MOTOR ADAPTATIVO v8 ==========
// Pares Condicionais + Gatilhos + Veto + Boost Distância + Janela Dinâmica + Triplas + Stacking + Anti-streak + Confiança Real
// Validado em 16.700 jogos (11.7k hist + 5k P6)

// === CONSTANTES V11 — Motor baseado em STREAK DE COR + GATILHO ===
// Validado em 1000 rodadas recentes (25/05/2026)
// Princípio: streak de preto = mola comprimida → branco iminente
//            streak de vermelho = mola relaxada → NÃO apostar
const PARES_HOT = {
  '8,5': 2.5,    // 40.0% (2/5) Z=2.98 — par mais quente da amostra 1k
  '3,11': 2.3,   // 37.5% (3/8) Z=3.48
  '1,10': 2.0,   // 33.3% (2/6) Z=2.61
  '10,8': 1.8,   // 25.0% (2/8) Z=2.07
  '4,0': 1.8,    // 25.0% (2/8) Z=2.07
};

// Pares que NUNCA deram branco nas 1k recentes (veto)
const PARES_VETO = new Set([
  '7,8',    // 0.0% (0/9)
  '2,7',    // 0.0% (0/10)
  '10,0',   // 0.0% (0/7)
  '12,5',   // 0.0% (0/7)
  '8,11',   // 0.0% (0/7)
  '6,14',   // 0.0% (0/7)
  '5,1',    // 0.0% (0/5)
  '11,5',   // 0.0% (0/6)
  '12,12',  // 0.0% (0/5)
  '12,6',   // 0.0% (0/5)
]);

// Gatilho 8/10 — confirmado nas 1k recentes (11.0%, Z=2.09)
// Boost AUMENTADO: antes era +0.2, agora +0.5 (dobro da base rate)
const NUMS_GATILHO = { 8: 0.5, 10: 0.5 };

// === FEATURE 1: BOOST POR DISTÂNCIA DO BRANCO (DESATIVADO — dados mostraram que não melhora previsão) ===
function calcBoostDistancia(distBranco) {
  // Análise de 10k rodadas provou: distância NÃO prediz branco iminente
  // Todas as faixas (1-10, 11-20, 21-30, 31+) giram em ~50% de acerto
  return 1.0;
}

// === TRIPLAS V10 — REMOVIDAS (amostra insuficiente: max 3 ocorrências em 5k rodadas) ===
const TRIPLAS_HOT = {};

// === BOOST CONDICIONAL V11 — Baseado em STREAK DE COR (validado 1k rodadas 25/05/2026) ===
// Streaks de preto: 3+=26.9%, 4+=47.6%, 5+=62.5% (J=5)
// Anti-vermelho: 3+ vermelhos seguidos = 2.2% (BLOQUEIA)
function boostCondicionalV11(historico, endIdx) {
  let bonus = 0;
  const boostMotivos = [];
  let antiSinal = false;

  // 1. STREAK DE PRETO (8-14) — SINAL PRINCIPAL
  let streakPreto = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] >= 8 && historico[i] <= 14) streakPreto++;
    else break;
  }

  if (streakPreto >= 5) {
    bonus += 3.0;  // Nível FORTE garantido (score >=2.0 + isso)
    boostMotivos.push('5+PRETO ★★★ +3.0');
  } else if (streakPreto >= 4) {
    bonus += 2.0;  // Nível FORTE
    boostMotivos.push('4+PRETO ★★ +2.0');
  } else if (streakPreto >= 3) {
    bonus += 1.0;  // Nível MEDIO
    boostMotivos.push('3+PRETO ★ +1.0');
  }

  // 2. ANTI-SINAL: STREAK DE VERMELHO (1-7) — BLOQUEIA APOSTA
  let streakVerm = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] >= 1 && historico[i] <= 7) streakVerm++;
    else break;
  }

  if (streakVerm >= 3) {
    antiSinal = true;
    boostMotivos.push('3+VERM ANTI-SINAL');
  }

  // 3. Distância >= 35 — ainda válido como reforço (mantido dos 10k)
  let dist = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] === 0) { dist = endIdx - i; break; }
    dist = endIdx - i + 1;
  }
  if (dist >= 50) { bonus += 1.5; boostMotivos.push('Dist' + dist + ' +1.5'); }
  else if (dist >= 35) { bonus += 0.8; boostMotivos.push('Dist' + dist + ' +0.8'); }

  return { bonus, motivos: boostMotivos, antiSinal };
}

// === FEATURE 2: JANELA DINÂMICA DE PARES ===
function calcParesDinamicos(historico, janelaTamanho) {
  janelaTamanho = janelaTamanho || 300;
  const T = historico.length;
  const inicio = Math.max(0, T - janelaTamanho);
  const pairStats = {};
  for (let i = inicio + 1; i < T; i++) {
    const par = historico[i - 1] + ',' + historico[i];
    if (!pairStats[par]) pairStats[par] = { total: 0, brancos: 0 };
    pairStats[par].total++;
    if (i + 1 < T && historico[i + 1] === 0) pairStats[par].brancos++;
  }
  const baseRate = historico.slice(inicio).filter(n => n === 0).length / (T - inicio) || 0.0667;
  const dinamicos = {};
  for (const [par, stats] of Object.entries(pairStats)) {
    if (stats.total < 3) continue;
    const rate = stats.brancos / stats.total;
    const lift = rate / baseRate;
    if (lift >= 1.5 && stats.brancos >= 2) {
      dinamicos[par] = { rate, lift, total: stats.total, brancos: stats.brancos };
    }
  }
  return { dinamicos, baseRate };
}

// === FEATURE 5: ANTI-STREAK (DESATIVADO — falácia do jogador, dist não prediz branco) ===
function calcAntiStreak(distBranco) {
  return 0;
}

class MotorAdaptativo {
  constructor(historico, opcoes = {}) {
    this.historico = historico;
    this.janela = opcoes.janela || 200;
    this.ultimaCalibracao = null;
    this.paresDinamicos = null;
  }

  calibrar() {
    const h = this.historico;
    const T = h.length;
    const inicio = Math.max(0, T - this.janela);
    const janela = h.slice(inicio);
    const J = janela.length;
    const brancos = janela.filter(n => n === 0).length;
    const baseRate = brancos / J || 0.0667;

    const { dinamicos } = calcParesDinamicos(h, 300);
    this.paresDinamicos = dinamicos;
    this.ultimaCalibracao = { janela: J, baseRate, brancos, timestamp: Date.now() };
  }

  calcScore(endIdx) {
    const h = this.historico;
    if (endIdx < 1) return { score: 0, veto: false, par: null, gatilho: false, dupla: false, boosts: [] };

    const penultimo = h[endIdx - 1];
    const ultimo = h[endIdx];
    const parKey = `${penultimo},${ultimo}`;

    if (PARES_VETO.has(parKey)) {
      return { score: -1, veto: true, par: parKey, gatilho: false, dupla: ultimo === penultimo, boosts: ['VETO'] };
    }

    let score = 0;
    let gatilho = false;
    const dupla = ultimo === penultimo;
    const boosts = [];

    // Par HOT
    if (PARES_HOT[parKey]) {
      score = PARES_HOT[parKey];
      boosts.push('Par HOT (' + parKey + ') +' + PARES_HOT[parKey]);
    }

    // Gatilho
    if (NUMS_GATILHO[ultimo] !== undefined) {
      gatilho = true;
      const bonus = score < 1.0 ? NUMS_GATILHO[ultimo] : Math.round(NUMS_GATILHO[ultimo] * 0.3 * 100) / 100;
      score += bonus;
      boosts.push('Gatilho ' + ultimo + ' +' + bonus);
    }

    // Janela Dinâmica
    if (!PARES_HOT[parKey] && this.paresDinamicos && this.paresDinamicos[parKey]) {
      const din = this.paresDinamicos[parKey];
      const dinScore = Math.min(din.lift * 0.4, 1.2);
      score += dinScore;
      boosts.push('Dinamico (' + parKey + ') lift ' + din.lift.toFixed(1) + 'x +' + dinScore.toFixed(2));
    }

    // Tripla (V10: desativada — objeto vazio)
    if (endIdx >= 2) {
      const triplaKey = h[endIdx - 2] + ',' + penultimo + ',' + ultimo;
      if (TRIPLAS_HOT[triplaKey]) {
        score += TRIPLAS_HOT[triplaKey];
        boosts.push('Tripla (' + triplaKey + ') +' + TRIPLAS_HOT[triplaKey]);
      }
    }

    // === BOOST V11 — Streak de cor + anti-sinal vermelho ===
    const v11 = boostCondicionalV11(h, endIdx);
    if (v11.antiSinal) {
      // Anti-sinal: 3+ vermelhos seguidos → BLOQUEIA tudo (como se fosse veto)
      return { score: -1, veto: true, par: parKey, gatilho, dupla, boosts: ['ANTI-SINAL: 3+VERM'] };
    }
    if (v11.bonus > 0) {
      score += v11.bonus;
      for (const m of v11.motivos) boosts.push(m);
    }

    return { score: Math.round(score * 100) / 100, veto: false, par: parKey, gatilho, dupla, boosts };
  }

  avaliar() {
    if (!this.ultimaCalibracao) this.calibrar();
    const h = this.historico;
    const T = h.length;
    if (T < 2) return { nivel: 'FRIO', score: 0, confianca: 0, distBranco: 0, par: null, veto: false, gatilho: false, dupla: false, boosts: [] };

    let distBranco = 0;
    for (let i = T - 1; i >= 0; i--) {
      if (h[i] === 0) { distBranco = T - 1 - i; break; }
      distBranco = T - i;
    }

    const result = this.calcScore(T - 1);
    let score = result.score;
    const veto = result.veto, par = result.par, gatilho = result.gatilho, dupla = result.dupla;
    const boosts = result.boosts.slice();

    if (!veto && score > 0) {
      // FEATURE 1: Boost por distância
      const boostDist = calcBoostDistancia(distBranco);
      if (boostDist > 1.0) {
        score = Math.round(score * boostDist * 100) / 100;
        boosts.push('Dist ' + distBranco + ' x' + boostDist);
      }

      // FEATURE 4: Stacking
      let stackCount = 0;
      if (PARES_HOT[par]) stackCount++;
      if (gatilho) stackCount++;
      if (distBranco >= 20) stackCount++;
      if (dupla && !PARES_VETO.has(par)) stackCount++;
      if (stackCount >= 3) {
        score += 0.5;
        boosts.push('Stack x' + stackCount + ' +0.5');
      } else if (stackCount >= 2 && PARES_HOT[par]) {
        score += 0.3;
        boosts.push('Stack x' + stackCount + ' +0.3');
      }

      // FEATURE 5: Anti-streak
      const antiStreak = calcAntiStreak(distBranco);
      if (antiStreak > 0) {
        score += antiStreak;
        boosts.push('Anti-streak +' + antiStreak);
      }

      score = Math.round(score * 100) / 100;
    }

    // FEATURE 6: Dist crítica (DESATIVADO — distância não prediz branco)
    // if (!veto && distBranco >= 35 && score > 0 && score < 1.3) {
    //   score = Math.max(score, 1.3);
    //   boosts.push('Dist critica ' + distBranco + ' -> MEDIO');
    // }

    let nivel, confianca = 0;
    if (veto) { nivel = 'FRIO'; confianca = 0; }
    else if (score >= 2.0) { nivel = 'FORTE'; confianca = Math.min(Math.round(score / 3 * 100), 100); }
    else if (score >= 1.3) { nivel = 'MEDIO'; confianca = Math.min(Math.round(score / 2.5 * 100), 100); }
    else if (score > 0) { nivel = 'FRACO'; confianca = Math.max(Math.round(score / 2 * 100), 10); }
    else { nivel = 'FRIO'; confianca = 0; }

    // === REC V11: Bloquear sinais quando dist >= 18, exceto se streak 4+ preto ===
    // Dados: dist>=18 → P(branco em 5) = 19-22% (SECO)
    //        Streak 4+ dentro do REC → 76.5% de acerto
    const REC_THRESHOLD_DIST = 18;
    let recV11 = false;
    let recSaidaLiberada = false;

    if (distBranco >= REC_THRESHOLD_DIST) {
      recV11 = true;
      // Verificar condição de saída: streak 4+ preto
      let streakPretoAtual = 0;
      for (let i = T - 1; i >= 0; i--) {
        if (h[i] >= 8 && h[i] <= 14) streakPretoAtual++;
        else break;
      }
      if (streakPretoAtual >= 4) {
        recSaidaLiberada = true; // Libera o sinal — a "mola" está carregada DENTRO do REC
      }
    }

    // Se REC ativo e saída NÃO liberada → forçar FRIO (bloquear sinal)
    if (recV11 && !recSaidaLiberada && !veto) {
      nivel = 'FRIO';
      confianca = 0;
      score = 0;
      boosts.length = 0;
      boosts.push('REC ATIVO (dist ' + distBranco + ') — aguardando 4+ pretos');
    }
    // Se REC ativo mas saída liberada → manter sinal e marcar
    if (recV11 && recSaidaLiberada) {
      boosts.push('SAÍDA REC (streak 4+ dentro do seco)');
    }

    return { nivel, score, confianca, distBranco, par, veto, gatilho, dupla, boosts, calibracao: this.ultimaCalibracao, recAtivo: recV11, recSaidaLiberada };
  }

  // Score em qualquer posição (para gráfico de temperatura)
  scoreNaPosicao(endIdx) {
    const { score } = this.calcScore(endIdx);
    return score;
  }

  // Score COMPLETO v8 em qualquer posição (com boosts distância, stacking, anti-streak)
  scoreV8NaPosicao(endIdx) {
    if (endIdx < 1) return 0;
    const h = this.historico;
    const T = endIdx + 1;

    let distBranco = 0;
    for (let i = endIdx; i >= 0; i--) {
      if (h[i] === 0) { distBranco = endIdx - i; break; }
      distBranco = endIdx - i + 1;
    }

    const result = this.calcScore(endIdx);
    let score = result.score;
    if (result.veto) return -1;
    if (score <= 0) return score;

    // Boost distância
    const boostDist = calcBoostDistancia(distBranco);
    if (boostDist > 1.0) score = score * boostDist;

    // Stacking
    let stackCount = 0;
    if (PARES_HOT[result.par]) stackCount++;
    if (result.gatilho) stackCount++;
    if (distBranco >= 20) stackCount++;
    if (result.dupla && !PARES_VETO.has(result.par)) stackCount++;
    if (stackCount >= 3) score += 0.5;
    else if (stackCount >= 2 && PARES_HOT[result.par]) score += 0.3;

    // Anti-streak
    const antiStreak = calcAntiStreak(distBranco);
    if (antiStreak > 0) score += antiStreak;

    // Dist crítica (DESATIVADO)
    // if (distBranco >= 35 && score > 0 && score < 1.3) score = Math.max(score, 1.3);

    return Math.round(score * 100) / 100;
  }

  // Verifica se um par (nos índices dados) é VETO
  isVeto(idx) {
    if (idx < 1) return false;
    const parKey = `${this.historico[idx - 1]},${this.historico[idx]}`;
    return PARES_VETO.has(parKey);
  }
}

// ========== ESTADO GLOBAL ==========
let historicoGlobal = [];
let horariosGlobal = [];      // horário de cada rodada (mesmo índice que historicoGlobal)
let motorGlobal = null;
let rodadasDesdeUltimaCalibracao = 0;
let historicoSinais = [];     // registros de acertos/erros
let scoresGravados = [];      // score do sinal exibido quando cada número chegou
let ultimoSinalExibido = null; // guarda o último sinal mostrado ao usuário
let sinaisPendentes = [];     // sinais aguardando confirmação (janela de 10 rodadas)
const JANELA_ACERTO = 5;      // quantas rodadas para confirmar acerto (reduzido de 10→5, EV positivo só até casa 5)
const MAX_CONFIRMACOES = 2;   // se acumular 2+ confirmações → cancelar sinal (seca detectada)

// === REC DETECTION (Quebra de Ritmo) ===
let recAtivo = false;
let recInicio = null;
let recSegurados = 0;          // segurados consecutivos na sessão atual
let recMaxHistorico = 0;
let ultimosGapsBranco = [];    // últimos gaps entre brancos (para detectar ritmo)
let distDesdeUltimoBranco = 0; // rodadas desde último branco
const REC_THRESHOLD = 3;       // segurados mínimos para ativar
const RITMO_MIN = 5;           // gap mínimo considerado "ritmo bom"
const RITMO_MAX = 18;          // gap máximo considerado "ritmo bom"

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
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'stack': 'redux', 'referer': 'https://www.tipminer.com' },
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

function parseTextData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const resultados = [];
  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})$/;
  const shortTimeRegex = /^\d{2}:\d{2}$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(dateRegex);
    if (match) {
      let numero = 0;
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (/^\d{1,2}$/.test(next) && !shortTimeRegex.test(next)) {
          const n = parseInt(next);
          if (n >= 1 && n <= 14) numero = n;
        }
      }
      resultados.push({ numero, horario: match[2] });
    }
  }
  return resultados;
}

// ========== API ENDPOINTS ==========

// POST /api/fetch-tipminer — busca dados via API do TipMiner (decriptado)
app.post('/api/fetch-tipminer', async (req, res) => {
  try {
    const { limit } = req.body;
    const lim = Math.min(Math.max(parseInt(limit) || 500, 20), 2000);

    const rounds = await fetchTipMinerAPI(lim);

    if (rounds.length > 0) {
      // rounds vêm do mais recente ao mais antigo; result: 0-14 (0=branco)
      const nums = rounds.map(r => { const n = parseInt(r.result); return isNaN(n) ? 0 : n; }).reverse(); // cronológico, garante número
      const horas = rounds.map(r => {
        // Campos do TipMiner: time ("20:44") e date ("2026-05-18T20:44:18.000-0300")
        const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
        if (ts) {
          if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
          const d = new Date(ts);
          if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
        }
        return '--:--';
      }).reverse();

      // Detectar novos números (se já tinha dados)
      const anterioresLen = historicoGlobal.length;
      if (anterioresLen > 0) {
        // Encontrar onde terminam os dados antigos dentro dos novos
        // Pega os últimos K números do histórico antigo e procura essa sequência em nums
        const matchLen = Math.min(10, anterioresLen);
        const oldSuffix = historicoGlobal.slice(-matchLen);
        const oldSuffixStr = JSON.stringify(oldSuffix);

        let novosInicio = -1;
        // Procurar de trás pra frente (mais eficiente — o overlap geralmente está perto do final)
        for (let i = nums.length - matchLen; i >= 0; i--) {
          const segment = nums.slice(i, i + matchLen);
          if (JSON.stringify(segment) === oldSuffixStr) {
            novosInicio = i + matchLen;
            break;
          }
        }

        // Se encontrou novos números, registrar no histórico de sinais
        if (novosInicio > 0 && novosInicio < nums.length) {
          // Criar motor temporário para calcular scores corretos em cada posição
          const tempMotorNovos = new MotorAdaptativo(nums, { janela: 200 });
          tempMotorNovos.calibrar();
          for (let i = novosInicio; i < nums.length; i++) {
            const novoNum = nums[i];
            // Score que estava ativo ANTES deste número (o sinal "Próxima Rodada" no momento)
            const scoreNaPosAnterior = i > 0 ? tempMotorNovos.scoreV8NaPosicao(i - 1) : 0;

            // Para o PRIMEIRO número novo, usar ultimoSinalExibido APENAS se tinha score > 0
            // Se era FRIO/VETO, recalcular o score real da posição
            let sinalParaRegistrar;
            if (i === novosInicio && ultimoSinalExibido && ultimoSinalExibido.score > 0) {
              sinalParaRegistrar = ultimoSinalExibido;
            } else {
              // Calcular o sinal que ESTARIA exibido na posição i-1
              let nivelCalc;
              if (scoreNaPosAnterior >= 2.0) nivelCalc = 'FORTE';
              else if (scoreNaPosAnterior >= 1.3) nivelCalc = 'MEDIO';
              else if (scoreNaPosAnterior > 0) nivelCalc = 'FRACO';
              else nivelCalc = 'FRIO';

              // Distância do branco na posição i-1
              let distCalc = 0;
              for (let j = i - 1; j >= 0; j--) {
                if (nums[j] === 0) { distCalc = (i - 1) - j; break; }
                distCalc = (i - 1) - j + 1;
              }

              sinalParaRegistrar = {
                nivel: nivelCalc,
                score: scoreNaPosAnterior,
                distBranco: distCalc,
                hora: horas[i - 1] || '--:--'
              };
            }

            registrarSinal(novoNum, sinalParaRegistrar);
            scoresGravados.push(scoreNaPosAnterior);
          }
        }
      }

      historicoGlobal = nums;
      horariosGlobal = horas;
      motorGlobal = null;
      rodadasDesdeUltimaCalibracao = 999;

      // Se é primeira carga, pré-calcular scores
      if (anterioresLen === 0) {
        const tempMotor = new MotorAdaptativo(historicoGlobal, { janela: 200 });
        tempMotor.calibrar();
        scoresGravados = new Array(nums.length).fill(0);
        for (let i = 0; i < nums.length; i++) {
          scoresGravados[i] = i > 0 ? tempMotor.scoreV8NaPosicao(i - 1) : 0;
        }
        // Histórico começa VAZIO — acumula apenas em tempo real
        historicoSinais = [];
        sinaisPendentes = [];
      } else {
        // Ajustar tamanho dos scoresGravados para coincidir com historicoGlobal
        while (scoresGravados.length < historicoGlobal.length) {
          scoresGravados.unshift(0); // preencher início com 0
        }
        scoresGravados = scoresGravados.slice(-historicoGlobal.length);
      }

      return res.json({ sucesso: true, rodadas: nums.length, mensagem: `${nums.length} rodadas carregadas do TipMiner` });
    }

    res.json({ sucesso: false, rodadas: 0, mensagem: 'Nenhum dado retornado pela API.' });
  } catch (err) {
    res.status(500).json({ erro: `Erro ao acessar TipMiner: ${err.message}` });
  }
});

// Função para registrar sinal com JANELA DE ACERTO (10 rodadas)
function registrarSinal(novoNum, sinalAnterior) {
  // Atualizar distância desde último branco (para REC/ritmo)
  if (novoNum === 0) {
    // O reset do dist acontece dentro de processarPendentes no bloco branco
  } else {
    distDesdeUltimoBranco++;
  }

  // Sempre processar pendentes existentes com o novo número
  processarPendentes(novoNum);

  if (!sinalAnterior) return;

  // Registra FORTE, MEDIO e FRACO (score > 0)
  if (sinalAnterior.nivel !== 'FORTE' && sinalAnterior.nivel !== 'MEDIO' && sinalAnterior.nivel !== 'FRACO') return;
  if (sinalAnterior.score <= 0) return;

  // === SINAL ÚNICO: só 1 sinal ativo por vez ===
  if (sinaisPendentes.length > 0) {
    // Já tem sinal ativo → contar como confirmação
    const ativo = sinaisPendentes[0];
    ativo.confirmacoes = (ativo.confirmacoes || 0) + 1;
    ativo.scoreMax = Math.max(ativo.scoreMax || ativo.score, sinalAnterior.score);

    // Se confirmações >= MAX → sinal está em SECA, cancelar
    if (ativo.confirmacoes >= MAX_CONFIRMACOES) {
      const horaCancel = horariosGlobal.length > 0
        ? horariosGlobal[horariosGlobal.length - 1]
        : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      const rodadasJogadas = JANELA_ACERTO - ativo.rodadasRestantes;
      historicoSinais.push({
        hora: horaCancel,
        nivel: ativo.nivel,
        score: ativo.score,
        ultimoNum: ativo.numeros.length > 0 ? ativo.numeros[ativo.numeros.length - 1] : -1,
        resultado: 'CANCELADO',
        acertou: false,
        segurado: false,
        cancelado: true,
        confirmacoes: ativo.confirmacoes,
        rodadasJogadas,
        distBranco: ativo.distBranco
      });
      if (historicoSinais.length > 100) historicoSinais.shift();
      sinaisPendentes = [];
    }
    return; // Não cria novo sinal
  }

  // Sem sinal ativo → criar novo
  sinaisPendentes.push({
    hora: sinalAnterior.hora || new Date().toLocaleTimeString('pt-BR'),
    nivel: sinalAnterior.nivel,
    score: sinalAnterior.score,
    distBranco: sinalAnterior.distBranco || 0,
    rodadasRestantes: JANELA_ACERTO,
    acertou: false,
    segurado: false,
    confirmacoes: 0,
    scoreMax: sinalAnterior.score,
    numeros: []
  });
}

function processarPendentes(novoNum) {
  if (sinaisPendentes.length === 0) return;

  // Verificar se é branco ou segurado
  const ehBranco = novoNum === 0;
  const ehSegurado = novoNum === 11 || novoNum === 12;

  // Verificar repetição (último número do pendente mais antigo)
  let ehRepeticao = false;
  if (!ehBranco && !ehSegurado && sinaisPendentes.length > 0) {
    const primeiro = sinaisPendentes[0];
    if (primeiro.numeros.length >= 1 && primeiro.numeros[primeiro.numeros.length - 1] === novoNum) {
      ehRepeticao = true;
    }
  }

  // Atualizar todos os pendentes com o novo número
  for (const sinal of sinaisPendentes) {
    sinal.numeros.push(novoNum);
    sinal.rodadasRestantes--;
  }

  // Se branco saiu → TODOS os pendentes fecham como ACERTOU
  if (ehBranco) {
    // REC RESET — branco encerra o REC e registra o gap
    const gapAtual = distDesdeUltimoBranco;
    ultimosGapsBranco.push(gapAtual);
    if (ultimosGapsBranco.length > 5) ultimosGapsBranco.shift(); // manter últimos 5
    distDesdeUltimoBranco = 0;
    recAtivo = false;
    recSegurados = 0;
    recInicio = null;

    const horaResultado = horariosGlobal.length > 0
      ? horariosGlobal[horariosGlobal.length - 1]
      : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    for (const sinal of sinaisPendentes) {
      // casaPagou = em qual rodada o branco veio (ex: janela 10, restavam 7, pagou na 3ª)
      const casaPagou = JANELA_ACERTO - sinal.rodadasRestantes;
      historicoSinais.push({
        hora: horaResultado,
        nivel: sinal.nivel,
        score: sinal.score,
        ultimoNum: 0,
        resultado: 'ACERTOU',
        acertou: true,
        segurado: false,
        casaPagou,
        distBranco: sinal.distBranco
      });
      if (historicoSinais.length > 100) historicoSinais.shift();
    }
    sinaisPendentes = [];
    return;
  }

  // Se segurado (11, 12, ou repetido) → só fecha como SEGURADO se REC ativo
  if (ehSegurado || ehRepeticao) {
    // REC DETECTION — acumula segurados + detecta quebra de ritmo
    recSegurados++;
    if (recSegurados > recMaxHistorico) recMaxHistorico = recSegurados;

    // Ativar REC se: segurados >= threshold E ritmo estava bom
    if (!recAtivo && recSegurados >= REC_THRESHOLD) {
      const ultimoGap = ultimosGapsBranco.length > 0 ? ultimosGapsBranco[ultimosGapsBranco.length - 1] : 0;
      const ritmoEstavaBom = ultimoGap >= RITMO_MIN && ultimoGap <= RITMO_MAX;
      const jaPassouRitmo = ultimoGap > 0 && distDesdeUltimoBranco > ultimoGap * 1.5;

      if (ritmoEstavaBom || jaPassouRitmo) {
        recAtivo = true;
        recInicio = horariosGlobal.length > 0
          ? horariosGlobal[horariosGlobal.length - 1]
          : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      }
    }

    // Só fecha como SEGURADO/REC se REC estiver ativo (ritmo quebrado confirmado)
    if (recAtivo) {
      const horaResultado = horariosGlobal.length > 0
        ? horariosGlobal[horariosGlobal.length - 1]
        : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      for (const sinal of sinaisPendentes) {
        historicoSinais.push({
          hora: horaResultado,
          nivel: sinal.nivel,
          score: sinal.score,
          ultimoNum: novoNum,
          resultado: 'REC',
          acertou: false,
          segurado: true,
          rec: true,
          distBranco: sinal.distBranco
        });
        if (historicoSinais.length > 100) historicoSinais.shift();
      }
      sinaisPendentes = [];
      return;
    }
    // Se REC NÃO ativo → sinal continua aberto (não fecha como segurado)
    return;
  }

  // Caso contrário: apenas finalizar os que esgotaram janela (ERROU ou REC se ritmo quebrado)
  const expirados = sinaisPendentes.filter(s => s.rodadasRestantes <= 0);
  if (expirados.length > 0) {
    const horaResultado = horariosGlobal.length > 0
      ? horariosGlobal[horariosGlobal.length - 1]
      : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    for (const sinal of expirados) {
      const ultimoNum = sinal.numeros[sinal.numeros.length - 1];
      // Se REC ativo → conta como REC (ritmo quebrado impediu branco)
      if (recAtivo) {
        historicoSinais.push({
          hora: horaResultado,
          nivel: sinal.nivel,
          score: sinal.score,
          ultimoNum,
          resultado: 'REC',
          acertou: false,
          segurado: true,
          rec: true,
          distBranco: sinal.distBranco
        });
      } else {
        historicoSinais.push({
          hora: horaResultado,
          nivel: sinal.nivel,
          score: sinal.score,
          ultimoNum,
          resultado: 'ERROU',
          acertou: false,
          segurado: false,
          distBranco: sinal.distBranco
        });
      }
      if (historicoSinais.length > 100) historicoSinais.shift();
    }
    sinaisPendentes = sinaisPendentes.filter(s => s.rodadasRestantes > 0);
  }
}

// POST /api/dados — recebe dados colados manualmente
app.post('/api/dados', (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || typeof texto !== 'string') return res.status(400).json({ erro: 'Envie o texto colado do TipMiner' });

    const parsed = parseTextData(texto);
    if (parsed.length === 0) return res.status(400).json({ erro: 'Nenhum dado reconhecido. Cole direto do TipMiner.' });

    historicoGlobal = parsed.map(p => p.numero).reverse(); // cronológico
    horariosGlobal = parsed.map(p => p.horario ? p.horario.slice(0, 5) : '--:--').reverse();
    motorGlobal = null;
    rodadasDesdeUltimaCalibracao = 999;
    historicoSinais = [];

    // Pré-calcular scores com Motor v8 completo
    const tempMotor = new MotorAdaptativo(historicoGlobal, { janela: 200 });
    tempMotor.calibrar();
    scoresGravados = new Array(historicoGlobal.length).fill(0);
    for (let i = 0; i < historicoGlobal.length; i++) {
      scoresGravados[i] = i > 0 ? tempMotor.scoreV8NaPosicao(i - 1) : 0;
    }

    // Gerar histórico de sinais retroativo
    const T2 = historicoGlobal.length;
    for (let i = Math.max(1, T2 - 60); i < T2 - JANELA_ACERTO; i++) {
      const scoreAntes = tempMotor.scoreV8NaPosicao(i - 1);
      let nivelAntes;
      if (scoreAntes >= 2.0) nivelAntes = 'FORTE';
      else if (scoreAntes >= 1.3) nivelAntes = 'MEDIO';
      else if (scoreAntes > 0) nivelAntes = 'FRACO';
      else continue;

      let acertou = false;
      let segurado = false;
      for (let j = 1; j <= JANELA_ACERTO && (i + j) < T2; j++) {
        if (historicoGlobal[i + j] === 0) { acertou = true; break; }
        if (!segurado) {
          if (historicoGlobal[i + j] === 11 || historicoGlobal[i + j] === 12) segurado = true;
          else if (j >= 2 && historicoGlobal[i + j] === historicoGlobal[i + j - 1]) segurado = true;
        }
      }

      const ultimoIdx = Math.min(i + JANELA_ACERTO, T2 - 1);
      const ultimoNum = acertou ? 0 : historicoGlobal[ultimoIdx];
      // Hora do resultado: posição onde o desfecho aconteceu
      let idxResultado2 = ultimoIdx;
      if (acertou) {
        for (let j = 1; j <= JANELA_ACERTO && (i + j) < T2; j++) {
          if (historicoGlobal[i + j] === 0) { idxResultado2 = i + j; break; }
        }
      }
      historicoSinais.push({
        hora: horariosGlobal[idxResultado2] || horariosGlobal[i] || '--:--',
        nivel: nivelAntes,
        score: scoreAntes,
        ultimoNum,
        resultado: acertou ? 'ACERTOU' : segurado ? 'SEGURADO' : 'ERROU',
        acertou,
        segurado: segurado && !acertou,
        distBranco: (() => { let d = 0; for (let j = i - 1; j >= 0; j--) { if (historicoGlobal[j] === 0) { d = i - 1 - j; break; } d = i - j; } return d; })()
      });
    }
    if (historicoSinais.length > 100) historicoSinais = historicoSinais.slice(-100);

    res.json({ sucesso: true, rodadas: historicoGlobal.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/novo-numero — adiciona rodada nova
app.post('/api/novo-numero', (req, res) => {
  try {
    const { numero } = req.body;
    const n = parseInt(numero);
    if (isNaN(n) || n < 0 || n > 14) return res.status(400).json({ erro: 'Número deve ser 0-14' });

    // Registrar sinal e score ANTES de adicionar o número
    registrarSinal(n, ultimoSinalExibido);
    scoresGravados.push(ultimoSinalExibido ? ultimoSinalExibido.score : 0);

    historicoGlobal.push(n);
    // Usar o mesmo horário do sinal (momento que o número veio no jogo)
    const horaNum = (ultimoSinalExibido && ultimoSinalExibido.hora) ? ultimoSinalExibido.hora.slice(0, 5) : new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    horariosGlobal.push(horaNum);
    rodadasDesdeUltimaCalibracao++;
    res.json({ sucesso: true, totalRodadas: historicoGlobal.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/avaliar — retorna sinal atual do motor
app.get('/api/avaliar', (req, res) => {
  try {
    if (historicoGlobal.length < 50) {
      return res.json({
        erro: 'Dados insuficientes. Carregue pelo menos 300 rodadas.',
        rodadas: historicoGlobal.length
      });
    }

    // Calibrar se necessário (a cada 30 rodadas novas)
    if (!motorGlobal || rodadasDesdeUltimaCalibracao >= 30) {
      motorGlobal = new MotorAdaptativo(historicoGlobal, {
        janela: 200
      });
      motorGlobal.calibrar();
      rodadasDesdeUltimaCalibracao = 0;
    } else {
      motorGlobal.historico = historicoGlobal;
    }

    const sinal = motorGlobal.avaliar();

    const T = historicoGlobal.length;
    const distBranco = sinal.distBranco;

    const ultimos20 = historicoGlobal.slice(-20);
    const brancos20 = ultimos20.filter(n => n === 0).length;

    // === FEATURE 7: CONFIANÇA REAL ===
    let eficacia = 0;
    if (sinal.veto) {
      eficacia = 0;
    } else if (historicoSinais.length >= 5) {
      const mesmoNivel = historicoSinais.filter(s => s.nivel === sinal.nivel);
      if (mesmoNivel.length >= 3) {
        eficacia = Math.round(mesmoNivel.filter(s => s.acertou).length / mesmoNivel.length * 100);
      } else {
        eficacia = Math.round(historicoSinais.filter(s => s.acertou).length / historicoSinais.length * 100);
      }
    } else {
      if (sinal.nivel === 'FORTE') eficacia = 20;
      else if (sinal.nivel === 'MEDIO') eficacia = 12;
      else if (sinal.nivel === 'FRACO') eficacia = 8;
    }

    // Guardar sinal atual para quando próximo número chegar
    ultimoSinalExibido = {
      nivel: sinal.nivel,
      score: sinal.score,
      distBranco,
      par: sinal.par,
      veto: sinal.veto,
      hora: horariosGlobal[T - 1] || new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
    };

    const boostsAtivos = sinal.boosts || [];
    const cal = sinal.calibracao;
    const penultimo = T >= 2 ? historicoGlobal[T - 2] : null;
    const ultimo = historicoGlobal[T - 1];

    res.json({
      nivel: sinal.nivel,
      score: sinal.score,
      confianca: sinal.confianca,
      par: sinal.par,
      veto: sinal.veto,
      gatilho: sinal.gatilho,
      dupla: sinal.dupla,
      eficacia,
      boosts: boostsAtivos,
      info: {
        totalRodadas: T,
        distBranco,
        ultimoNumero: ultimo,
        penultimoNumero: penultimo,
        ultimos30: (() => {
          const startIdx = Math.max(0, T - 30);
          const arr = [];
          for (let i = startIdx; i < T; i++) {
            const num = historicoGlobal[i];
            // Usar o score gravado (que é o score v8 completo do momento)
            const scorePos = (scoresGravados[i] !== undefined) ? scoresGravados[i] : 0;
            const hora = horariosGlobal[i] || '--:--';
            const entry = { num, score: Math.round(scorePos * 100) / 100, hora };
            if (num === 0) {
              entry.tipo = 'branco';
            } else if (i > 0 && PARES_VETO.has(`${historicoGlobal[i - 1]},${num}`)) {
              entry.tipo = 'disfarcado';
            } else if (i > 0 && num === historicoGlobal[i - 1]) {
              entry.tipo = 'segurado';
              // Marcar o primeiro da dupla também como segurado
              if (arr.length > 0 && arr[arr.length - 1].num === num && arr[arr.length - 1].tipo === 'normal') {
                arr[arr.length - 1].tipo = 'segurado';
              }
            } else {
              entry.tipo = 'normal';
            }
            arr.push(entry);
          }
          return arr;
        })(),
        brancos20,
        baseRate: cal ? (cal.baseRate * 100).toFixed(2) + '%' : '-',
        ultimaCalibracao: cal ? new Date(cal.timestamp).toLocaleTimeString('pt-BR') : '-'
      },
      historicoSinais: historicoSinais.slice(-30).reverse(),
      sinaisPendentes: sinaisPendentes.map(s => ({
        hora: s.hora,
        nivel: s.nivel,
        score: s.score,
        distBranco: s.distBranco,
        rodadasRestantes: s.rodadasRestantes,
        confirmacoes: s.confirmacoes || 0,
        numeros: s.numeros.slice(-5)
      })),
      contadorAcertos: (() => {
        const total = historicoSinais.length;
        const acertos = historicoSinais.filter(s => s.acertou).length;
        const recs = historicoSinais.filter(s => s.rec).length;
        const cancelados = historicoSinais.filter(s => s.cancelado).length;
        const erros = total - acertos - recs - cancelados;
        const fortes = historicoSinais.filter(s => s.nivel === 'FORTE');
        const acertosForte = fortes.filter(s => s.acertou).length;
        const medios = historicoSinais.filter(s => s.nivel === 'MEDIO');
        const acertosMedio = medios.filter(s => s.acertou).length;
        return { total, acertos, erros, recs, cancelados, fortes: fortes.length, acertosForte, medios: medios.length, acertosMedio };
      })(),
      rec: {
        ativo: sinal.recAtivo || recAtivo,
        saidaLiberada: sinal.recSaidaLiberada || false,
        segurados: recSegurados,
        inicio: recInicio,
        recorde: recMaxHistorico,
        ehRecorde: recAtivo && recSegurados >= recMaxHistorico && recSegurados > REC_THRESHOLD,
        distAtual: sinal.distBranco || distDesdeUltimoBranco,
        ultimoGap: ultimosGapsBranco.length > 0 ? ultimosGapsBranco[ultimosGapsBranco.length - 1] : null,
        ritmoQuebrado: sinal.recAtivo || recAtivo,
        threshold: 18
      }
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/limpar-historico — limpa histórico resolvido, mantém pendentes (admin only)
app.post('/api/limpar-historico', (req, res) => {
  const { usuario } = req.body || {};
  if (usuario !== 'Majo@lphax') {
    return res.status(403).json({ erro: 'Sem permissão' });
  }
  const removidos = historicoSinais.length;
  historicoSinais = [];
  recAtivo = false;
  recSegurados = 0;
  recInicio = null;
  res.json({ sucesso: true, mensagem: `${removidos} sinal(is) resolvido(s) apagado(s)` });
});

// GET /api/status
app.get('/api/status', (req, res) => {
  res.json({
    rodadas: historicoGlobal.length,
    motorAtivo: !!motorGlobal,
    ultimoNumero: historicoGlobal.length > 0 ? historicoGlobal[historicoGlobal.length - 1] : null
  });
});

// GET /api/historico?pagina=1 — retorna blocos de 100 rodadas (mais recentes primeiro)
app.get('/api/historico', (req, res) => {
  const total = historicoGlobal.length;
  if (total === 0) return res.json({ rodadas: [], total: 0, pagina: 1, totalPaginas: 0 });

  const porPagina = 100;
  const maxRodadas = Math.min(total, 1000);
  const totalPaginas = Math.ceil(maxRodadas / porPagina);
  const pagina = Math.max(1, Math.min(parseInt(req.query.pagina) || 1, totalPaginas));

  // Calibrar motor se necessário
  if (!motorGlobal && total >= 50) {
    motorGlobal = new MotorAdaptativo(historicoGlobal, { janela: 200 });
    motorGlobal.calibrar();
  }

  // Índices globais diretos em historicoGlobal (sem arrays intermediários)
  // Pag 1 = mais recentes: [total-1, total-2, ..., total-100]
  // Pag 2 = [total-101, ..., total-200] etc.
  const maisRecenteGlobal = total - 1 - (pagina - 1) * porPagina;
  const maisAntigoGlobal = Math.max(total - maxRodadas, maisRecenteGlobal - porPagina + 1);

  const rodadas = [];
  let posCounter = (pagina - 1) * porPagina + 1;

  for (let gi = maisRecenteGlobal; gi >= maisAntigoGlobal; gi--) {
    const num = historicoGlobal[gi];
    // Score GRAVADO (o que foi exibido ao usuário naquele momento)
    const scorePos = (scoresGravados[gi] !== undefined) ? scoresGravados[gi] : 0;

    let tipo = 'normal';
    if (num === 0) {
      tipo = 'branco';
    } else if (gi > 0 && PARES_VETO.has(`${historicoGlobal[gi - 1]},${num}`)) {
      tipo = 'disfarcado';
    } else if (gi > 0 && num === historicoGlobal[gi - 1]) {
      tipo = 'segurado';
      // Marcar o primeiro da dupla também (último adicionado ao array se for o mesmo num)
      if (rodadas.length > 0 && rodadas[rodadas.length - 1].num === num && rodadas[rodadas.length - 1].tipo === 'normal') {
        rodadas[rodadas.length - 1].tipo = 'segurado';
      }
    }

    rodadas.push({
      pos: posCounter++,
      num,
      cor: num === 0 ? 'branco' : num <= 7 ? 'vermelho' : 'preto',
      tipo,
      score: scorePos
    });
  }

  res.json({ rodadas, total: maxRodadas, pagina, totalPaginas });
});

// GET /api/temperatura — retorna dados de temperatura (score history) para gráfico
app.get('/api/temperatura', (req, res) => {
  const total = historicoGlobal.length;
  if (total < 50 || !motorGlobal) {
    return res.json({ erro: 'Dados insuficientes', pontos: [] });
  }

  const qtd = Math.min(parseInt(req.query.qtd) || 50, 100);
  const startIdx = Math.max(0, total - qtd);
  const pontos = [];

  for (let i = startIdx; i < total; i++) {
    const score = i > 0 ? motorGlobal.scoreV8NaPosicao(i - 1) : 0;
    const isVeto = i > 0 ? motorGlobal.isVeto(i - 1) : false;
    pontos.push({
      idx: i - startIdx,
      num: historicoGlobal[i],
      score,
      branco: historicoGlobal[i] === 0,
      veto: isVeto
    });
  }

  // Calcular médias móveis (janela 5 e 10)
  const scores = pontos.map(p => p.score);
  const media5 = scores.map((_, i, arr) => {
    const start = Math.max(0, i - 4);
    const slice = arr.slice(start, i + 1);
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length * 100) / 100;
  });
  const media10 = scores.map((_, i, arr) => {
    const start = Math.max(0, i - 9);
    const slice = arr.slice(start, i + 1);
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length * 100) / 100;
  });

  // Tendência (regressão linear últimos 10)
  const ultimos10 = scores.slice(-10);
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = ultimos10.length;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += ultimos10[i]; sumXY += i * ultimos10[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const tendencia = slope > 0.1 ? 'AQUECENDO' : slope < -0.1 ? 'ESFRIANDO' : 'ESTÁVEL';

  // Estatísticas
  const mediaGeral = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreAtual = scores[scores.length - 1];

  res.json({
    pontos,
    media5,
    media10,
    tendencia,
    slope: Math.round(slope * 100) / 100,
    stats: { media: mediaGeral, maxima: maxScore, minima: minScore, atual: scoreAtual },
    total: pontos.length
  });
});

// ========== CHAT (Socket.IO) ==========
const chatMessages = []; // Últimas 50 mensagens em memória
const MAX_MSGS = 50;
let onlineUsers = new Map(); // socketId -> apelido

io.on('connection', (socket) => {
  // Enviar histórico ao conectar
  socket.emit('chat:historico', chatMessages);
  socket.emit('chat:online', onlineUsers.size);
  socket.emit('chat:usuarios', Array.from(onlineUsers.values()));

  // Usuário define apelido
  socket.on('chat:entrar', (apelido) => {
    const nome = String(apelido || 'Visitante').trim().slice(0, 20);
    onlineUsers.set(socket.id, nome);
    io.emit('chat:online', onlineUsers.size);
    io.emit('chat:usuarios', Array.from(onlineUsers.values()));
    io.emit('chat:sistema', `${nome} entrou`);
  });

  // Solicitar lista de usuários online
  socket.on('chat:listarUsuarios', () => {
    socket.emit('chat:usuarios', Array.from(onlineUsers.values()));
  });

  // Mensagem enviada
  socket.on('chat:msg', (texto) => {
    const nome = onlineUsers.get(socket.id) || 'Visitante';
    const msg = {
      user: nome,
      texto: String(texto || '').trim().slice(0, 300),
      hora: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
    };
    if (!msg.texto) return;
    chatMessages.push(msg);
    if (chatMessages.length > MAX_MSGS) chatMessages.shift();
    io.emit('chat:msg', msg);
  });

  // Desconexão
  socket.on('disconnect', () => {
    const nome = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    io.emit('chat:online', onlineUsers.size);
    io.emit('chat:usuarios', Array.from(onlineUsers.values()));
    if (nome) io.emit('chat:sistema', `${nome} saiu`);
  });
});

// ========== PADRÃO X — Previsão Temporal do Branco ==========
const PADRAOX_BLOQUEADORES = [2, 3, 11, 4, 12, 9];
const PADRAOX_FAVORAVEIS = [14, 8, 1];
const PADRAOX_BLOQ_EXATOS = [3, 6, 9, 13];
const PADRAOX_FAV_EXATOS = [14, 2, 8];
const PADRAOX_ALERTAS = ['PVP', 'VVV', 'VVP', 'PPP'];
const PADRAOX_BOM = ['VBP', 'PBV'];

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
    return res.json({ erro: 'Poucos brancos encontrados nos dados.' });
  }

  // Último branco
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';

  // N1 = 2º antes, N2 = 3º antes (pula o vizinho imediato)
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;

  if (pos2 < 0) {
    return res.json({ erro: 'Branco muito no início dos dados, sem vizinhos suficientes.' });
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

  // Verificar sinais nas rodadas entre o branco e agora
  const rodadasApos = nums.slice(ultimoBrancoIdx + 1);
  const bloqueadoresVistos = [];
  const favoraveisVistos = [];

  for (const n of rodadasApos) {
    if (PADRAOX_BLOQUEADORES.includes(n) && !bloqueadoresVistos.includes(n)) bloqueadoresVistos.push(n);
    if (PADRAOX_FAVORAVEIS.includes(n) && !favoraveisVistos.includes(n)) favoraveisVistos.push(n);
  }

  // Padrão de cor das últimas 3 rodadas
  const ultimas3 = nums.slice(-3).map(corLetra).join('');
  const padraoAlerta = PADRAOX_ALERTAS.includes(ultimas3);
  const padraoBom = PADRAOX_BOM.includes(ultimas3);

  // Número na posição exata da previsão
  const posPrevisao = ultimoBrancoIdx + previsaoRodadas;
  let numNaPosPrevisao = null;
  let bloqueadorExato = false;
  let favoravelExato = false;
  if (posPrevisao < nums.length) {
    numNaPosPrevisao = nums[posPrevisao];
    bloqueadorExato = PADRAOX_BLOQ_EXATOS.includes(numNaPosPrevisao);
    favoravelExato = PADRAOX_FAV_EXATOS.includes(numNaPosPrevisao);
  }

  // Calcular confiança
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

  // Histórico de acertos recentes (últimos 5 ciclos)
  const historico = [];
  for (let i = Math.max(0, idxBrancos.length - 6); i < idxBrancos.length - 1; i++) {
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

  // Dica contextual
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
    dica
  });
});

server.listen(PORT, () => {
  console.log(`Motor Adaptativo v8 rodando em http://localhost:${PORT}`);
});
