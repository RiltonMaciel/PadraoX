/**
 * ANÁLISE: Impacto de sinais múltiplos na métrica de acerto
 * 
 * Simula o motor V8 sobre ~10k rodadas reais e mede:
 * - Quantos sinais são gerados por ciclo (entre brancos)
 * - Quantos ACERTOUs cada branco gera (inflação)
 * - Taxa real (1 branco = 1 acerto) vs taxa inflada (N sinais = N acertos)
 * - Eficácia real do motor por nível (FORTE/MEDIO/FRACO)
 */

const fs = require('fs');
const path = require('path');

// ========== MOTOR V8 (cópia fiel do server.js) ==========
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

function calcBoostDistancia(d) {
  if (d >= 35) return 1.8;
  if (d >= 25) return 1.5;
  if (d >= 15) return 1.2;
  return 1.0;
}
function calcAntiStreak(d) {
  if (d >= 40) return 0.6;
  if (d >= 30) return 0.4;
  if (d >= 20) return 0.2;
  return 0;
}

function scoreV8(historico, endIdx) {
  if (endIdx < 1) return 0;
  const h = historico;
  const penultimo = h[endIdx - 1];
  const ultimo = h[endIdx];
  const parKey = `${penultimo},${ultimo}`;

  if (PARES_VETO.has(parKey)) return -1;

  let score = 0;
  const dupla = ultimo === penultimo;
  const gatilho = NUMS_GATILHO[ultimo] !== undefined;

  if (PARES_HOT[parKey]) score = PARES_HOT[parKey];
  if (gatilho) {
    const bonus = score < 1.0 ? NUMS_GATILHO[ultimo] : NUMS_GATILHO[ultimo] * 0.3;
    score += bonus;
  }
  if (endIdx >= 2) {
    const triplaKey = h[endIdx - 2] + ',' + penultimo + ',' + ultimo;
    if (TRIPLAS_HOT[triplaKey]) score += TRIPLAS_HOT[triplaKey];
  }

  if (score <= 0) return 0;

  let distBranco = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (h[i] === 0) { distBranco = endIdx - i; break; }
    distBranco = endIdx - i + 1;
  }

  const boostDist = calcBoostDistancia(distBranco);
  if (boostDist > 1.0) score *= boostDist;

  let stackCount = 0;
  if (PARES_HOT[parKey]) stackCount++;
  if (gatilho) stackCount++;
  if (distBranco >= 20) stackCount++;
  if (dupla && !PARES_VETO.has(parKey)) stackCount++;
  if (stackCount >= 3) score += 0.5;
  else if (stackCount >= 2 && PARES_HOT[parKey]) score += 0.3;

  const antiStreak = calcAntiStreak(distBranco);
  if (antiStreak > 0) score += antiStreak;

  if (distBranco >= 35 && score > 0 && score < 1.3) score = Math.max(score, 1.3);

  return Math.round(score * 100) / 100;
}

function getNivel(score) {
  if (score >= 2.0) return 'FORTE';
  if (score >= 1.3) return 'MEDIO';
  if (score > 0) return 'FRACO';
  return 'FRIO';
}

// ========== CARREGAR DADOS ==========
const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.trim().split('\n').slice(2); // skip header + tipminer row
const nums = lines.map(l => parseInt(l.split(',')[0])).filter(n => !isNaN(n)).reverse();

console.log(`\n${'='.repeat(70)}`);
console.log('  RELATÓRIO DE ANÁLISE — SINAIS MÚLTIPLOS & EFICÁCIA DO MOTOR V8');
console.log(`${'='.repeat(70)}`);
console.log(`\n📊 Dataset: ${nums.length} rodadas (dados-novos.csv)`);
console.log(`   Brancos totais: ${nums.filter(n => n === 0).length}`);
console.log(`   Taxa base branco: ${(nums.filter(n => n === 0).length / nums.length * 100).toFixed(2)}%\n`);

// ========== SIMULAÇÃO SISTEMA ATUAL (múltiplos sinais) ==========
const JANELA = 10;
let sinaisPendentes = [];
let resultadosAtual = { acertos: 0, erros: 0, total: 0 };
let resultadosPorNivel = { FORTE: { acertos: 0, erros: 0 }, MEDIO: { acertos: 0, erros: 0 }, FRACO: { acertos: 0, erros: 0 } };
let sinaisPorBranco = []; // quantos sinais estavam abertos quando branco veio
let sinaisGeradosPorCiclo = []; // sinais criados entre dois brancos consecutivos
let sinaisNoCiclo = 0;

for (let i = 200; i < nums.length; i++) {
  const novoNum = nums[i];
  const scoreAnterior = scoreV8(nums, i - 1);
  const nivelAnterior = getNivel(scoreAnterior);

  // Criar sinal se score > 0
  if (scoreAnterior > 0) {
    sinaisPendentes.push({ nivel: nivelAnterior, score: scoreAnterior, rodadasRestantes: JANELA });
    sinaisNoCiclo++;
  }

  // Processar pendentes
  if (novoNum === 0) {
    // BRANCO — todos acertam
    sinaisPorBranco.push(sinaisPendentes.length);
    for (const s of sinaisPendentes) {
      resultadosAtual.acertos++;
      resultadosAtual.total++;
      resultadosPorNivel[s.nivel].acertos++;
    }
    sinaisPendentes = [];
    sinaisGeradosPorCiclo.push(sinaisNoCiclo);
    sinaisNoCiclo = 0;
  } else {
    // Decrementar e expirar
    for (const s of sinaisPendentes) s.rodadasRestantes--;
    const expirados = sinaisPendentes.filter(s => s.rodadasRestantes <= 0);
    for (const s of expirados) {
      resultadosAtual.erros++;
      resultadosAtual.total++;
      resultadosPorNivel[s.nivel].erros++;
    }
    sinaisPendentes = sinaisPendentes.filter(s => s.rodadasRestantes > 0);
  }
}

// ========== SIMULAÇÃO PROPOSTA (sinal único + confirmações) ==========
let sinalAtivo = null;
let resultadosProposta = { acertos: 0, erros: 0, total: 0 };
let resultadosPropostaNivel = { FORTE: { acertos: 0, erros: 0 }, MEDIO: { acertos: 0, erros: 0 }, FRACO: { acertos: 0, erros: 0 } };
let confirmacoesHistorico = []; // quantas confirmações teve cada sinal

for (let i = 200; i < nums.length; i++) {
  const novoNum = nums[i];
  const scoreAnterior = scoreV8(nums, i - 1);
  const nivelAnterior = getNivel(scoreAnterior);

  // Lógica proposta: sinal único + confirmação
  if (scoreAnterior > 0) {
    if (!sinalAtivo) {
      // Cria novo sinal
      sinalAtivo = { nivel: nivelAnterior, score: scoreAnterior, rodadasRestantes: JANELA, confirmacoes: 0, scoreMax: scoreAnterior };
    } else {
      // Confirma o sinal existente
      sinalAtivo.confirmacoes++;
      sinalAtivo.scoreMax = Math.max(sinalAtivo.scoreMax, scoreAnterior);
      // Upgrade de nível com confirmações
      if (sinalAtivo.confirmacoes >= 3 && sinalAtivo.nivel !== 'FORTE') sinalAtivo.nivel = 'FORTE';
      else if (sinalAtivo.confirmacoes >= 1 && sinalAtivo.nivel === 'FRACO') sinalAtivo.nivel = 'MEDIO';
    }
  }

  if (!sinalAtivo) continue;

  // Processar
  if (novoNum === 0) {
    // BRANCO — 1 acerto
    confirmacoesHistorico.push(sinalAtivo.confirmacoes);
    resultadosProposta.acertos++;
    resultadosProposta.total++;
    resultadosPropostaNivel[sinalAtivo.nivel].acertos++;
    sinalAtivo = null;
  } else {
    sinalAtivo.rodadasRestantes--;
    if (sinalAtivo.rodadasRestantes <= 0) {
      confirmacoesHistorico.push(sinalAtivo.confirmacoes);
      resultadosProposta.erros++;
      resultadosProposta.total++;
      resultadosPropostaNivel[sinalAtivo.nivel].erros++;
      sinalAtivo = null;
    }
  }
}

// ========== ANÁLISE EXTRA: Acertos quando tinha confirmações ==========
// Simular com tracking detalhado
let detalheConfirmacoes = { 0: {a:0,e:0}, 1: {a:0,e:0}, 2: {a:0,e:0}, '3+': {a:0,e:0} };
let sinalDet = null;
for (let i = 200; i < nums.length; i++) {
  const novoNum = nums[i];
  const scoreAnterior = scoreV8(nums, i - 1);
  if (scoreAnterior > 0) {
    if (!sinalDet) {
      sinalDet = { rodadasRestantes: JANELA, confirmacoes: 0 };
    } else {
      sinalDet.confirmacoes++;
    }
  }
  if (!sinalDet) continue;
  if (novoNum === 0) {
    const key = sinalDet.confirmacoes >= 3 ? '3+' : sinalDet.confirmacoes.toString();
    detalheConfirmacoes[key].a++;
    sinalDet = null;
  } else {
    sinalDet.rodadasRestantes--;
    if (sinalDet.rodadasRestantes <= 0) {
      const key = sinalDet.confirmacoes >= 3 ? '3+' : sinalDet.confirmacoes.toString();
      detalheConfirmacoes[key].e++;
      sinalDet = null;
    }
  }
}

// ========== RELATÓRIO ==========
console.log(`${'─'.repeat(70)}`);
console.log('  1. DIAGNÓSTICO: INFLAÇÃO POR SINAIS MÚLTIPLOS');
console.log(`${'─'.repeat(70)}`);

const avgSinaisPorBranco = sinaisPorBranco.reduce((a,b) => a+b, 0) / sinaisPorBranco.length;
const maxSinaisPorBranco = Math.max(...sinaisPorBranco);
const sinais1 = sinaisPorBranco.filter(n => n === 1).length;
const sinais2 = sinaisPorBranco.filter(n => n === 2).length;
const sinais3 = sinaisPorBranco.filter(n => n === 3).length;
const sinais4mais = sinaisPorBranco.filter(n => n >= 4).length;
const sinais0 = sinaisPorBranco.filter(n => n === 0).length;

console.log(`\n  Quando BRANCO sai, quantos sinais estavam pendentes:`);
console.log(`    • 0 sinais (branco sem previsão): ${sinais0} vezes (${(sinais0/sinaisPorBranco.length*100).toFixed(1)}%)`);
console.log(`    • 1 sinal  (métrica limpa):       ${sinais1} vezes (${(sinais1/sinaisPorBranco.length*100).toFixed(1)}%)`);
console.log(`    • 2 sinais (inflação 2x):         ${sinais2} vezes (${(sinais2/sinaisPorBranco.length*100).toFixed(1)}%)`);
console.log(`    • 3 sinais (inflação 3x):         ${sinais3} vezes (${(sinais3/sinaisPorBranco.length*100).toFixed(1)}%)`);
console.log(`    • 4+ sinais (inflação pesada):    ${sinais4mais} vezes (${(sinais4mais/sinaisPorBranco.length*100).toFixed(1)}%)`);
console.log(`    • Média: ${avgSinaisPorBranco.toFixed(2)} sinais/branco | Máximo: ${maxSinaisPorBranco}`);

const avgGerados = sinaisGeradosPorCiclo.reduce((a,b) => a+b, 0) / sinaisGeradosPorCiclo.length;
console.log(`\n  Sinais gerados por ciclo (entre 2 brancos):`);
console.log(`    • Média: ${avgGerados.toFixed(2)} sinais/ciclo`);
console.log(`    • Máximo: ${Math.max(...sinaisGeradosPorCiclo)} sinais em 1 ciclo`);

console.log(`\n\n${'─'.repeat(70)}`);
console.log('  2. COMPARAÇÃO: SISTEMA ATUAL vs PROPOSTA (SINAL ÚNICO)');
console.log(`${'─'.repeat(70)}`);

const taxaAtual = (resultadosAtual.acertos / resultadosAtual.total * 100).toFixed(1);
const taxaProposta = (resultadosProposta.acertos / resultadosProposta.total * 100).toFixed(1);

console.log(`\n  ┌─────────────────────┬──────────────┬──────────────┐`);
console.log(`  │ Métrica             │ ATUAL        │ PROPOSTA     │`);
console.log(`  ├─────────────────────┼──────────────┼──────────────┤`);
console.log(`  │ Total de sinais     │ ${String(resultadosAtual.total).padStart(12)} │ ${String(resultadosProposta.total).padStart(12)} │`);
console.log(`  │ Acertos             │ ${String(resultadosAtual.acertos).padStart(12)} │ ${String(resultadosProposta.acertos).padStart(12)} │`);
console.log(`  │ Erros               │ ${String(resultadosAtual.erros).padStart(12)} │ ${String(resultadosProposta.erros).padStart(12)} │`);
console.log(`  │ Taxa de acerto      │ ${(taxaAtual + '%').padStart(12)} │ ${(taxaProposta + '%').padStart(12)} │`);
console.log(`  └─────────────────────┴──────────────┴──────────────┘`);

console.log(`\n  ⚠ Diferença: taxa ${taxaAtual}% (inflada) → ${taxaProposta}% (real)`);
console.log(`    Fator de inflação: ${(resultadosAtual.acertos / resultadosProposta.acertos).toFixed(2)}x nos acertos`);

console.log(`\n\n${'─'.repeat(70)}`);
console.log('  3. EFICÁCIA DO MOTOR POR NÍVEL');
console.log(`${'─'.repeat(70)}`);

console.log(`\n  SISTEMA PROPOSTA (sinal único — métrica real):\n`);
for (const nivel of ['FORTE', 'MEDIO', 'FRACO']) {
  const r = resultadosPropostaNivel[nivel];
  const total = r.acertos + r.erros;
  if (total === 0) continue;
  const taxa = (r.acertos / total * 100).toFixed(1);
  const barra = '█'.repeat(Math.round(taxa / 2)) + '░'.repeat(50 - Math.round(taxa / 2));
  console.log(`  ${nivel.padEnd(6)} │ ${barra} ${taxa}%`);
  console.log(`  ${''.padEnd(6)} │ ${r.acertos} acertos / ${r.erros} erros (${total} sinais)`);
  console.log('');
}

// Taxa geral real
const totalProposta = resultadosProposta.acertos + resultadosProposta.erros;
const taxaGeralReal = (resultadosProposta.acertos / totalProposta * 100).toFixed(1);

console.log(`\n${'─'.repeat(70)}`);
console.log('  4. IMPACTO DAS CONFIRMAÇÕES (quanto mais sinais, melhor?)');
console.log(`${'─'.repeat(70)}\n`);

for (const [key, val] of Object.entries(detalheConfirmacoes)) {
  const total = val.a + val.e;
  if (total === 0) continue;
  const taxa = (val.a / total * 100).toFixed(1);
  console.log(`  ${key === '3+' ? '3+ confirmações' : key + ' confirmação(ões)'}: ${taxa}% acerto (${val.a}/${total})`);
}

console.log(`\n\n${'─'.repeat(70)}`);
console.log('  5. NOTA DE EFICÁCIA GERAL DO MOTOR');
console.log(`${'─'.repeat(70)}`);

// Calcular eficácia ponderada (peso maior para FORTE)
const forteR = resultadosPropostaNivel.FORTE;
const medioR = resultadosPropostaNivel.MEDIO;
const fracoR = resultadosPropostaNivel.FRACO;

const taxaForte = forteR.acertos + forteR.erros > 0 ? forteR.acertos / (forteR.acertos + forteR.erros) : 0;
const taxaMedio = medioR.acertos + medioR.erros > 0 ? medioR.acertos / (medioR.acertos + medioR.erros) : 0;
const taxaFraco = fracoR.acertos + fracoR.erros > 0 ? fracoR.acertos / (fracoR.acertos + fracoR.erros) : 0;

// Eficácia ponderada: FORTE vale 50%, MEDIO 35%, FRACO 15%
const eficaciaPonderada = (taxaForte * 0.50 + taxaMedio * 0.35 + taxaFraco * 0.15) * 100;

// Bonus por volume (se o motor emite bastante sinal, é mais útil)
const cobertura = resultadosProposta.total / (nums.length - 200); // % de rodadas que tiveram sinal
const bonusCobertura = Math.min(cobertura * 20, 10); // max +10%

// Nota final (escala 10-100)
const notaFinal = Math.min(100, Math.max(10, Math.round(eficaciaPonderada + bonusCobertura)));

console.log(`\n  Taxa real FORTE:  ${(taxaForte * 100).toFixed(1)}%`);
console.log(`  Taxa real MEDIO:  ${(taxaMedio * 100).toFixed(1)}%`);
console.log(`  Taxa real FRACO:  ${(taxaFraco * 100).toFixed(1)}%`);
console.log(`  Taxa geral:       ${taxaGeralReal}%`);
console.log(`  Cobertura:        ${(cobertura * 100).toFixed(1)}% das rodadas tem sinal ativo`);
console.log(`\n  ┌────────────────────────────────────────────┐`);
console.log(`  │  EFICÁCIA DO MOTOR V8: ${String(notaFinal).padStart(3)}% / 100%         │`);
console.log(`  └────────────────────────────────────────────┘`);
console.log(`\n  Cálculo: (FORTE×50% + MEDIO×35% + FRACO×15%) + bonus cobertura`);
console.log(`  = (${(taxaForte*100).toFixed(1)}×0.5 + ${(taxaMedio*100).toFixed(1)}×0.35 + ${(taxaFraco*100).toFixed(1)}×0.15) + ${bonusCobertura.toFixed(1)}`);
console.log(`  = ${eficaciaPonderada.toFixed(1)} + ${bonusCobertura.toFixed(1)} = ${notaFinal}%`);

console.log(`\n\n${'─'.repeat(70)}`);
console.log('  6. CONCLUSÃO & RECOMENDAÇÃO');
console.log(`${'─'.repeat(70)}`);

const inflacao = (resultadosAtual.acertos / resultadosProposta.acertos).toFixed(2);
console.log(`
  📌 PROBLEMA CONFIRMADO:
     O sistema atual infla os acertos em ${inflacao}x (cada branco gera ${avgSinaisPorBranco.toFixed(1)} acertos em média).
     A taxa exibida de ${taxaAtual}% é IRREAL — a real é ${taxaProposta}%.

  💡 PROPOSTA DE SINAL ÚNICO:
     • Mantém apenas 1 sinal ativo por vez
     • Sinais subsequentes CONFIRMAM o sinal (não criam novo)
     • Confirmações podem elevar o nível (FRACO → MEDIO → FORTE)
     • Resultado: métrica HONESTA, sem inflação

  ✅ BENEFÍCIOS:
     • 1 branco = 1 acerto (métrica real)
     • Confirmações servem como indicador de CONFIANÇA
     • Menos ruído no histórico (em vez de 5 linhas, 1 linha com "3 confirmações")
     • Fator de inflação eliminado: ${inflacao}x → 1.0x
`);

console.log(`${'='.repeat(70)}\n`);
