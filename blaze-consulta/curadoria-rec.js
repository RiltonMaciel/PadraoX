/**
 * CURADORIA REC — Testando nova lógica de REC
 * 
 * PROBLEMAS DO REC ATUAL:
 * - Conta segurados espalhados (3 em 20 rodadas ativa REC)
 * - Só desativa no branco (fica congelado)
 * 
 * NOVA LÓGICA:
 * - Segurados CONCENTRADOS: 3+ em janela de 5 rodadas
 * - Desativa: branco OU 4+ rodadas consecutivas sem segurado
 * - Cooldown: 3 rodadas após REC desativar antes de aceitar sinais
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

// ===== CONFIG =====
const JANELA_ACERTO = 10;
const MAX_CONFIRMACOES = 2;  // Original do server.js

// REC — NOVA LÓGICA
const REC_JANELA = 5;         // Conta segurados dentro de janela de 5 rodadas
const REC_THRESHOLD = 3;      // 3 segurados na janela para ativar
const REC_LIMPAS_PARA_SAIR = 4;  // 4 rodadas sem segurado = REC acabou
const REC_COOLDOWN = 3;       // 3 rodadas de cooldown após REC sair
const RITMO_MIN = 5;
const RITMO_MAX = 18;

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

// ========== NOVA LÓGICA REC ==========
function ehSegurado(num, ultimoNum) {
  return num === 11 || num === 12 || (num === ultimoNum && num !== 0);
}

// ========== SIMULAÇÃO ==========
console.log(`\n${'═'.repeat(70)}`);
console.log(`  CURADORIA REC — Nova lógica de detecção`);
console.log(`${'═'.repeat(70)}`);
console.log(`  Dataset: ${historico.length} rodadas reais`);
console.log(`  REC_JANELA: ${REC_JANELA} (conta segurados em janela de ${REC_JANELA} rodadas)`);
console.log(`  REC_THRESHOLD: ${REC_THRESHOLD} segurados na janela para ativar`);
console.log(`  REC_LIMPAS_PARA_SAIR: ${REC_LIMPAS_PARA_SAIR} rodadas sem segurado = sai do REC`);
console.log(`  REC_COOLDOWN: ${REC_COOLDOWN} rodadas após sair do REC`);
console.log(`  RITMO: gap branco entre ${RITMO_MIN}-${RITMO_MAX} considerado bom`);
console.log(`  Janela acerto: ${JANELA_ACERTO} | MAX_CONF: ${MAX_CONFIRMACOES}`);
console.log(`  Banca: R$${BOT_CONFIG.bancaInicial} | FORTE=R$15, MEDIO=R$5, FRACO=R$2.50`);
console.log(`  Payout: 14x`);
console.log(`${'═'.repeat(70)}\n`);

let banca = BOT_CONFIG.bancaInicial;
let bancaMin = banca, bancaMax = banca;
let sinaisPendentes = [];
let resultados = { ACERTOU: 0, ERROU: 0, CANCELADO: 0, REC: 0 };
let resultadosPorNivel = { FORTE: { total: 0, acertos: 0 }, MEDIO: { total: 0, acertos: 0 }, FRACO: { total: 0, acertos: 0 } };
let lucrosPorNivel = { FORTE: 0, MEDIO: 0, FRACO: 0 };
let totalApostas = 0;
let sequenciaLoss = 0, maxSequenciaLoss = 0;
let sequenciaWin = 0, maxSequenciaWin = 0;
let drawdownMax = 0;
let picosBanca = banca;
let entradas = 0;

// REC state
let recAtivo = false;
let recCooldown = 0;            // rodadas restantes de cooldown pós-REC
let ultimosNums = [];           // janela dos últimos N números para contar segurados
let rodadasSemSegurado = 0;    // contador para sair do REC
let ultimosGapsBranco = [];
let distDesdeUltimoBranco = 0;

// REC stats
let recAtivacoes = 0;
let recSinaisFechados = 0;
let recSinaisEvitados = 0;     // sinais que não abriram por REC/cooldown
let recDuracaoTotal = 0;
let recDuracaoAtual = 0;

const WARMUP = 200;

for (let i = WARMUP; i < historico.length; i++) {
  const novoNum = historico[i];
  const ultimoNum = i > 0 ? historico[i - 1] : -1;

  // Atualizar distância desde último branco
  if (novoNum === 0) {
    const gapAtual = distDesdeUltimoBranco;
    ultimosGapsBranco.push(gapAtual);
    if (ultimosGapsBranco.length > 5) ultimosGapsBranco.shift();
    distDesdeUltimoBranco = 0;
  } else {
    distDesdeUltimoBranco++;
  }

  // Atualizar janela de segurados recentes
  const eSegurado = ehSegurado(novoNum, ultimoNum);
  ultimosNums.push(eSegurado ? 1 : 0);
  if (ultimosNums.length > REC_JANELA) ultimosNums.shift();

  // Contar segurados na janela
  const seguradosNaJanela = ultimosNums.reduce((a, b) => a + b, 0);

  // --- NOVA LÓGICA REC: ATIVAÇÃO ---
  if (!recAtivo && recCooldown <= 0) {
    if (seguradosNaJanela >= REC_THRESHOLD) {
      // Verificar condição de ritmo
      const ultimoGap = ultimosGapsBranco.length > 0 ? ultimosGapsBranco[ultimosGapsBranco.length - 1] : 0;
      const ritmoEstavaBom = ultimoGap >= RITMO_MIN && ultimoGap <= RITMO_MAX;
      const jaPassouRitmo = ultimoGap > 0 && distDesdeUltimoBranco > ultimoGap * 1.5;

      if (ritmoEstavaBom || jaPassouRitmo) {
        recAtivo = true;
        recAtivacoes++;
        recDuracaoAtual = 0;
        rodadasSemSegurado = 0;
      }
    }
  }

  // --- NOVA LÓGICA REC: DESATIVAÇÃO ---
  if (recAtivo) {
    recDuracaoAtual++;
    recDuracaoTotal++;

    if (novoNum === 0) {
      // Branco sempre desativa
      recAtivo = false;
      recCooldown = REC_COOLDOWN;
      rodadasSemSegurado = 0;
    } else if (!eSegurado) {
      rodadasSemSegurado++;
      if (rodadasSemSegurado >= REC_LIMPAS_PARA_SAIR) {
        // Saiu por rodadas limpas
        recAtivo = false;
        recCooldown = REC_COOLDOWN;
        rodadasSemSegurado = 0;
      }
    } else {
      rodadasSemSegurado = 0; // resetou
    }
  }

  // Cooldown countdown
  if (recCooldown > 0) recCooldown--;

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
      sinaisPendentes = [];
    } else if (recAtivo) {
      // REC ativo → fecha sinal como REC (perda das rodadas já jogadas)
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const rodadasJogadas = JANELA_ACERTO - pendente.rodadasRestantes;
      const perda = valor * rodadasJogadas;
      banca -= perda;
      totalApostas += perda;
      resultados.REC++;
      resultadosPorNivel[pendente.nivel].total++;
      lucrosPorNivel[pendente.nivel] -= perda;
      sequenciaLoss++;
      if (sequenciaLoss > maxSequenciaLoss) maxSequenciaLoss = sequenciaLoss;
      sequenciaWin = 0;
      recSinaisFechados++;
      sinaisPendentes = [];
    } else if (pendente.rodadasRestantes <= 0) {
      // ERROU — esgotou janela
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
      sinaisPendentes = [];
    }
  }

  // --- Registrar novo sinal ---
  const bloqueadoPorRec = recAtivo || recCooldown > 0;

  if (sinaisPendentes.length === 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    if (bloqueadoPorRec) {
      recSinaisEvitados++;
    } else {
      sinaisPendentes.push({
        nivel: sinalAtual.nivel,
        score: sinalAtual.score,
        rodadasRestantes: JANELA_ACERTO,
        numeros: [],
        hora: horarios[i - 1] || '--:--',
        confirmacoes: 0
      });
      entradas++;
    }
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
      sinaisPendentes = [];
    }
  }

  // Tracking banca
  if (banca > bancaMax) bancaMax = banca;
  if (banca < bancaMin) bancaMin = banca;
  if (banca > picosBanca) picosBanca = banca;
  const dd = picosBanca - banca;
  if (dd > drawdownMax) drawdownMax = dd;
}

// ========== RELATÓRIO ==========
const totalSinais = resultados.ACERTOU + resultados.ERROU + resultados.CANCELADO + resultados.REC;
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
console.log(`  🛡️  REC (fechado por proteção): ${resultados.REC} (${totalSinais > 0 ? (resultados.REC / totalSinais * 100).toFixed(1) : 0}%)`);
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
console.log(`  🛡️  DETALHES REC`);
console.log(`${'─'.repeat(70)}`);
console.log(`  Ativações do REC: ${recAtivacoes}`);
console.log(`  Sinais fechados por REC: ${recSinaisFechados}`);
console.log(`  Sinais evitados por REC/cooldown: ${recSinaisEvitados}`);
console.log(`  Duração total em REC: ${recDuracaoTotal} rodadas (${(recDuracaoTotal / (historico.length - WARMUP) * 100).toFixed(1)}% do tempo)`);
console.log(`  Duração média por REC: ${recAtivacoes > 0 ? (recDuracaoTotal / recAtivacoes).toFixed(1) : 0} rodadas`);
console.log();
console.log(`${'─'.repeat(70)}`);
console.log(`  🔥 STREAKS`);
console.log(`${'─'.repeat(70)}`);
console.log(`  Maior sequência de vitórias: ${maxSequenciaWin}`);
console.log(`  Maior sequência de derrotas: ${maxSequenciaLoss}`);
console.log();

// ========== COMPARAÇÃO COM CENÁRIO SEM REC ==========
console.log(`${'═'.repeat(70)}`);
console.log(`  🔬 COMPARAÇÃO: COM REC vs SEM REC`);
console.log(`${'═'.repeat(70)}`);

// Rodar sem REC
let banca2 = BOT_CONFIG.bancaInicial;
let sinais2 = [];
let res2 = { ACERTOU: 0, ERROU: 0, CANCELADO: 0 };
let totalApostas2 = 0;

for (let i = WARMUP; i < historico.length; i++) {
  const novoNum = historico[i];
  const { dinamicos } = calcParesDinamicos(historico.slice(0, i), 300);
  const sinalAtual = calcScore(historico, i - 1, dinamicos);

  if (sinais2.length > 0) {
    const pendente = sinais2[0];
    pendente.rodadasRestantes--;
    pendente.numeros.push(novoNum);

    if (novoNum === 0) {
      const casa = JANELA_ACERTO - pendente.rodadasRestantes;
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const ganho14x = valor * BOT_CONFIG.payout;
      const custoRodadas = valor * casa;
      banca2 += ganho14x - custoRodadas;
      totalApostas2 += valor * casa;
      res2.ACERTOU++;
      sinais2 = [];
    } else if (pendente.rodadasRestantes <= 0) {
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const perda = valor * JANELA_ACERTO;
      banca2 -= perda;
      totalApostas2 += perda;
      res2.ERROU++;
      sinais2 = [];
    }
  }

  if (sinais2.length === 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    sinais2.push({
      nivel: sinalAtual.nivel,
      score: sinalAtual.score,
      rodadasRestantes: JANELA_ACERTO,
      numeros: [],
      confirmacoes: 0
    });
  } else if (sinais2.length > 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    const pendente = sinais2[0];
    pendente.confirmacoes = (pendente.confirmacoes || 0) + 1;
    if (pendente.confirmacoes >= MAX_CONFIRMACOES) {
      const valor = BOT_CONFIG.aposta[pendente.nivel];
      const rodadasJogadas = JANELA_ACERTO - pendente.rodadasRestantes;
      const perda = valor * rodadasJogadas;
      banca2 -= perda;
      totalApostas2 += perda;
      res2.CANCELADO++;
      sinais2 = [];
    }
  }
}

const totalSinais2 = res2.ACERTOU + res2.ERROU + res2.CANCELADO;
const lucro2 = banca2 - BOT_CONFIG.bancaInicial;
const taxa2 = totalSinais2 > 0 ? (res2.ACERTOU / totalSinais2 * 100).toFixed(1) : '0';

console.log(`  SEM REC (baseline):    ${totalSinais2} sinais | ${res2.ACERTOU} acertos (${taxa2}%) | Banca: R$${banca2.toFixed(2)} | ${lucro2 >= 0 ? '+' : ''}R$${lucro2.toFixed(2)}`);
console.log(`  COM REC (nova lógica): ${totalSinais} sinais | ${resultados.ACERTOU} acertos (${taxaAcerto}%) | Banca: R$${banca.toFixed(2)} | ${lucroTotal >= 0 ? '+' : ''}R$${lucroTotal.toFixed(2)}`);
console.log(`  Diferença: ${(lucroTotal - lucro2) >= 0 ? '+' : ''}R$${(lucroTotal - lucro2).toFixed(2)} (REC ${lucroTotal > lucro2 ? 'AJUDOU' : 'PREJUDICOU'})`);
console.log();
console.log(`${'═'.repeat(70)}\n`);
