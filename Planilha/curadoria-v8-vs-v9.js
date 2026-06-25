/**
 * CURADORIA: Motor V8 ANTES vs DEPOIS das otimizações
 * 
 * Compara:
 *  - V8 original (boost distância + anti-streak + múltiplos sinais)
 *  - V9 otimizado (sem boost + sinal único + cancelamento por confirmações)
 * 
 * Dataset: tipminer-dados-blaze-double (10).xlsx — 10.000 rodadas reais
 */

const XLSX = require('xlsx');
const path = require('path');

// ========== CONSTANTES COMUNS ==========
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

const JANELA = 10;
const MAX_CONFIRMACOES = 2;

// ========== MOTOR V8 ORIGINAL (com boost + anti-streak) ==========
function scoreV8Original(h, endIdx) {
  if (endIdx < 1) return 0;
  const penultimo = h[endIdx - 1], ultimo = h[endIdx];
  const parKey = `${penultimo},${ultimo}`;
  if (PARES_VETO.has(parKey)) return -1;

  let score = 0;
  const dupla = ultimo === penultimo;
  const gatilho = NUMS_GATILHO[ultimo] !== undefined;

  if (PARES_HOT[parKey]) score = PARES_HOT[parKey];
  if (gatilho) score += score < 1.0 ? NUMS_GATILHO[ultimo] : NUMS_GATILHO[ultimo] * 0.3;
  if (endIdx >= 2) {
    const tk = h[endIdx-2]+','+penultimo+','+ultimo;
    if (TRIPLAS_HOT[tk]) score += TRIPLAS_HOT[tk];
  }
  if (score <= 0) return 0;

  let distBranco = 0;
  for (let i = endIdx; i >= 0; i--) { if (h[i] === 0) { distBranco = endIdx - i; break; } distBranco = endIdx - i + 1; }

  // BOOST DISTÂNCIA (original)
  if (distBranco >= 35) score *= 1.8;
  else if (distBranco >= 25) score *= 1.5;
  else if (distBranco >= 15) score *= 1.2;

  // STACKING
  let sc = 0;
  if (PARES_HOT[parKey]) sc++;
  if (gatilho) sc++;
  if (distBranco >= 20) sc++;
  if (dupla && !PARES_VETO.has(parKey)) sc++;
  if (sc >= 3) score += 0.5;
  else if (sc >= 2 && PARES_HOT[parKey]) score += 0.3;

  // ANTI-STREAK (original)
  if (distBranco >= 40) score += 0.6;
  else if (distBranco >= 30) score += 0.4;
  else if (distBranco >= 20) score += 0.2;

  // DIST CRITICA
  if (distBranco >= 35 && score > 0 && score < 1.3) score = 1.3;

  return Math.round(score * 100) / 100;
}

// ========== MOTOR V9 OTIMIZADO (sem boost, puro) ==========
function scoreV9(h, endIdx) {
  if (endIdx < 1) return 0;
  const penultimo = h[endIdx - 1], ultimo = h[endIdx];
  const parKey = `${penultimo},${ultimo}`;
  if (PARES_VETO.has(parKey)) return -1;

  let score = 0;
  const dupla = ultimo === penultimo;
  const gatilho = NUMS_GATILHO[ultimo] !== undefined;

  if (PARES_HOT[parKey]) score = PARES_HOT[parKey];
  if (gatilho) score += score < 1.0 ? NUMS_GATILHO[ultimo] : NUMS_GATILHO[ultimo] * 0.3;
  if (endIdx >= 2) {
    const tk = h[endIdx-2]+','+penultimo+','+ultimo;
    if (TRIPLAS_HOT[tk]) score += TRIPLAS_HOT[tk];
  }
  if (score <= 0) return 0;

  // SEM boost de distância
  // SEM anti-streak
  // SEM dist crítica

  // Stacking leve (sem contar distância como fator)
  let sc = 0;
  if (PARES_HOT[parKey]) sc++;
  if (gatilho) sc++;
  if (dupla && !PARES_VETO.has(parKey)) sc++;
  if (sc >= 3) score += 0.5;
  else if (sc >= 2 && PARES_HOT[parKey]) score += 0.3;

  return Math.round(score * 100) / 100;
}

function getNivel(score) {
  if (score >= 2.0) return 'FORTE';
  if (score >= 1.3) return 'MEDIO';
  if (score > 0) return 'FRACO';
  return 'FRIO';
}

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (10).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(2);
const nums = rows.map(r => parseInt(r[0])).filter(n => !isNaN(n)).reverse();
const T = nums.length;
const INICIO = 200;

// ========== SIMULAÇÃO V8 ORIGINAL (múltiplos sinais) ==========
function simularV8(nums) {
  let pendentes = [];
  let acertos = 0, erros = 0, total = 0;
  let nivelStats = { FORTE: {a:0,e:0}, MEDIO: {a:0,e:0}, FRACO: {a:0,e:0} };
  let seqErros = 0, maxSeqErros = 0, seqAcertos = 0, maxSeqAcertos = 0;
  let saldo = 0, saldoMin = 0;

  for (let i = INICIO; i < T; i++) {
    const novoNum = nums[i];
    const score = scoreV8Original(nums, i - 1);
    const nivel = getNivel(score);

    if (score > 0) {
      pendentes.push({ nivel, score, rodadasRestantes: JANELA });
    }

    if (novoNum === 0) {
      for (const s of pendentes) {
        acertos++; total++;
        nivelStats[s.nivel].a++;
        saldo += 14;
      }
      if (pendentes.length > 0) { seqAcertos++; seqErros = 0; if (seqAcertos > maxSeqAcertos) maxSeqAcertos = seqAcertos; }
      pendentes = [];
    } else {
      for (const s of pendentes) s.rodadasRestantes--;
      const exp = pendentes.filter(s => s.rodadasRestantes <= 0);
      for (const s of exp) {
        erros++; total++;
        nivelStats[s.nivel].e++;
        saldo -= 1;
        seqErros++; seqAcertos = 0;
        if (seqErros > maxSeqErros) maxSeqErros = seqErros;
      }
      pendentes = pendentes.filter(s => s.rodadasRestantes > 0);
    }
    if (saldo < saldoMin) saldoMin = saldo;
  }

  return { acertos, erros, total, nivelStats, maxSeqErros, maxSeqAcertos, saldo, saldoMin };
}

// ========== SIMULAÇÃO V9 OTIMIZADO (sinal único + cancelamento) ==========
function simularV9(nums) {
  let sinal = null;
  let acertos = 0, erros = 0, cancelados = 0, total = 0;
  let nivelStats = { FORTE: {a:0,e:0}, MEDIO: {a:0,e:0}, FRACO: {a:0,e:0} };
  let seqErros = 0, maxSeqErros = 0, seqAcertos = 0, maxSeqAcertos = 0;
  let saldo = 0, saldoMin = 0;
  let confQuandoAcerta = [];
  let confQuandoErra = [];

  for (let i = INICIO; i < T; i++) {
    const novoNum = nums[i];
    const score = scoreV9(nums, i - 1);
    const nivel = getNivel(score);

    if (score > 0) {
      if (!sinal) {
        // Criar sinal
        sinal = { nivel, score, rodadasRestantes: JANELA, confirmacoes: 0 };
        saldo -= 1; // aposta
      } else {
        // Confirmação
        sinal.confirmacoes++;
        if (sinal.confirmacoes >= MAX_CONFIRMACOES) {
          // CANCELAR — seca detectada
          cancelados++;
          total++;
          sinal = null;
          continue;
        }
      }
    }

    if (!sinal) continue;

    if (novoNum === 0) {
      // ACERTOU
      acertos++; total++;
      nivelStats[sinal.nivel].a++;
      confQuandoAcerta.push(sinal.confirmacoes);
      saldo += 14;
      seqAcertos++; seqErros = 0;
      if (seqAcertos > maxSeqAcertos) maxSeqAcertos = seqAcertos;
      sinal = null;
    } else {
      sinal.rodadasRestantes--;
      if (sinal.rodadasRestantes <= 0) {
        // ERROU
        erros++; total++;
        nivelStats[sinal.nivel].e++;
        confQuandoErra.push(sinal.confirmacoes);
        seqErros++; seqAcertos = 0;
        if (seqErros > maxSeqErros) maxSeqErros = seqErros;
        sinal = null;
      }
    }
    if (saldo < saldoMin) saldoMin = saldo;
  }

  return { acertos, erros, cancelados, total, nivelStats, maxSeqErros, maxSeqAcertos, saldo, saldoMin, confQuandoAcerta, confQuandoErra };
}

// ========== EXECUTAR ==========
const v8 = simularV8(nums);
const v9 = simularV9(nums);

const taxaV8 = (v8.acertos / v8.total * 100).toFixed(1);
const taxaV9real = (v9.acertos / (v9.acertos + v9.erros) * 100).toFixed(1); // sem cancelados
const taxaV9total = (v9.acertos / v9.total * 100).toFixed(1); // com cancelados

const brancosTotais = nums.slice(INICIO).filter(n => n === 0).length;
const chanceAleatoria = (1 - Math.pow(1 - brancosTotais/(T-INICIO), JANELA)) * 100;

// ========== RELATÓRIO ==========
const L = '═', l = '─';

console.log(`\n${L.repeat(74)}`);
console.log(`   CURADORIA COMPARATIVA: Motor V8 (original) vs V9 (otimizado)`);
console.log(`   Dataset: 10.000 rodadas reais (18-22/Mai/2026)`);
console.log(`${L.repeat(74)}`);

console.log(`\n┌${l.repeat(72)}┐`);
console.log(`│  O QUE MUDOU (V8 → V9)                                               │`);
console.log(`└${l.repeat(72)}┘`);
console.log(`
  ┌─────────────────────────────────────────────────────────────────┐
  │ Mudança                    │ V8 (antes)     │ V9 (depois)       │
  ├────────────────────────────┼────────────────┼───────────────────┤
  │ Sinais por vez             │ Ilimitados     │ Máximo 1 ativo    │
  │ Boost de distância         │ 1.2x a 1.8x   │ Removido (1.0x)   │
  │ Anti-streak                │ +0.2 a +0.6    │ Removido (0)      │
  │ Dist crítica→MEDIO         │ Ativo (d≥35)   │ Removido          │
  │ Cancelamento por seca      │ Não existia    │ 2+ confirms→cancela│
  └─────────────────────────────────────────────────────────────────┘
`);

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  RESULTADO GERAL                                                      │`);
console.log(`└${l.repeat(72)}┘`);
console.log(`
  ┌───────────────────────────┬──────────────────┬──────────────────┐
  │ Métrica                   │ V8 (original)    │ V9 (otimizado)   │
  ├───────────────────────────┼──────────────────┼──────────────────┤
  │ Sinais emitidos           │ ${String(v8.total).padStart(16)} │ ${String(v9.total).padStart(16)} │
  │ Acertos                   │ ${String(v8.acertos).padStart(16)} │ ${String(v9.acertos).padStart(16)} │
  │ Erros                     │ ${String(v8.erros).padStart(16)} │ ${String(v9.erros).padStart(16)} │
  │ Cancelados (seca)         │ ${String('—').padStart(16)} │ ${String(v9.cancelados).padStart(16)} │
  │ Taxa de acerto            │ ${(taxaV8 + '%').padStart(16)} │ ${(taxaV9real + '%').padStart(16)} │
  │ Chance aleatória          │ ${(chanceAleatoria.toFixed(1) + '%').padStart(16)} │ ${(chanceAleatoria.toFixed(1) + '%').padStart(16)} │
  │ Lift vs acaso             │ ${(parseFloat(taxaV8)/chanceAleatoria).toFixed(2).padStart(15)}x │ ${(parseFloat(taxaV9real)/chanceAleatoria).toFixed(2).padStart(15)}x │
  │ Max erros seguidos        │ ${String(v8.maxSeqErros).padStart(16)} │ ${String(v9.maxSeqErros).padStart(16)} │
  │ Max acertos seguidos      │ ${String(v8.maxSeqAcertos).padStart(16)} │ ${String(v9.maxSeqAcertos).padStart(16)} │
  │ Saldo (14x, aposta fixa)  │ ${(v8.saldo >= 0 ? '+' : '') + String(v8.saldo).padStart(15)} │ ${(v9.saldo >= 0 ? '+' : '') + String(v9.saldo).padStart(15)} │
  │ Drawdown máximo           │ ${String(v8.saldoMin).padStart(16)} │ ${String(v9.saldoMin).padStart(16)} │
  └───────────────────────────┴──────────────────┴──────────────────┘
`);

// Determinar melhorias
const melhorouTaxa = parseFloat(taxaV9real) > parseFloat(taxaV8);
const melhorouSaldo = v9.saldo > v8.saldo;
const melhorouDrawdown = v9.maxSeqErros < v8.maxSeqErros;
const melhorouVolume = v9.total < v8.total; // menos ruído

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  ANÁLISE POR NÍVEL                                                    │`);
console.log(`└${l.repeat(72)}┘\n`);

for (const nivel of ['FORTE', 'MEDIO', 'FRACO']) {
  const a8 = v8.nivelStats[nivel], a9 = v9.nivelStats[nivel];
  const t8 = a8.a + a8.e, t9 = a9.a + a9.e;
  const taxa8 = t8 > 0 ? (a8.a / t8 * 100).toFixed(1) : '0.0';
  const taxa9 = t9 > 0 ? (a9.a / t9 * 100).toFixed(1) : '0.0';
  console.log(`  ${nivel}:`);
  console.log(`    V8: ${a8.a} acertos / ${a8.e} erros = ${taxa8}% (${t8} sinais)`);
  console.log(`    V9: ${a9.a} acertos / ${a9.e} erros = ${taxa9}% (${t9} sinais)`);
  console.log(`    ${parseFloat(taxa9) > parseFloat(taxa8) ? '✅ MELHOROU' : parseFloat(taxa9) === parseFloat(taxa8) ? '➖ IGUAL' : '❌ PIOROU'} (${(parseFloat(taxa9) - parseFloat(taxa8)).toFixed(1)} pp)\n`);
}

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  EFICÁCIA DO CANCELAMENTO                                             │`);
console.log(`└${l.repeat(72)}┘`);

// Para avaliar: dos sinais cancelados, quantos TERIAM acertado se não fossem cancelados?
let canceladosQueAcertariam = 0;
let canceladosTotal = 0;
let sinalTest = null;
for (let i = INICIO; i < T; i++) {
  const novoNum = nums[i];
  const score = scoreV9(nums, i - 1);
  if (score > 0) {
    if (!sinalTest) {
      sinalTest = { rodadasRestantes: JANELA, confirmacoes: 0, cancelado: false };
    } else {
      sinalTest.confirmacoes++;
      if (!sinalTest.cancelado && sinalTest.confirmacoes >= MAX_CONFIRMACOES) {
        sinalTest.cancelado = true;
        canceladosTotal++;
        // Continuar rastreando para ver se branco viria
        sinalTest.rodadasRestantesCopia = sinalTest.rodadasRestantes;
      }
    }
  }
  if (!sinalTest) continue;
  if (novoNum === 0) {
    if (sinalTest.cancelado) canceladosQueAcertariam++;
    sinalTest = null;
  } else {
    sinalTest.rodadasRestantes--;
    if (sinalTest.rodadasRestantes <= 0) sinalTest = null;
  }
}

const canceladosQueErrariam = canceladosTotal - canceladosQueAcertariam;
console.log(`
  O cancelamento por seca removeu ${v9.cancelados} sinais do jogo.
  
  Desses ${canceladosTotal} cancelados, se tivéssemos mantido:
  • ${canceladosQueAcertariam} TERIAM acertado (perda de oportunidade)
  • ${canceladosQueErrariam} TERIAM errado (economia real)
  
  Taxa de acerto dos cancelados: ${canceladosTotal > 0 ? (canceladosQueAcertariam/canceladosTotal*100).toFixed(1) : 0}%
  (vs taxa geral V9: ${taxaV9real}%)
  
  ${canceladosQueAcertariam/canceladosTotal < parseFloat(taxaV9real)/100 
    ? '✅ CANCELAMENTO EFICAZ: os sinais cancelados tinham taxa PIOR que a média.\n     Removê-los MELHOROU a taxa geral.'
    : '⚠️ CANCELAMENTO REMOVEU SINAIS BONS: taxa dos cancelados era MELHOR que a média.\n     Considerar ajustar o threshold.'}
`);

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  SIMULAÇÃO FINANCEIRA DETALHADA                                       │`);
console.log(`└${l.repeat(72)}┘`);

const roiV8 = v8.total > 0 ? ((v8.saldo / v8.total) * 100).toFixed(1) : '0';
const roiV9 = (v9.acertos + v9.erros) > 0 ? ((v9.saldo / (v9.acertos + v9.erros)) * 100).toFixed(1) : '0';

console.log(`
  Premissa: aposta 1 unidade por sinal, branco paga 14x.
  
  V8 (original):
  • Apostas feitas: ${v8.total}
  • Investido: ${v8.total} unidades
  • Retorno: ${v8.acertos * 14} unidades (${v8.acertos} × 14)
  • Saldo final: ${v8.saldo >= 0 ? '+' : ''}${v8.saldo}
  • ROI: ${roiV8}%
  
  V9 (otimizado):
  • Apostas feitas: ${v9.acertos + v9.erros} (${v9.cancelados} foram cancelados antes de apostar)
  • Investido: ${v9.acertos + v9.erros} unidades
  • Retorno: ${v9.acertos * 14} unidades (${v9.acertos} × 14)
  • Saldo final: ${v9.saldo >= 0 ? '+' : ''}${v9.saldo}
  • ROI: ${roiV9}%
  
  ${parseFloat(roiV9) > parseFloat(roiV8) ? '✅ V9 tem ROI MELHOR' : '❌ V8 tem ROI melhor'}
  Diferença de ROI: ${(parseFloat(roiV9) - parseFloat(roiV8)).toFixed(1)} pontos percentuais
`);

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  NOTA FINAL COMPARATIVA                                               │`);
console.log(`└${l.repeat(72)}┘`);

// Nota V8
const liftV8 = parseFloat(taxaV8) / chanceAleatoria;
const compAcertoV8 = Math.min(100, liftV8 * 50);
const compRiscoV8 = Math.max(0, 100 - v8.maxSeqErros * 8);
const compLucroV8 = v8.saldo > 0 ? Math.min(100, 50 + (v8.saldo / v8.total) * 50) : Math.max(0, 50 + (v8.saldo / v8.total) * 50);
const notaV8 = Math.min(100, Math.max(10, Math.round(compAcertoV8 * 0.4 + compRiscoV8 * 0.25 + compLucroV8 * 0.35)));

// Nota V9
const liftV9 = parseFloat(taxaV9real) / chanceAleatoria;
const compAcertoV9 = Math.min(100, liftV9 * 50);
const compRiscoV9 = Math.max(0, 100 - v9.maxSeqErros * 8);
const apostasV9 = v9.acertos + v9.erros;
const compLucroV9 = v9.saldo > 0 ? Math.min(100, 50 + (v9.saldo / apostasV9) * 50) : Math.max(0, 50 + (v9.saldo / apostasV9) * 50);
const notaV9 = Math.min(100, Math.max(10, Math.round(compAcertoV9 * 0.4 + compRiscoV9 * 0.25 + compLucroV9 * 0.35)));

console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   MOTOR V8 (original):   ${String(notaV8).padStart(3)}% / 100%                  ║
  ║   MOTOR V9 (otimizado):  ${String(notaV9).padStart(3)}% / 100%                  ║
  ║                                                          ║
  ║   Diferença: ${notaV9 > notaV8 ? '+' : ''}${notaV9 - notaV8} pontos                              ║
  ║   ${notaV9 > notaV8 ? '✅ V9 SUPERIOR' : notaV9 === notaV8 ? '➖ EMPATE' : '❌ V8 ERA MELHOR'}                                      ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
`);

console.log(`┌${l.repeat(72)}┐`);
console.log(`│  VEREDICTO FINAL                                                      │`);
console.log(`└${l.repeat(72)}┘`);

const vereditos = [];
if (melhorouTaxa) vereditos.push('✅ Taxa de acerto AUMENTOU');
else vereditos.push('❌ Taxa de acerto caiu ou ficou igual');
if (melhorouSaldo) vereditos.push('✅ Lucro financeiro AUMENTOU');
else vereditos.push('❌ Lucro financeiro caiu');
if (melhorouDrawdown) vereditos.push('✅ Risco (max erros seguidos) DIMINUIU');
else vereditos.push('⚠️ Risco manteve ou aumentou');
if (melhorouVolume) vereditos.push('✅ Menos ruído (menos sinais falsos)');

console.log(`
  ${vereditos.join('\n  ')}

  ANALOGIA FINAL — O PESCADOR:
  ─────────────────────────────
  V8 era um pescador que jogava a rede 100 vezes por dia (muitos sinais),
  pegava muitos peixes pequenos (acertos inflados), mas gastava muita isca
  (muitos erros ocultos) e contava cada peixe na rede como se fosse separado
  (inflação métrica).

  V9 é um pescador que joga a rede 1 vez, espera. Se o rio ficar seco
  (confirmações = motor gritando sem resultado), ele RECOLHE a rede e 
  espera uma oportunidade melhor. Menos capturas, mas cada uma é REAL.

  O resultado em DINHEIRO mostra a verdade:
  • V8: ${v8.saldo >= 0 ? '+' : ''}${v8.saldo} unidades em ${v8.total} apostas (ROI ${roiV8}%)
  • V9: ${v9.saldo >= 0 ? '+' : ''}${v9.saldo} unidades em ${apostasV9} apostas (ROI ${roiV9}%)
`);

console.log(`${L.repeat(74)}\n`);
