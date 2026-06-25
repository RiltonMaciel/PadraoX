const fs = require('fs');
const data = fs.readFileSync('dados-novos.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num] = l.split(',');
  return parseInt(num);
}).filter(r => !isNaN(r));
rows.reverse(); // cronológico
const T = rows.length;

console.log('='.repeat(70));
console.log('  ANÁLISE: PAPEL DE CADA NÚMERO EM RELAÇÃO AO BRANCO');
console.log('  "Quais números são brancos disfarçados?"');
console.log('='.repeat(70));

// ============================================================
// TESTE 1: Quais números aparecem IMEDIATAMENTE ANTES do branco?
// Se 11 e 12 são "brancos disfarçados", eles devem aparecer 
// com frequência desproporcional nas 1-3 rodadas antes do branco
// ============================================================
console.log('\n--- 1. QUAL NUMERO SAI ANTES DO BRANCO (1-3 rodadas antes) ---');
console.log('(Se um número é "branco disfarçado", ele aparece mais antes do branco)\n');

const antesDoB = {}; // número → vezes que apareceu 1-3 antes do branco
const totalAparicoes = {}; // aparições totais de cada número
for (let i = 0; i < 15; i++) { antesDoB[i] = 0; totalAparicoes[i] = 0; }

for (let i = 0; i < T; i++) {
  totalAparicoes[rows[i]]++;
  if (rows[i] === 0 && i >= 1) {
    // Olhar 1, 2, 3 rodadas antes
    for (let j = 1; j <= 3 && i-j >= 0; j++) {
      antesDoB[rows[i-j]]++;
    }
  }
}

const totalBrancos = totalAparicoes[0];
console.log('Total de brancos: ' + totalBrancos);
console.log('\nNúmero | Apareceu antes do branco | Total aparições | % antes/total | Papel');
console.log('-'.repeat(80));

const papelAntes = [];
for (let n = 1; n <= 14; n++) {
  const antes = antesDoB[n];
  const total = totalAparicoes[n];
  const pctAntes = (antes / total * 100).toFixed(1);
  // Esperado: se random, ~3*658/10000 * total = ~19.7% das vezes um número estaria nas 3 antes
  const esperado = (3 * totalBrancos / T * 100).toFixed(1);
  papelAntes.push({ n, antes, total, pctAntes: parseFloat(pctAntes) });
}
papelAntes.sort((a, b) => b.pctAntes - a.pctAntes);
const esperadoPct = (3 * totalBrancos / T * 100).toFixed(1);
console.log('(Esperado aleatório: ~' + esperadoPct + '%)');
for (const p of papelAntes) {
  const desvio = p.pctAntes - parseFloat(esperadoPct);
  let papel = 'Neutro';
  if (desvio > 3) papel = '🔥 BRANCO DISFARÇADO';
  else if (desvio > 1.5) papel = '⚡ Tendência disfarçado';
  else if (desvio < -3) papel = '🛡️ BLOQUEADOR';
  else if (desvio < -1.5) papel = '⚡ Tendência bloqueio';
  console.log(`  ${String(p.n).padStart(2)} |    ${String(p.antes).padStart(4)}              |    ${String(p.total).padStart(4)}        |   ${String(p.pctAntes).padStart(5)}%     | ${papel}`);
}

// ============================================================
// TESTE 2: Quais números aparecem DURANTE GAPS LONGOS?
// Se um número é "usado pra segurar", aparece mais quando branco tá demorando
// ============================================================
console.log('\n\n--- 2. QUAIS NÚMEROS DOMINAM DURANTE GAPS LONGOS (>20 rodadas sem branco) ---');
console.log('(Se o sistema "segura" com certos números, eles aparecem mais em gaps)\n');

const emGapLongo = {}; // número → vezes em gap >= 20
const foraGapLongo = {}; // número → vezes em gap < 20
for (let i = 1; i <= 14; i++) { emGapLongo[i] = 0; foraGapLongo[i] = 0; }

for (let i = 0; i < T; i++) {
  if (rows[i] === 0) continue;
  // Calcular distância até próximo branco (pra trás e pra frente)
  let distAtras = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j] === 0) { distAtras = i-j; break; } }
  
  if (distAtras >= 20) {
    emGapLongo[rows[i]]++;
  } else {
    foraGapLongo[rows[i]]++;
  }
}

const totalEmGap = Object.values(emGapLongo).reduce((a,b) => a+b, 0);
const totalFora = Object.values(foraGapLongo).reduce((a,b) => a+b, 0);

console.log('Número | Em gap longo | Fora gap | % em gap | % fora gap | Desvio | Papel');
console.log('-'.repeat(90));

const papelGap = [];
for (let n = 1; n <= 14; n++) {
  const pctGap = (emGapLongo[n] / totalEmGap * 100);
  const pctFora = (foraGapLongo[n] / totalFora * 100);
  const desvio = pctGap - pctFora;
  papelGap.push({ n, emGap: emGapLongo[n], fora: foraGapLongo[n], pctGap, pctFora, desvio });
}
papelGap.sort((a, b) => b.desvio - a.desvio);

for (const p of papelGap) {
  let papel = 'Neutro';
  if (p.desvio > 1.0) papel = '🛡️ SEGURADOR (aparece mais em gaps)';
  else if (p.desvio > 0.5) papel = '⚡ Leve segurador';
  else if (p.desvio < -1.0) papel = '🔥 BRANCO PRÓXIMO (aparece menos em gaps)';
  else if (p.desvio < -0.5) papel = '⚡ Leve indicador';
  console.log(`  ${String(p.n).padStart(2)} |   ${String(p.emGap).padStart(4)}       |  ${String(p.fora).padStart(4)}    |  ${p.pctGap.toFixed(1).padStart(5)}%  |  ${p.pctFora.toFixed(1).padStart(5)}%   | ${p.desvio>0?'+':''}${p.desvio.toFixed(2).padStart(5)} | ${papel}`);
}

// ============================================================
// TESTE 3: Após cada número sair, em quantas rodadas o branco vem?
// Se 11 e 12 são "disfarçados", o branco deve vir LOGO depois deles
// ============================================================
console.log('\n\n--- 3. DISTÂNCIA MÉDIA ATÉ O BRANCO APÓS CADA NÚMERO ---');
console.log('(Se um número é "disfarçado", o branco vem mais RÁPIDO depois dele)\n');

const distAposNum = {}; // número → array de distâncias até próximo branco
for (let i = 1; i <= 14; i++) distAposNum[i] = [];

for (let i = 0; i < T - 1; i++) {
  if (rows[i] === 0 || rows[i] < 1 || rows[i] > 14) continue;
  // Encontrar próximo branco
  let dist = 0;
  for (let j = i + 1; j < T; j++) {
    dist++;
    if (rows[j] === 0) { distAposNum[rows[i]].push(dist); break; }
  }
}

console.log('Número | Dist média até branco | Mediana | Amostras | Papel');
console.log('-'.repeat(70));

const papelDist = [];
for (let n = 1; n <= 14; n++) {
  const dists = distAposNum[n].sort((a,b) => a-b);
  const media = dists.reduce((a,b) => a+b, 0) / dists.length;
  const mediana = dists[Math.floor(dists.length/2)];
  papelDist.push({ n, media, mediana, amostras: dists.length });
}
papelDist.sort((a, b) => a.media - b.media);

const mediaGeral = 15.1; // gap médio já calculado
for (const p of papelDist) {
  const diff = p.media - mediaGeral;
  let papel = 'Neutro';
  if (diff < -2) papel = '🔥 BRANCO DISFARÇADO (branco vem rápido)';
  else if (diff < -1) papel = '⚡ Leve disfarçado';
  else if (diff > 2) papel = '🛡️ BLOQUEADOR (branco demora)';
  else if (diff > 1) papel = '⚡ Leve bloqueador';
  console.log(`  ${String(p.n).padStart(2)} |       ${p.media.toFixed(1).padStart(5)}          |   ${String(p.mediana).padStart(3)}    |   ${String(p.amostras).padStart(4)}   | ${papel}`);
}

// ============================================================
// TESTE 4: ANÁLISE ESPECÍFICA 11 e 12
// Quando 11 ou 12 saem, o branco vem em até 5 rodadas com qual frequência?
// ============================================================
console.log('\n\n--- 4. FOCO: NÚMEROS 11 e 12 COMO "BRANCOS DISFARÇADOS" ---\n');

for (const target of [11, 12]) {
  let branco1 = 0, branco2 = 0, branco3 = 0, branco5 = 0, total = 0;
  for (let i = 0; i < T - 5; i++) {
    if (rows[i] === target) {
      total++;
      if (rows[i+1] === 0) branco1++;
      if (rows[i+1] === 0 || rows[i+2] === 0) branco2++;
      if (rows[i+1]===0||rows[i+2]===0||rows[i+3]===0) branco3++;
      for (let j = 1; j <= 5; j++) { if (rows[i+j]===0) { branco5++; break; } }
    }
  }
  console.log(`  Número ${target} (${total} aparições):`);
  console.log(`    Branco na PRÓXIMA rodada: ${branco1} (${(branco1/total*100).toFixed(1)}%) — esperado: 6.6%`);
  console.log(`    Branco em até 2 rodadas:  ${branco2} (${(branco2/total*100).toFixed(1)}%) — esperado: 12.8%`);
  console.log(`    Branco em até 3 rodadas:  ${branco3} (${(branco3/total*100).toFixed(1)}%) — esperado: 18.7%`);
  console.log(`    Branco em até 5 rodadas:  ${branco5} (${(branco5/total*100).toFixed(1)}%) — esperado: 29.5%`);
  console.log('');
}

// Comparar com TODOS os números
console.log('  COMPARAÇÃO — Após cada número, branco em até 3 rodadas:');
console.log('  Número | % branco em 3 | Desvio do esperado (18.7%)');
const ranker = [];
for (let n = 1; n <= 14; n++) {
  let b3 = 0, tot = 0;
  for (let i = 0; i < T - 3; i++) {
    if (rows[i] === n) {
      tot++;
      if (rows[i+1]===0||rows[i+2]===0||rows[i+3]===0) b3++;
    }
  }
  const pct = b3/tot*100;
  ranker.push({n, pct, tot, b3});
}
ranker.sort((a,b) => b.pct - a.pct);
for (const r of ranker) {
  const diff = r.pct - 18.7;
  const mark = diff > 2 ? ' 🔥' : diff < -2 ? ' 🛡️' : '';
  console.log(`    ${String(r.n).padStart(2)}: ${r.pct.toFixed(1)}% (${r.b3}/${r.tot})${mark}`);
}

// ============================================================
// TESTE 5: SEQUENCIAS — 11 seguido de 12 ou vice-versa
// ============================================================
console.log('\n\n--- 5. SEQUÊNCIAS ESPECÍFICAS ---\n');

const seqs = [
  {nome: '11→12', a:11, b:12},
  {nome: '12→11', a:12, b:11},
  {nome: '11→12 (adj)', check: (i) => rows[i]===11 && rows[i+1]===12},
  {nome: '12→11 (adj)', check: (i) => rows[i]===12 && rows[i+1]===11},
];

// 11 e 12 consecutivos → branco em até 5?
let seq1112_ap = 0, seq1112_ac = 0;
for (let i = 0; i < T - 6; i++) {
  if ((rows[i]===11 && rows[i+1]===12) || (rows[i]===12 && rows[i+1]===11)) {
    seq1112_ap++;
    for (let j = 2; j <= 5; j++) { if (rows[i+j]===0) { seq1112_ac++; break; } }
  }
}
console.log(`  11 e 12 CONSECUTIVOS → branco em até 5: ${seq1112_ac}/${seq1112_ap} (${(seq1112_ac/seq1112_ap*100).toFixed(1)}%) — esperado: ~26%`);

// Pelo menos um 11 E um 12 nas últimas 4
let par1112_ap = 0, par1112_ac = 0;
for (let i = 4; i < T; i++) {
  const w = [rows[i-1], rows[i-2], rows[i-3], rows[i-4]];
  if (w.includes(11) && w.includes(12)) {
    par1112_ap++;
    if (rows[i] === 0) par1112_ac++;
  }
}
console.log(`  Par 11+12 nas últimas 4 → branco AGORA: ${par1112_ac}/${par1112_ap} (${(par1112_ac/par1112_ap*100).toFixed(1)}%) — esperado: 6.6%`);

// ============================================================
// TESTE 6: RESUMO FINAL — CLASSIFICAÇÃO DE CADA NÚMERO
// ============================================================
console.log('\n\n' + '='.repeat(70));
console.log('  CLASSIFICAÇÃO FINAL DE CADA NÚMERO');
console.log('='.repeat(70));
console.log('\nBaseado em 3 critérios: (1) frequência antes do branco, (2) presença em gaps, (3) dist até branco\n');

for (let n = 1; n <= 14; n++) {
  const antes = papelAntes.find(p => p.n === n);
  const gap = papelGap.find(p => p.n === n);
  const dist = papelDist.find(p => p.n === n);
  
  let score = 0;
  // Critério 1: aparece antes do branco mais que esperado
  const desvioAntes = antes.pctAntes - parseFloat(esperadoPct);
  if (desvioAntes > 1.5) score += 2;
  else if (desvioAntes > 0.5) score += 1;
  else if (desvioAntes < -1.5) score -= 2;
  else if (desvioAntes < -0.5) score -= 1;
  
  // Critério 2: aparece MENOS em gaps longos (= branco próximo)
  if (gap.desvio < -0.5) score += 1;
  else if (gap.desvio > 0.5) score -= 1;
  
  // Critério 3: distância média menor que geral
  const diffDist = dist.media - mediaGeral;
  if (diffDist < -1) score += 2;
  else if (diffDist < 0) score += 1;
  else if (diffDist > 1) score -= 2;
  else if (diffDist > 0) score -= 1;
  
  let classificacao = '';
  if (score >= 3) classificacao = '🔥🔥 BRANCO DISFARÇADO FORTE';
  else if (score >= 2) classificacao = '🔥 BRANCO DISFARÇADO';
  else if (score >= 1) classificacao = '⚡ Tendência a preceder branco';
  else if (score <= -3) classificacao = '🛡️🛡️ BLOQUEADOR FORTE';
  else if (score <= -2) classificacao = '🛡️ BLOQUEADOR';
  else if (score <= -1) classificacao = '⚡ Tendência a bloquear branco';
  else classificacao = '➖ NEUTRO';
  
  console.log(`  ${String(n).padStart(2)}: Score ${score>=0?'+':''}${score} → ${classificacao}`);
  console.log(`      (antes: ${desvioAntes>0?'+':''}${desvioAntes.toFixed(1)}% | gap: ${gap.desvio>0?'+':''}${gap.desvio.toFixed(2)} | dist: ${diffDist>0?'+':''}${diffDist.toFixed(1)})`);
}
