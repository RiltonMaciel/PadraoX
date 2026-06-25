const XLSX = require('xlsx');
const path = require('path');

// ========== CARREGAR PLANILHA (4) ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (4).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);

console.log(`Colunas: ${Object.keys(raw[0]).join(', ')}`);
console.log(`Linhas raw: ${raw.length}`);

// Tentar também a planilha (3) para ter mais dados
let raw2 = [];
try {
  const wb2 = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (3).xlsx'));
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  raw2 = XLSX.utils.sheet_to_json(ws2);
  console.log(`Planilha (3): ${raw2.length} linhas`);
} catch(e) { console.log('Planilha (3) não encontrada'); }

function extractNums(rawData) {
  return rawData.map(r => {
    const keys = Object.keys(r);
    const numKey = keys.find(k => /n[uú]mero|number|num|result/i.test(k)) || keys[0];
    return parseInt(r[numKey]);
  }).filter(n => !isNaN(n) && n >= 0 && n <= 14);
}

// Combinar: planilha 3 (mais antiga) + planilha 4 (mais recente)
const nums3 = extractNums(raw2);
const nums4 = extractNums(raw);

// Planilha vem do mais recente ao topo — reverter para cronológico
nums3.reverse();
nums4.reverse();

// Se planilha 3 tem dados mais antigos, concatenar
let allRows;
if (nums3.length > 0) {
  // Verificar se há overlap — usar apenas dados não duplicados
  allRows = [...nums3, ...nums4];
  console.log(`\nCombinado: ${nums3.length} (plan3) + ${nums4.length} (plan4) = ${allRows.length} total`);
} else {
  allRows = nums4;
}

console.log(`\nTotal números: ${allRows.length}`);
console.log(`Primeiros 20: [${allRows.slice(0, 20).join(',')}]`);
console.log(`Últimos 20: [${allRows.slice(-20).join(',')}]`);
console.log(`Brancos total: ${allRows.filter(n => n === 0).length} (${(allRows.filter(n => n === 0).length / allRows.length * 100).toFixed(2)}%)`);

// ========== MOTOR ADAPTATIVO (cópia idêntica do server.js) ==========
class MotorAdaptativo {
  constructor(historico, opcoes = {}) {
    this.historico = historico;
    this.janela = opcoes.janela || 300;
    this.zMinimo = opcoes.zMinimo || 1.5;
    this.amostraMinima = opcoes.amostraMinima || 10;
    this.padroesAtivos = null;
    this.ultimaCalibracao = null;
  }

  calibrar() {
    const h = this.historico;
    const T = h.length;
    const inicio = Math.max(0, T - this.janela);
    const janela = h.slice(inicio);
    const J = janela.length;
    const brancos = janela.filter(n => n === 0).length;
    const baseRate = brancos / J;
    const padroes = [];

    for (let N = 0; N <= 14; N++) {
      let hits = 0, total = 0;
      for (let i = 0; i < J - 1; i++) {
        if (janela[i] === N) { total++; if (janela[i + 1] === 0) hits++; }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo)
          padroes.push({ tipo: 'apos_numero', parametro: N, taxa: hits / total, z, n: total, hits, descricao: `Após ${N}`, direcao: z > 0 ? 'positivo' : 'negativo' });
      }
    }

    for (let N = 1; N <= 14; N++) {
      let hits = 0, total = 0;
      for (let i = 3; i < J; i++) {
        const l3 = [janela[i - 1], janela[i - 2], janela[i - 3]];
        if (l3.filter(x => x === N).length >= 2) { total++; if (janela[i] === 0) hits++; }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo)
          padroes.push({ tipo: 'repeticao', parametro: N, taxa: hits / total, z, n: total, hits, descricao: `Rep ${N} (2x/3)`, direcao: z > 0 ? 'positivo' : 'negativo' });
      }
    }

    for (let N = 0; N <= 14; N++) {
      for (let M = N + 1; M <= 14; M++) {
        let hits = 0, total = 0;
        for (let i = 4; i < J; i++) {
          const l4 = [janela[i - 1], janela[i - 2], janela[i - 3], janela[i - 4]];
          if (l4.includes(N) && l4.includes(M)) { total++; if (janela[i] === 0) hits++; }
        }
        if (total >= this.amostraMinima) {
          const z = this._zScore(hits, total, baseRate);
          if (Math.abs(z) >= this.zMinimo)
            padroes.push({ tipo: 'par', parametro: [N, M], taxa: hits / total, z, n: total, hits, descricao: `Par ${N}+${M}`, direcao: z > 0 ? 'positivo' : 'negativo' });
        }
      }
    }

    const dists = new Array(J).fill(999);
    let lastB = -1;
    for (let i = inicio - 1; i >= 0; i--) { if (h[i] === 0) { lastB = i - inicio; break; } }
    for (let i = 0; i < J; i++) { if (janela[i] === 0) lastB = i; dists[i] = lastB >= 0 ? i - lastB : 999; }

    const faixas = [
      { min: 15, max: 24, label: 'Dist 15-24' },
      { min: 25, max: 34, label: 'Dist 25-34' },
      { min: 35, max: Infinity, label: 'Dist 35+' }
    ];
    for (const f of faixas) {
      let hits = 0, total = 0;
      for (let i = 0; i < J - 1; i++) {
        if (dists[i] >= f.min && dists[i] <= f.max) { total++; if (janela[i + 1] === 0) hits++; }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo)
          padroes.push({ tipo: 'distancia', parametro: f, taxa: hits / total, z, n: total, hits, descricao: f.label, direcao: z > 0 ? 'positivo' : 'negativo' });
      }
    }

    for (const seqLen of [3, 4, 5]) {
      let hits = 0, total = 0;
      for (let i = seqLen; i < J; i++) {
        const prev = [];
        for (let j = 1; j <= seqLen; j++) prev.push(janela[i - j]);
        if (prev.every(n => n === 0)) continue;
        const cores = prev.map(n => n === 0 ? 'B' : n <= 7 ? 'V' : 'P');
        if (cores.every(c => c === cores[0]) && cores[0] !== 'B') { total++; if (janela[i] === 0) hits++; }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo)
          padroes.push({ tipo: 'seq_cor', parametro: seqLen, taxa: hits / total, z, n: total, hits, descricao: `Seq ${seqLen}x cor`, direcao: z > 0 ? 'positivo' : 'negativo' });
      }
    }

    this.padroesAtivos = padroes.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    this.ultimaCalibracao = { janela: J, baseRate, brancos, padroes: padroes.length, timestamp: Date.now() };
    return this.padroesAtivos;
  }

  avaliar() {
    if (!this.padroesAtivos) this.calibrar();
    const h = this.historico;
    const T = h.length;
    const sinaisAtivos = [];
    let scorePosi = 0, scoreNeg = 0;

    for (const p of this.padroesAtivos) {
      let ativo = false;
      if (p.tipo === 'apos_numero' && h[T - 1] === p.parametro) ativo = true;
      if (p.tipo === 'repeticao') {
        const l3 = h.slice(T - 3);
        if (l3.filter(x => x === p.parametro).length >= 2) ativo = true;
      }
      if (p.tipo === 'par') {
        const l4 = h.slice(T - 4);
        if (l4.includes(p.parametro[0]) && l4.includes(p.parametro[1])) ativo = true;
      }
      if (p.tipo === 'distancia') {
        let dist = 0;
        for (let i = T - 1; i >= 0; i--) {
          if (h[i] === 0) { dist = T - 1 - i; break; }
          dist = T - i;
        }
        if (dist >= p.parametro.min && dist <= p.parametro.max) ativo = true;
      }
      if (p.tipo === 'seq_cor') {
        const prev = h.slice(T - p.parametro);
        const cores = prev.map(n => n === 0 ? 'B' : n <= 7 ? 'V' : 'P');
        if (cores.every(c => c === cores[0]) && cores[0] !== 'B') ativo = true;
      }

      if (ativo) {
        sinaisAtivos.push(p);
        if (p.z > 0) scorePosi += p.z / 1.96;
        else scoreNeg += Math.abs(p.z) / 1.96;
      }
    }

    let distBranco = 0;
    for (let i = T - 1; i >= 0; i--) {
      if (h[i] === 0) { distBranco = T - 1 - i; break; }
      distBranco = T - i;
    }
    let distBonus = 0;
    if (distBranco >= 36) distBonus = 2.0;
    else if (distBranco >= 26) distBonus = 1.0;
    else if (distBranco >= 19) distBonus = 0.3;
    else if (distBranco >= 13) distBonus = -0.8; // zona morta
    else if (distBranco >= 8) distBonus = 0.2;
    else if (distBranco >= 4) distBonus = -0.3;
    else distBonus = 0.1;

    const score = scorePosi - scoreNeg + distBonus;

    let nivel;
    if (sinaisAtivos.length >= 2 && score >= 1.5) nivel = 'FORTE';
    else if (sinaisAtivos.length >= 1 && score >= 0.5) nivel = 'MEDIO';
    else if (score > 0 || distBranco >= 26) nivel = 'FRACO';
    else nivel = 'FRIO';

    return { nivel, score: Math.round(score * 100) / 100, sinaisAtivos, distBranco };
  }

  _zScore(obs, n, p) {
    if (n === 0 || p === 0 || p === 1) return 0;
    return (obs / n - p) / Math.sqrt(p * (1 - p) / n);
  }
}

// ========== WALK-FORWARD VALIDATION ==========
// Simula uso real: calibra com janela passada, avalia, e verifica se próximo é branco
console.log('\n' + '='.repeat(60));
console.log('VALIDAÇÃO WALK-FORWARD — Motor v5');
console.log('='.repeat(60));

const WARMUP = 300; // precisa de pelo menos 300 para calibrar
const RECALIB_INTERVAL = 30;

const results = { FORTE: { total: 0, acertos: 0 }, MEDIO: { total: 0, acertos: 0 }, FRACO: { total: 0, acertos: 0 }, FRIO: { total: 0, acertos: 0 } };
let totalApostas = 0, totalAcertos = 0;
let rodadasDesdeCalib = 999;
let motor = null;

// Testar últimas N rodadas (excluindo warmup)
const testStart = WARMUP;
const testEnd = allRows.length;

for (let i = testStart; i < testEnd - 1; i++) {
  const histAtual = allRows.slice(0, i + 1); // até posição i (inclusive)

  if (!motor || rodadasDesdeCalib >= RECALIB_INTERVAL) {
    motor = new MotorAdaptativo(histAtual, { janela: 300, zMinimo: 1.5, amostraMinima: 10 });
    motor.calibrar();
    rodadasDesdeCalib = 0;
  } else {
    motor.historico = histAtual;
  }

  const sinal = motor.avaliar();
  const proximo = allRows[i + 1]; // número que vai sair
  const acertou = proximo === 0;

  results[sinal.nivel].total++;
  if (acertou) results[sinal.nivel].acertos++;

  if (sinal.nivel === 'FORTE' || sinal.nivel === 'MEDIO') {
    totalApostas++;
    if (acertou) totalAcertos++;
  }

  rodadasDesdeCalib++;
}

const totalTestes = testEnd - testStart - 1;
const baseRate = allRows.filter(n => n === 0).length / allRows.length;

console.log(`\nRodadas testadas: ${totalTestes}`);
console.log(`Taxa base branco: ${(baseRate * 100).toFixed(2)}%`);
console.log(`\n--- RESULTADOS POR NÍVEL ---`);

for (const nivel of ['FORTE', 'MEDIO', 'FRACO', 'FRIO']) {
  const r = results[nivel];
  if (r.total === 0) { console.log(`${nivel}: 0 sinais`); continue; }
  const prec = r.acertos / r.total;
  const roi = (prec * 14 - 1) * 100; // payout 14x no branco
  const lift = prec / baseRate;
  console.log(`${nivel}: ${r.total} sinais | ${r.acertos} acertos | Precisão ${(prec * 100).toFixed(2)}% | ROI ${roi.toFixed(1)}% | Lift ${lift.toFixed(2)}x vs base`);
}

console.log(`\n--- APOSTAS (FORTE + MEDIO) ---`);
if (totalApostas > 0) {
  const precAposta = totalAcertos / totalApostas;
  const roiAposta = (precAposta * 14 - 1) * 100;
  console.log(`Total: ${totalApostas} apostas | ${totalAcertos} acertos | Precisão: ${(precAposta * 100).toFixed(2)}% | ROI: ${roiAposta.toFixed(1)}%`);
  console.log(`Cobertura: ${(totalApostas / totalTestes * 100).toFixed(1)}% das rodadas`);
} else {
  console.log('Nenhuma aposta feita (motor muito restritivo?)');
}

// Análise por blocos de 500
console.log(`\n--- ESTABILIDADE (blocos de 500 rodadas) ---`);
const blockSize = 500;
for (let b = testStart; b < testEnd - blockSize; b += blockSize) {
  let bApostas = 0, bAcertos = 0, bForte = 0, bFtAcert = 0;
  let localMotor = null;
  let localCalib = 999;

  for (let i = b; i < b + blockSize && i < testEnd - 1; i++) {
    const histB = allRows.slice(0, i + 1);
    if (!localMotor || localCalib >= RECALIB_INTERVAL) {
      localMotor = new MotorAdaptativo(histB, { janela: 300, zMinimo: 1.5, amostraMinima: 10 });
      localMotor.calibrar();
      localCalib = 0;
    } else {
      localMotor.historico = histB;
    }
    const s = localMotor.avaliar();
    const prox = allRows[i + 1];
    const ac = prox === 0;

    if (s.nivel === 'FORTE' || s.nivel === 'MEDIO') { bApostas++; if (ac) bAcertos++; }
    if (s.nivel === 'FORTE') { bForte++; if (ac) bFtAcert++; }
    localCalib++;
  }

  const blockNum = Math.floor((b - testStart) / blockSize) + 1;
  if (bApostas > 0) {
    const bp = bAcertos / bApostas;
    console.log(`Bloco ${blockNum} (pos ${b}-${b + blockSize}): ${bApostas} apostas, prec ${(bp * 100).toFixed(1)}%, ROI ${((bp * 14 - 1) * 100).toFixed(0)}%${bForte > 0 ? ` | FORTE: ${bForte} (${(bFtAcert/bForte*100).toFixed(1)}%)` : ''}`);
  } else {
    console.log(`Bloco ${blockNum}: sem apostas`);
  }
}

// Análise: motor obsoleto?
console.log(`\n--- VEREDICTO ---`);
const precForte = results.FORTE.total > 0 ? results.FORTE.acertos / results.FORTE.total : 0;
const precMedio = results.MEDIO.total > 0 ? results.MEDIO.acertos / results.MEDIO.total : 0;
const roiForte = (precForte * 14 - 1) * 100;
const roiMedio = (precMedio * 14 - 1) * 100;

if (roiForte > 30 && precForte > baseRate * 1.5) {
  console.log('✅ MOTOR VIVO — FORTE com ROI positivo e precisão > 1.5x base');
} else if (roiForte > 0) {
  console.log('⚠️ MOTOR FRACO — FORTE com ROI marginal, considerar ajustes');
} else {
  console.log('❌ MOTOR OBSOLETO — FORTE com ROI negativo, necessita recalibração total');
}

if (roiMedio > 0) {
  console.log('✅ MEDIO lucrativo');
} else {
  console.log('⚠️ MEDIO não lucrativo — filtro precisa ser mais restritivo');
}
