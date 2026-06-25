const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (12).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const dados = [];
for (let i = rows.length - 1; i >= 2; i--) {
  const row = rows[i];
  if (!row || row.length < 2) continue;
  const num = parseInt(row[0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}

const h = dados, T = h.length;
const totalBrancos = h.filter(n => n === 0).length;
const baseRate = totalBrancos / T;

// ═══════ MOTOR V11 — Cópia exata do server.js ═══════
const PARES_HOT = {
  '8,5': 2.5, '3,11': 2.3, '1,10': 2.0, '10,8': 1.8, '4,0': 1.8,
};
const PARES_VETO = new Set(['7,8','2,7','10,0','12,5','8,11','6,14','5,1','11,5','12,12','12,6']);
const NUMS_GATILHO = { 8: 0.5, 10: 0.5 };
const TRIPLAS_HOT = {};

function boostCondicionalV11(historico, endIdx) {
  let bonus = 0;
  const boostMotivos = [];
  let antiSinal = false;

  let streakPreto = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] >= 8 && historico[i] <= 14) streakPreto++;
    else break;
  }
  if (streakPreto >= 5) { bonus += 3.0; boostMotivos.push('5+PRETO ★★★ +3.0'); }
  else if (streakPreto >= 4) { bonus += 2.0; boostMotivos.push('4+PRETO ★★ +2.0'); }
  else if (streakPreto >= 3) { bonus += 1.0; boostMotivos.push('3+PRETO ★ +1.0'); }

  let streakVerm = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] >= 1 && historico[i] <= 7) streakVerm++;
    else break;
  }
  if (streakVerm >= 3) { antiSinal = true; boostMotivos.push('3+VERM ANTI-SINAL'); }

  let dist = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (historico[i] === 0) { dist = endIdx - i; break; }
    dist = endIdx - i + 1;
  }
  if (dist >= 50) { bonus += 1.5; boostMotivos.push('Dist' + dist + ' +1.5'); }
  else if (dist >= 35) { bonus += 0.8; boostMotivos.push('Dist' + dist + ' +0.8'); }

  return { bonus, motivos: boostMotivos, antiSinal };
}

function calcScore(endIdx) {
  if (endIdx < 1) return { score: 0, veto: false, par: null, gatilho: false, boosts: [], antiSinal: false };
  const penultimo = h[endIdx - 1];
  const ultimo = h[endIdx];
  const parKey = `${penultimo},${ultimo}`;

  if (PARES_VETO.has(parKey)) {
    return { score: -1, veto: true, par: parKey, gatilho: false, boosts: ['VETO'], antiSinal: false };
  }

  let score = 0;
  let gatilho = false;
  const boosts = [];

  if (PARES_HOT[parKey]) {
    score = PARES_HOT[parKey];
    boosts.push('Par HOT (' + parKey + ') +' + PARES_HOT[parKey]);
  }

  if (NUMS_GATILHO[ultimo] !== undefined) {
    gatilho = true;
    const bonus = score < 1.0 ? NUMS_GATILHO[ultimo] : Math.round(NUMS_GATILHO[ultimo] * 0.3 * 100) / 100;
    score += bonus;
    boosts.push('Gatilho ' + ultimo + ' +' + bonus);
  }

  if (endIdx >= 2) {
    const triplaKey = h[endIdx - 2] + ',' + penultimo + ',' + ultimo;
    if (TRIPLAS_HOT[triplaKey]) {
      score += TRIPLAS_HOT[triplaKey];
      boosts.push('Tripla +' + TRIPLAS_HOT[triplaKey]);
    }
  }

  const v11 = boostCondicionalV11(h, endIdx);
  if (v11.antiSinal) {
    return { score: -1, veto: true, par: parKey, gatilho, boosts: ['ANTI-SINAL: 3+VERM'], antiSinal: true };
  }
  if (v11.bonus > 0) {
    score += v11.bonus;
    for (const m of v11.motivos) boosts.push(m);
  }

  return { score: Math.round(score * 100) / 100, veto: false, par: parKey, gatilho, boosts, antiSinal: false };
}

function getNivel(score) {
  if (score >= 2.0) return 'FORTE';
  if (score >= 1.3) return 'MEDIO';
  if (score > 0) return 'FRACO';
  return 'FRIO';
}

// ═══════ CURADORIA: Simular motor sobre as 1000 rodadas ═══════
const JANELA = 5;

console.log('═'.repeat(70));
console.log('  CURADORIA MOTOR V11 — 1000 rodadas recentes (25/05/2026)');
console.log(`  Base: ${T} rodadas | Brancos: ${totalBrancos} | Taxa: ${(baseRate*100).toFixed(2)}%`);
console.log(`  Janela: ${JANELA} casas`);
console.log('═'.repeat(70));

// Simular sinal em cada posição
let stats = { FORTE: {sinais:0,acertos:0}, MEDIO: {sinais:0,acertos:0}, FRACO: {sinais:0,acertos:0}, FRIO: {sinais:0,acertos:0}, VETO: {sinais:0,acertos:0} };
let totalSinais = 0, totalAcertos = 0;
let totalApostavel = 0, totalAcertosApostavel = 0;

// Detalhes dos últimos sinais FORTE/MEDIO
const detalhes = [];

for (let i = 2; i < T - JANELA; i++) {
  const result = calcScore(i);
  const nivel = result.veto ? 'VETO' : getNivel(result.score);

  // Verificar se branco sai dentro da janela
  let acertou = false;
  let casaPagou = 0;
  for (let j = 1; j <= JANELA; j++) {
    if (h[i + j] === 0) { acertou = true; casaPagou = j; break; }
  }

  stats[nivel].sinais++;
  if (acertou) stats[nivel].acertos++;
  totalSinais++;
  if (acertou) totalAcertos++;

  // "Apostável" = FORTE ou MEDIO (score >= 1.3)
  if (nivel === 'FORTE' || nivel === 'MEDIO') {
    totalApostavel++;
    if (acertou) totalAcertosApostavel++;
    detalhes.push({ pos: i, nivel, score: result.score, par: result.par, boosts: result.boosts, acertou, casaPagou });
  }
}

console.log('\n▓ RESULTADO POR NÍVEL:');
console.log('  ' + '─'.repeat(60));
console.log('  Nível  | Sinais | Acertos | Taxa    | vs base | ROI');
console.log('  ' + '─'.repeat(60));

for (const [nivel, s] of Object.entries(stats)) {
  if (s.sinais === 0) continue;
  const taxa = s.acertos / s.sinais;
  const diff = (taxa - baseRate * JANELA) * 100;
  const roi = ((taxa * 14) - 1) * 100; // paga 14x
  const mark = taxa > 0.3 ? '🔥' : taxa > 0.15 ? '✓' : '';
  console.log(`  ${nivel.padEnd(6)} | ${String(s.sinais).padStart(5)}  | ${String(s.acertos).padStart(5)}   | ${(taxa*100).toFixed(1)}%   | ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp  | ${roi >= 0 ? '+' : ''}${roi.toFixed(0)}% ${mark}`);
}

const taxaApostavel = totalApostavel > 0 ? totalAcertosApostavel / totalApostavel : 0;
const roiApostavel = ((taxaApostavel * 14) - 1) * 100;

console.log('  ' + '─'.repeat(60));
console.log(`  TOTAL APOSTÁVEL (FORTE+MEDIO): ${totalApostavel} sinais, ${totalAcertosApostavel} acertos`);
console.log(`  TAXA: ${(taxaApostavel*100).toFixed(1)}% | ROI: ${roiApostavel >= 0 ? '+' : ''}${roiApostavel.toFixed(0)}%`);

// Comparar com apostar em TUDO
const taxaTudo = totalAcertos / totalSinais;
console.log(`\n  Comparação: apostar em TUDO = ${(taxaTudo*100).toFixed(1)}% (ROI ${(((taxaTudo*14)-1)*100).toFixed(0)}%)`);

// ═══════ DETALHE: últimos 20 sinais FORTE/MEDIO ═══════
console.log('\n▓ ÚLTIMOS 20 SINAIS FORTE/MEDIO:');
console.log('  ' + '─'.repeat(65));
console.log('  Pos  | Nível  | Score | Par    | Boosts                      | Resultado');
console.log('  ' + '─'.repeat(65));

const ultimos20 = detalhes.slice(-20);
ultimos20.forEach(d => {
  const resultado = d.acertou ? `✅ casa ${d.casaPagou}` : '❌ ERROU';
  const boostStr = d.boosts.slice(0, 2).join(', ').substring(0, 28);
  console.log(`  ${String(d.pos).padStart(4)} | ${d.nivel.padEnd(6)} | ${d.score.toFixed(1).padStart(4)}  | ${d.par.padEnd(6)} | ${boostStr.padEnd(28)} | ${resultado}`);
});

// ═══════ ACERTIVIDADE POR CASA (1 a 5) ═══════
console.log('\n▓ DISTRIBUIÇÃO DE ACERTOS POR CASA (só FORTE+MEDIO):');
console.log('  ' + '─'.repeat(40));
const porCasa = [0, 0, 0, 0, 0];
detalhes.filter(d => d.acertou).forEach(d => { porCasa[d.casaPagou - 1]++; });
const totalAcertosD = detalhes.filter(d => d.acertou).length;
for (let c = 0; c < 5; c++) {
  const pct = totalAcertosD > 0 ? (porCasa[c] / totalAcertosD * 100) : 0;
  const bar = '█'.repeat(Math.round(pct / 2));
  console.log(`  Casa ${c+1}: ${String(porCasa[c]).padStart(3)} acertos (${pct.toFixed(0)}%) ${bar}`);
}

// ═══════ SIMULAÇÃO DE BANCA ═══════
console.log('\n▓ SIMULAÇÃO DE BANCA (aposta flat 1u em FORTE+MEDIO):');
let banca = 100;
let bancaMin = 100, bancaMax = 100;
let seqPerda = 0, maxSeqPerda = 0;
const bancaHist = [100];

detalhes.forEach(d => {
  if (d.acertou) {
    banca += 13; // paga 14x, lucro = 13
    seqPerda = 0;
  } else {
    banca -= 1;
    seqPerda++;
    if (seqPerda > maxSeqPerda) maxSeqPerda = seqPerda;
  }
  if (banca < bancaMin) bancaMin = banca;
  if (banca > bancaMax) bancaMax = banca;
  bancaHist.push(banca);
});

console.log(`  Banca inicial: 100u`);
console.log(`  Banca final: ${banca}u (${banca >= 100 ? '+' : ''}${banca - 100}u)`);
console.log(`  Banca mínima: ${bancaMin}u | Máxima: ${bancaMax}u`);
console.log(`  Max sequência de perdas: ${maxSeqPerda}`);
console.log(`  Total apostas: ${detalhes.length} | Lucro por aposta: ${((banca-100)/detalhes.length).toFixed(2)}u`);

console.log('\n' + '═'.repeat(70));
console.log('  FIM DA CURADORIA V11');
console.log('═'.repeat(70));
