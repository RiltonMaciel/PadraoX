/**
 * CURADORIA OTIMIZADA — Aplicando recomendações 2, 3 e 4
 * 
 * OTIMIZAÇÕES APLICADAS:
 * [2] MAX_CONFIRMACOES: 2 → 4 (reduz cancelamentos)
 * [3] Stop loss: para se perder 40% da banca, volta após 50 rodadas
 * [4] Janela de acerto: 10 → 6 (74% dos acertos são nas primeiras 5 casas)
 * 
 * Mantém FRACO ativo (conforme pedido do usuário)
 */

const fs = require('fs');
const path = require('path');

// ========== CONSTANTES DO MOTOR V9 ==========
const PARES_HOT = {
  '12,13': 2.5, '3,13': 2.3, '7,7': 2.2, '8,10': 2.0, '0,8': 2.0,
  '0,13': 1.7, '3,10': 1.7, '3,1': 1.5, '9,0': 1.5, '6,13': 1.5,
  '7,8': 1.3, '2,8': 1.3, '6,6': 1.5, '9,9': 1.3,
};

const PARES_VETO = new Set([
  '13,6', '13,10', '10,9', '1,11', '4,8',
  '7,14', '14,3', '9,11', '8,6', '4,3', '11,13',
  '4,4', '5,5', '2,2',
]);

const NUMS_GATILHO = { 13: 0.5, 10: 0.6, 8: 0.4, 7: 0.4 };

const TRIPLAS_HOT = {
  '7,12,13': 0.5, '3,12,13': 0.5,
  '8,8,10': 0.4, '0,3,13': 0.4,
  '7,7,8': 0.3, '6,7,7': 0.3,
  '9,0,8': 0.3, '3,3,10': 0.3,
};

// ===== OTIMIZAÇÕES =====
const JANELA_ACERTO = 10;       // [4] MANTÉM 10 (reduzir piorou)
const MAX_CONFIRMACOES = 4;     // [2] era 2, agora 4
const STOP_LOSS_PCT = 0.40;     // [3] para se perder 40% da banca atual
const STOP_LOSS_COOLDOWN = 50;  // [3] fica fora por 50 rodadas

// BOT
const BOT_CONFIG = {
  bancaInicial: 200,
  aposta: { FORTE: 15, MEDIO: 5, FRACO: 2.5 },
  payout: 14
};

// ========== MOTOR ==========
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

function calcScore(historico, endIdx, paresDinamicos) {
  if (endIdx < 1) return { score: 0, veto: false, par: null, gatilho: false, dupla: false, nivel: 'FRIO' };

  const penultimo = historico[endIdx - 1];
  const ultimo = historico[endIdx];
  const parKey = `${penultimo},${ultimo}`;

  if (PARES_VETO.has(parKey)) {
    return { score: -1, veto: true, par: parKey, gatilho: false, dupla: ultimo === penultimo, nivel: 'FRIO' };
  }

  let score = 0;
  const gatilho = NUMS_GATILHO[ultimo] !== undefined;
  const dupla = ultimo === penultimo;

  if (PARES_HOT[parKey]) score = PARES_HOT[parKey];

  if (gatilho) {
    const bonus = score < 1.0 ? NUMS_GATILHO[ultimo] : Math.round(NUMS_GATILHO[ultimo] * 0.3 * 100) / 100;
    score += bonus;
  }

  if (!PARES_HOT[parKey] && paresDinamicos && paresDinamicos[parKey]) {
    const din = paresDinamicos[parKey];
    const dinScore = Math.min(din.lift * 0.4, 1.2);
    score += dinScore;
  }

  if (endIdx >= 2) {
    const triplaKey = historico[endIdx - 2] + ',' + penultimo + ',' + ultimo;
    if (TRIPLAS_HOT[triplaKey]) score += TRIPLAS_HOT[triplaKey];
  }

  // Stacking
  let distBranco = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] === 0) { distBranco = endIdx - i; break; }
    distBranco = endIdx - i + 1;
  }
  let stackCount = 0;
  if (PARES_HOT[parKey]) stackCount++;
  if (gatilho) stackCount++;
  if (distBranco >= 20) stackCount++;
  if (dupla && !PARES_VETO.has(parKey)) stackCount++;
  if (stackCount >= 3) score += 0.5;
  else if (stackCount >= 2 && PARES_HOT[parKey]) score += 0.3;

  score = Math.round(score * 100) / 100;

  let nivel;
  if (score >= 2.0) nivel = 'FORTE';
  else if (score >= 1.3) nivel = 'MEDIO';
  else if (score > 0) nivel = 'FRACO';
  else nivel = 'FRIO';

  return { score, veto: false, par: parKey, gatilho, dupla, nivel, distBranco };
}

// ========== CARREGAR CSV ==========
const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf8');
const linhas = csvRaw.split('\n').map(l => l.trim()).filter(l => l);

const dados = [];
for (let i = 2; i < linhas.length; i++) {
  const cols = linhas[i].split(',');
  if (cols.length >= 4) {
    const num = parseInt(cols[0]);
    if (!isNaN(num) && num >= 0 && num <= 14) {
      dados.push({ numero: num, hora: cols[3] ? cols[3].slice(0, 5) : '--:--' });
    }
  }
}

dados.reverse();
const historico = dados.map(d => d.numero);
const horarios = dados.map(d => d.hora);

console.log(`\n${'═'.repeat(70)}`);
console.log(`  CURADORIA OTIMIZADA — ${historico.length} rodadas reais`);
console.log(`${'═'.repeat(70)}`);
console.log(`  OTIMIZAÇÕES APLICADAS:`);
console.log(`  [2] MAX_CONFIRMACOES: 2 → ${MAX_CONFIRMACOES} (menos cancelamentos)`);
console.log(`  [3] Stop Loss: ${(STOP_LOSS_PCT * 100).toFixed(0)}% da banca → pausa ${STOP_LOSS_COOLDOWN} rodadas`);
console.log(`  [4] Janela: MANTÉM 10 rodadas (reduzir para 6 piorou resultado)`);
console.log(`  Banca: R$${BOT_CONFIG.bancaInicial} | FORTE=R$15, MEDIO=R$5, FRACO=R$2.50`);
console.log(`  Payout: 14x | Mantém FRACO ativo`);
console.log(`${'═'.repeat(70)}\n`);

// ========== SIMULAÇÃO ==========
let banca = BOT_CONFIG.bancaInicial;
let bancaMin = banca, bancaMax = banca;
let sinaisPendentes = [];
let resultados = { ACERTOU: 0, ERROU: 0, CANCELADO: 0 };
let resultadosPorNivel = { FORTE: { total: 0, acertos: 0 }, MEDIO: { total: 0, acertos: 0 }, FRACO: { total: 0, acertos: 0 } };
let lucrosPorNivel = { FORTE: 0, MEDIO: 0, FRACO: 0 };
let totalApostas = 0;
let sequenciaLoss = 0, maxSequenciaLoss = 0;
let sequenciaWin = 0, maxSequenciaWin = 0;
let drawdownMax = 0;
let picosBanca = banca;
let logDetalhado = [];
let entradas = 0;
let sinaisIgnorados = 0;

// Stop Loss
let stopLossAtivo = false;
let stopLossCooldown = 0;
let stopLossCount = 0;
let bancaAntesStopLoss = banca;

const WARMUP = 200;

for (let i = WARMUP; i < historico.length; i++) {
  const novoNum = historico[i];

  // [3] Stop Loss — cooldown
  if (stopLossAtivo) {
    stopLossCooldown--;
    if (stopLossCooldown <= 0) {
      stopLossAtivo = false;
      bancaAntesStopLoss = banca;
    } else {
      // Bot parado — não processa nada
      continue;
    }
  }

  // Calcular score na posição anterior
  const { dinamicos } = calcParesDinamicos(historico.slice(0, i), 300);
  const sinalAtual = calcScore(historico, i - 1, dinamicos);

  // --- Processar pendentes ---
  if (sinaisPendentes.length > 0) {
    const pendente = sinaisPendentes[0];
    pendente.rodadasRestantes--;
    pendente.numeros.push(novoNum);

    if (novoNum === 0) {
      // ACERTOU
      const casa = JANELA_ACERTO - pendente.rodadasRestantes;
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const ganho14x = valor * BOT_CONFIG.payout;
      const custoRodadas = valor * casa;
      const lucroLiq = ganho14x - custoRodadas;
      banca += lucroLiq;
      totalApostas += valor * casa;
      resultados.ACERTOU++;
      resultadosPorNivel[pendente.nivel].total++;
      resultadosPorNivel[pendente.nivel].acertos++;
      lucrosPorNivel[pendente.nivel] += lucroLiq;
      sequenciaWin++;
      if (sequenciaWin > maxSequenciaWin) maxSequenciaWin = sequenciaWin;
      sequenciaLoss = 0;
      logDetalhado.push({
        idx: i, hora: horarios[i], resultado: 'ACERTOU', nivel: pendente.nivel,
        casa, valor, lucro: lucroLiq, banca, score: pendente.score
      });
      sinaisPendentes = [];
    } else if (pendente.rodadasRestantes <= 0) {
      // ERROU — esgotou janela (agora só 6 rodadas)
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const perda = valor * JANELA_ACERTO;
      banca -= perda;
      totalApostas += perda;
      resultados.ERROU++;
      resultadosPorNivel[pendente.nivel].total++;
      lucrosPorNivel[pendente.nivel] -= perda;
      sequenciaLoss++;
      if (sequenciaLoss > maxSequenciaLoss) maxSequenciaLoss = sequenciaLoss;
      sequenciaWin = 0;
      logDetalhado.push({
        idx: i, hora: horarios[i], resultado: 'ERROU', nivel: pendente.nivel,
        casa: JANELA_ACERTO, valor, lucro: -perda, banca, score: pendente.score
      });
      sinaisPendentes = [];
    }
  }

  // --- Registrar novo sinal ---
  if (sinaisPendentes.length === 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    sinaisPendentes.push({
      nivel: sinalAtual.nivel,
      score: sinalAtual.score,
      rodadasRestantes: JANELA_ACERTO,
      numeros: [],
      hora: horarios[i - 1] || '--:--',
      confirmacoes: 0
    });
    entradas++;
  } else if (sinaisPendentes.length > 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    // Confirmação
    const pendente = sinaisPendentes[0];
    pendente.confirmacoes = (pendente.confirmacoes || 0) + 1;
    if (pendente.confirmacoes >= MAX_CONFIRMACOES) {
      // CANCELADO
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const rodadasJogadas = JANELA_ACERTO - pendente.rodadasRestantes;
      const perda = valor * rodadasJogadas;
      banca -= perda;
      totalApostas += perda;
      resultados.CANCELADO++;
      resultadosPorNivel[pendente.nivel].total++;
      lucrosPorNivel[pendente.nivel] -= perda;
      sequenciaLoss++;
      if (sequenciaLoss > maxSequenciaLoss) maxSequenciaLoss = sequenciaLoss;
      sequenciaWin = 0;
      logDetalhado.push({
        idx: i, hora: horarios[i], resultado: 'CANCELADO', nivel: pendente.nivel,
        casa: rodadasJogadas, valor, lucro: -perda, banca, score: pendente.score
      });
      sinaisPendentes = [];
      sinaisIgnorados++;
    }
  }

  // [3] Stop Loss check
  const perdaDesdeInicio = bancaAntesStopLoss - banca;
  if (perdaDesdeInicio > 0 && perdaDesdeInicio >= bancaAntesStopLoss * STOP_LOSS_PCT) {
    stopLossAtivo = true;
    stopLossCooldown = STOP_LOSS_COOLDOWN;
    stopLossCount++;
    sinaisPendentes = []; // Abortar pendente
  }

  // Tracking banca
  if (banca > bancaMax) bancaMax = banca;
  if (banca < bancaMin) bancaMin = banca;
  if (banca > picosBanca) picosBanca = banca;
  const dd = picosBanca - banca;
  if (dd > drawdownMax) drawdownMax = dd;
}

// ========== RELATÓRIO ==========
const totalSinais = resultados.ACERTOU + resultados.ERROU + resultados.CANCELADO;
const taxaAcerto = totalSinais > 0 ? (resultados.ACERTOU / totalSinais * 100).toFixed(1) : '0';
const lucroTotal = banca - BOT_CONFIG.bancaInicial;
const roi = totalApostas > 0 ? (lucroTotal / totalApostas * 100).toFixed(2) : '0';

console.log(`${'─'.repeat(70)}`);
console.log(`  📊 RESULTADO GERAL`);
console.log(`${'─'.repeat(70)}`);
console.log(`  Rodadas analisadas: ${historico.length - WARMUP} (warm-up: ${WARMUP})`);
console.log(`  Total entradas do bot: ${entradas}`);
console.log(`  Total sinais resolvidos: ${totalSinais}`);
console.log(`  ✅ Acertos: ${resultados.ACERTOU} (${taxaAcerto}%)`);
console.log(`  ❌ Erros: ${resultados.ERROU}`);
console.log(`  ⛔ Cancelados: ${resultados.CANCELADO} (${totalSinais > 0 ? (resultados.CANCELADO / totalSinais * 100).toFixed(1) : 0}%)`);
console.log(`  🚫 Stop Loss ativado: ${stopLossCount} vez(es)`);
console.log();
console.log(`${'─'.repeat(70)}`);
console.log(`  💰 FINANCEIRO`);
console.log(`${'─'.repeat(70)}`);
console.log(`  Banca inicial: R$${BOT_CONFIG.bancaInicial.toFixed(2)}`);
console.log(`  Banca final:   R$${banca.toFixed(2)}`);
console.log(`  Lucro/Prejuízo: ${lucroTotal >= 0 ? '+' : ''}R$${lucroTotal.toFixed(2)}`);
console.log(`  ROI: ${roi}%`);
console.log(`  Total apostado: R$${totalApostas.toFixed(2)}`);
console.log(`  Banca máxima: R$${bancaMax.toFixed(2)}`);
console.log(`  Banca mínima: R$${bancaMin.toFixed(2)}`);
console.log(`  Drawdown máximo: R$${drawdownMax.toFixed(2)} (${(drawdownMax / BOT_CONFIG.bancaInicial * 100).toFixed(1)}% da banca)`);
console.log();
console.log(`${'─'.repeat(70)}`);
console.log(`  📈 POR NÍVEL`);
console.log(`${'─'.repeat(70)}`);
for (const nv of ['FORTE', 'MEDIO', 'FRACO']) {
  const st = resultadosPorNivel[nv];
  const taxa = st.total > 0 ? (st.acertos / st.total * 100).toFixed(1) : '0';
  const lucNv = lucrosPorNivel[nv];
  console.log(`  ${nv.padEnd(6)} → ${st.total} sinais | ${st.acertos} acertos (${taxa}%) | ${lucNv >= 0 ? '+' : ''}R$${lucNv.toFixed(2)}`);
}
console.log();
console.log(`${'─'.repeat(70)}`);
console.log(`  🔥 STREAKS`);
console.log(`${'─'.repeat(70)}`);
console.log(`  Maior sequência de vitórias: ${maxSequenciaWin}`);
console.log(`  Maior sequência de derrotas: ${maxSequenciaLoss}`);
console.log();

// Distribuição de casaPagou
const casaDistribuicao = {};
logDetalhado.filter(l => l.resultado === 'ACERTOU').forEach(l => {
  casaDistribuicao[l.casa] = (casaDistribuicao[l.casa] || 0) + 1;
});
console.log(`${'─'.repeat(70)}`);
console.log(`  🎯 DISTRIBUIÇÃO DE ACERTOS (em qual rodada pagou)`);
console.log(`${'─'.repeat(70)}`);
for (let casa = 1; casa <= JANELA_ACERTO; casa++) {
  const qty = casaDistribuicao[casa] || 0;
  const bar = '█'.repeat(Math.min(50, Math.ceil(qty / 2)));
  console.log(`  ${casa}ª rodada: ${String(qty).padStart(3)} ${bar}`);
}
console.log();

// Curva de banca
console.log(`${'─'.repeat(70)}`);
console.log(`  📉 CURVA DE BANCA (evolução)`);
console.log(`${'─'.repeat(70)}`);
const step = 500;
let bancaCurva = BOT_CONFIG.bancaInicial;
const pontosCurva = [{ rodada: 0, banca: bancaCurva }];
let idxLog = 0;
for (let r = WARMUP; r < historico.length; r += step) {
  const limite = Math.min(r + step, historico.length);
  while (idxLog < logDetalhado.length && logDetalhado[idxLog].idx < limite) {
    bancaCurva += logDetalhado[idxLog].lucro;
    idxLog++;
  }
  pontosCurva.push({ rodada: limite - WARMUP, banca: bancaCurva });
}
for (const p of pontosCurva) {
  const val = Math.max(0, p.banca);
  const bar = p.banca >= BOT_CONFIG.bancaInicial
    ? '█'.repeat(Math.min(40, Math.max(0, Math.ceil((p.banca - 100) / 10))))
    : (p.banca >= 0 ? '░'.repeat(Math.min(40, Math.max(0, Math.ceil(p.banca / 10)))) : '▓'.repeat(Math.min(40, Math.max(0, Math.ceil(Math.abs(p.banca) / 50)))));
  console.log(`  Rod ${String(p.rodada).padStart(5)}: R$${p.banca.toFixed(2).padStart(8)} ${bar}`);
}
console.log();

// Comparação com V9 ORIGINAL
console.log(`${'═'.repeat(70)}`);
console.log(`  📊 COMPARAÇÃO: ORIGINAL vs OTIMIZADO`);
console.log(`${'═'.repeat(70)}`);
console.log(`  ${'Métrica'.padEnd(28)} ${'V9 Original'.padEnd(16)} ${'V9 Otimizado'.padEnd(16)} Diferença`);
console.log(`  ${'─'.repeat(64)}`);
console.log(`  ${'Acertos'.padEnd(28)} ${'400 (34.4%)'.padEnd(16)} ${(resultados.ACERTOU + ' (' + taxaAcerto + '%)').padEnd(16)} ${resultados.ACERTOU > 400 ? '↑' : resultados.ACERTOU < 400 ? '↓' : '='}`);
console.log(`  ${'Cancelados'.padEnd(28)} ${'633 (54%)'.padEnd(16)} ${(resultados.CANCELADO + ' (' + (totalSinais > 0 ? (resultados.CANCELADO / totalSinais * 100).toFixed(0) : 0) + '%)').padEnd(16)} ${resultados.CANCELADO < 633 ? '✅ menos' : '⚠️ mais'}`);
console.log(`  ${'Erros'.padEnd(28)} ${'130'.padEnd(16)} ${String(resultados.ERROU).padEnd(16)} ${resultados.ERROU < 130 ? '✅' : '⚠️'}`);
console.log(`  ${'Banca final'.padEnd(28)} ${'R$-1385'.padEnd(16)} ${'R$' + banca.toFixed(0)}`.padEnd(60) + `${banca > -1385 ? '✅' : '⚠️'}`);
console.log(`  ${'Drawdown'.padEnd(28)} ${'R$3245'.padEnd(16)} ${'R$' + drawdownMax.toFixed(0)}`.padEnd(60) + `${drawdownMax < 3245 ? '✅' : '⚠️'}`);
console.log(`  ${'Max loss streak'.padEnd(28)} ${'12'.padEnd(16)} ${String(maxSequenciaLoss).padEnd(16)} ${maxSequenciaLoss < 12 ? '✅' : '⚠️'}`);
console.log(`  ${'ROI'.padEnd(28)} ${'-5.58%'.padEnd(16)} ${(roi + '%').padEnd(16)} ${parseFloat(roi) > -5.58 ? '✅' : '⚠️'}`);
console.log();

// Diagnóstico
console.log(`${'═'.repeat(70)}`);
console.log(`  🔍 DIAGNÓSTICO FINAL`);
console.log(`${'═'.repeat(70)}\n`);

const problemas = [];

if (parseFloat(taxaAcerto) < 30) {
  problemas.push(`⚠️  Taxa de acerto baixa: ${taxaAcerto}%`);
}
if (drawdownMax > BOT_CONFIG.bancaInicial) {
  problemas.push(`⚠️  Drawdown > banca inicial: R$${drawdownMax.toFixed(2)} (falência em cenário real)`);
}
if (resultados.CANCELADO > totalSinais * 0.3) {
  problemas.push(`⚠️  Cancelamentos ainda altos: ${resultados.CANCELADO} (${(resultados.CANCELADO / totalSinais * 100).toFixed(0)}%)`);
}
if (maxSequenciaLoss >= 8) {
  problemas.push(`⚠️  Sequência de ${maxSequenciaLoss} derrotas — risco de falência`);
}
if (parseFloat(roi) < 0) {
  problemas.push(`⚠️  ROI negativo: ${roi}%`);
}

if (problemas.length === 0) {
  console.log(`  ✅ Bot saudável! Sem problemas críticos.\n`);
} else {
  for (const p of problemas) console.log(`  ${p}`);
  console.log();
}

// Resumo
console.log(`${'═'.repeat(70)}`);
if (lucroTotal > 0) {
  console.log(`  🟢 RESULTADO: LUCRATIVO +R$${lucroTotal.toFixed(2)} em ${historico.length - WARMUP} rodadas`);
} else if (banca > -1385) {
  console.log(`  🟡 RESULTADO: PREJUÍZO R$${lucroTotal.toFixed(2)}, mas MELHOR que V9 original (R$-1585)`);
} else {
  console.log(`  🔴 RESULTADO: PIOR que original — otimizações não ajudaram`);
}
console.log(`${'═'.repeat(70)}\n`);
