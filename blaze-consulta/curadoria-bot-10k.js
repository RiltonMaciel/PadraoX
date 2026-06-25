/**
 * CURADORIA BOT V9 — Simulação completa com 10k rodadas reais
 * CSV: dados-novos.csv (TipMiner Blaze Double)
 * Banca inicial: R$200
 * Lógica: Motor V9 exato (Pares HOT/VETO + Gatilhos + Triplas + Dinâmicos + Stacking)
 * Regra: 1 sinal por vez, janela 10 rodadas, MAX_CONFIRMACOES=2
 * Bot aposta 1x por rodada: FORTE=R$15, MEDIO=R$5, FRACO=R$2.50, payout=14x
 */

const fs = require('fs');
const path = require('path');

// ========== CONSTANTES DO MOTOR V9 (copiadas do server.js) ==========
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

const JANELA_ACERTO = 10;
const MAX_CONFIRMACOES = 2;

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

  // Par HOT
  if (PARES_HOT[parKey]) {
    score = PARES_HOT[parKey];
  }

  // Gatilho
  if (gatilho) {
    const bonus = score < 1.0 ? NUMS_GATILHO[ultimo] : Math.round(NUMS_GATILHO[ultimo] * 0.3 * 100) / 100;
    score += bonus;
  }

  // Janela Dinâmica
  if (!PARES_HOT[parKey] && paresDinamicos && paresDinamicos[parKey]) {
    const din = paresDinamicos[parKey];
    const dinScore = Math.min(din.lift * 0.4, 1.2);
    score += dinScore;
  }

  // Tripla
  if (endIdx >= 2) {
    const triplaKey = historico[endIdx - 2] + ',' + penultimo + ',' + ultimo;
    if (TRIPLAS_HOT[triplaKey]) {
      score += TRIPLAS_HOT[triplaKey];
    }
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

// Pular header + linha tipminer
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

// CSV vem do mais recente ao mais antigo → inverter para cronológico
dados.reverse();
const historico = dados.map(d => d.numero);
const horarios = dados.map(d => d.hora);

console.log(`\n${'═'.repeat(70)}`);
console.log(`  CURADORIA BOT V9 — ${historico.length} rodadas reais`);
console.log(`  Banca: R$${BOT_CONFIG.bancaInicial} | Apostas: FORTE=R$15, MEDIO=R$5, FRACO=R$2.50`);
console.log(`  Payout: 14x | Janela: ${JANELA_ACERTO} rodadas | Sinal único`);
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

// Warm-up: usar primeiras 200 rodadas só para calibrar
const WARMUP = 200;

for (let i = WARMUP; i < historico.length; i++) {
  const novoNum = historico[i];

  // Calcular score na posição anterior (sinal que estaria ativo)
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
      logDetalhado.push({
        idx: i, hora: horarios[i], resultado: 'ERROU', nivel: pendente.nivel,
        casa: 10, valor, lucro: -perda, banca, score: pendente.score
      });
      sinaisPendentes = [];
    }
    // Se ainda está pendente, continua
  }

  // --- Registrar novo sinal (se não há pendente e score > 0) ---
  if (sinaisPendentes.length === 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    sinaisPendentes.push({
      nivel: sinalAtual.nivel,
      score: sinalAtual.score,
      rodadasRestantes: JANELA_ACERTO,
      numeros: [],
      hora: horarios[i - 1] || '--:--'
    });
    entradas++;
  } else if (sinaisPendentes.length > 0 && sinalAtual.nivel !== 'FRIO' && sinalAtual.score > 0) {
    // Já tem pendente → confirmação
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
console.log(`  ⛔ Cancelados: ${resultados.CANCELADO}`);
console.log(`  🚫 Sinais ignorados (seca): ${sinaisIgnorados}`);
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

// Análise por casaPagou (em qual rodada acertou)
const casaDistribuicao = {};
logDetalhado.filter(l => l.resultado === 'ACERTOU').forEach(l => {
  casaDistribuicao[l.casa] = (casaDistribuicao[l.casa] || 0) + 1;
});
console.log(`${'─'.repeat(70)}`);
console.log(`  🎯 DISTRIBUIÇÃO DE ACERTOS (em qual rodada pagou)`);
console.log(`${'─'.repeat(70)}`);
for (let casa = 1; casa <= JANELA_ACERTO; casa++) {
  const qty = casaDistribuicao[casa] || 0;
  const bar = '█'.repeat(Math.ceil(qty / 2));
  console.log(`  ${casa}ª rodada: ${String(qty).padStart(3)} ${bar}`);
}
console.log();

// Curva de banca (a cada 500 rodadas)
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
  const bar = p.banca >= BOT_CONFIG.bancaInicial ? '█'.repeat(Math.min(40, Math.max(0, Math.ceil((p.banca - 100) / 10)))) : (p.banca >= 0 ? '░'.repeat(Math.min(40, Math.max(0, Math.ceil(p.banca / 10)))) : '▓'.repeat(Math.min(40, Math.max(0, Math.ceil(Math.abs(p.banca) / 50)))));
  console.log(`  Rod ${String(p.rodada).padStart(5)}: R$${p.banca.toFixed(2).padStart(8)} ${bar}`);
}
console.log();

// Últimos 20 resultados detalhados
console.log(`${'─'.repeat(70)}`);
console.log(`  📋 ÚLTIMOS 20 RESULTADOS`);
console.log(`${'─'.repeat(70)}`);
const ultimos = logDetalhado.slice(-20);
console.log(`  ${'Hora'.padEnd(6)} ${'Result'.padEnd(10)} ${'Nível'.padEnd(6)} ${'Casa'.padEnd(5)} ${'Lucro'.padEnd(10)} ${'Banca'.padEnd(10)} Score`);
for (const l of ultimos) {
  const lucroStr = (l.lucro >= 0 ? '+' : '') + 'R$' + l.lucro.toFixed(2);
  console.log(`  ${(l.hora || '--:--').padEnd(6)} ${l.resultado.padEnd(10)} ${l.nivel.padEnd(6)} ${(l.casa + 'ª').padEnd(5)} ${lucroStr.padEnd(10)} R$${l.banca.toFixed(2).padStart(7)} ${l.score}`);
}

// ========== DIAGNÓSTICO ==========
console.log(`\n${'═'.repeat(70)}`);
console.log(`  🔍 DIAGNÓSTICO & PROBLEMAS ENCONTRADOS`);
console.log(`${'═'.repeat(70)}\n`);

const problemas = [];

// Problema 1: Taxa de acerto muito baixa
if (parseFloat(taxaAcerto) < 30) {
  problemas.push({
    titulo: 'Taxa de acerto baixa (' + taxaAcerto + '%)',
    descricao: 'O motor acerta menos de 30% dos sinais.',
    analogia: 'É como um pescador que joga a rede 10 vezes mas só pega peixe 3 vezes — a rede está no lugar certo, mas o peixe não está passando na frequência esperada.'
  });
}

// Problema 2: Drawdown perigoso
if (drawdownMax > BOT_CONFIG.bancaInicial * 0.5) {
  problemas.push({
    titulo: 'Drawdown crítico: R$' + drawdownMax.toFixed(2) + ' (' + (drawdownMax / BOT_CONFIG.bancaInicial * 100).toFixed(0) + '% da banca)',
    descricao: 'A banca caiu mais de 50% do valor inicial em algum momento.',
    analogia: 'É como dirigir numa estrada com buracos enormes — mesmo chegando ao destino, qualquer buraco maior poderia ter acabado a viagem. Gerenciamento de risco insuficiente.'
  });
}

// Problema 3: FORTE performa pior que deveria
if (resultadosPorNivel.FORTE.total > 5) {
  const taxaForte = resultadosPorNivel.FORTE.acertos / resultadosPorNivel.FORTE.total;
  const taxaFraco = resultadosPorNivel.FRACO.total > 0 ? resultadosPorNivel.FRACO.acertos / resultadosPorNivel.FRACO.total : 0;
  if (taxaForte <= taxaFraco && lucrosPorNivel.FORTE < 0) {
    problemas.push({
      titulo: 'FORTE tem desempenho igual ou pior que FRACO',
      descricao: `FORTE acerta ${(taxaForte * 100).toFixed(0)}% vs FRACO ${(taxaFraco * 100).toFixed(0)}%, mas aposta 6x mais. Prejuízo FORTE: R$${lucrosPorNivel.FORTE.toFixed(2)}`,
      analogia: 'É como apostar alto numa mão de poker "boa" — mas o adversário (o mercado) não respeita sua mão. Score alto não garante branco; a confiança do motor está inflada nos sinais fortes.'
    });
  }
}

// Problema 4: Muitos cancelados
if (resultados.CANCELADO > totalSinais * 0.2) {
  problemas.push({
    titulo: 'Muitos cancelamentos: ' + resultados.CANCELADO + ' (' + (resultados.CANCELADO / totalSinais * 100).toFixed(0) + '%)',
    descricao: 'O motor confirma novos sinais durante um sinal ativo com frequência (seca detectada).',
    analogia: 'É como começar a correr numa pista e alguém gritar "PARA!" antes de terminar — você já gastou energia (apostou rodadas) mas não completou. Isso pode indicar que o motor está gerando sinais rápido demais em sequência.'
  });
}

// Problema 5: Sequência de derrotas longa
if (maxSequenciaLoss >= 6) {
  problemas.push({
    titulo: 'Sequência de ' + maxSequenciaLoss + ' derrotas consecutivas',
    descricao: 'Em algum momento o bot perdeu ' + maxSequenciaLoss + ' sinais seguidos.',
    analogia: 'É como chutar penalidades — errar 6+ seguidas destrói a confiança e a banca. Mesmo com 50% de taxa geral, clusters de azar acontecem e precisam ser absorvidos pelo gerenciamento de risco.'
  });
}

// Problema 6: ROI negativo
if (parseFloat(roi) < 0) {
  problemas.push({
    titulo: 'ROI negativo: ' + roi + '%',
    descricao: 'Para cada R$1 apostado, o bot perde dinheiro.',
    analogia: 'É como um restaurante que vende pratos por menos do que gasta nos ingredientes — quanto mais vende, mais perde. O payout de 14x é bom quando acerta, mas as perdas acumuladas em 10 rodadas por sinal superam os ganhos.'
  });
}

// Problema 7: FRACO gera muito volume desnecessário
if (resultadosPorNivel.FRACO.total > totalSinais * 0.6 && lucrosPorNivel.FRACO < 0) {
  problemas.push({
    titulo: 'FRACO domina (' + resultadosPorNivel.FRACO.total + ' sinais) e dá prejuízo',
    descricao: `Sinais FRACO representam ${(resultadosPorNivel.FRACO.total / totalSinais * 100).toFixed(0)}% das entradas mas dão prejuízo de R$${Math.abs(lucrosPorNivel.FRACO).toFixed(2)}.`,
    analogia: 'É como aceitar todos os pedidos num delivery — até os bairros muito longe que mal pagam a gasolina. Filtrar sinais fracos reduziria volume mas possivelmente melhoraria o resultado.'
  });
}

if (problemas.length === 0) {
  console.log('  ✅ Nenhum problema crítico encontrado! Bot está saudável.\n');
} else {
  for (let i = 0; i < problemas.length; i++) {
    const p = problemas[i];
    console.log(`  ⚠️  PROBLEMA ${i + 1}: ${p.titulo}`);
    console.log(`      ${p.descricao}`);
    console.log(`      💡 Analogia: ${p.analogia}`);
    console.log();
  }
}

// Resumo final
console.log(`${'═'.repeat(70)}`);
console.log(`  RESUMO EXECUTIVO`);
console.log(`${'═'.repeat(70)}`);
if (lucroTotal > 0) {
  console.log(`  🟢 BOT LUCRATIVO: +R$${lucroTotal.toFixed(2)} em ${historico.length - WARMUP} rodadas`);
} else {
  console.log(`  🔴 BOT NO PREJUÍZO: R$${lucroTotal.toFixed(2)} em ${historico.length - WARMUP} rodadas`);
}
console.log(`  ${problemas.length === 0 ? 'Operação saudável.' : problemas.length + ' problema(s) identificado(s) — revisar acima.'}`);
console.log(`${'═'.repeat(70)}\n`);
