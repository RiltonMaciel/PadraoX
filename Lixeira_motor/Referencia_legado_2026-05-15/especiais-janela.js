const fs = require('fs');
const data = fs.readFileSync('dados-novos.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num] = l.split(',');
  return parseInt(num);
}).filter(r => !isNaN(r));
rows.reverse(); // cronológico
const T = rows.length;

console.log('='.repeat(70));
console.log('  ANÁLISE: ESPECIAIS (4, 6, 14) — JANELA DE 4 CASAS');
console.log('  "O que acontece nas 4 rodadas depois de um especial?"');
console.log('='.repeat(70));

const especiais = [4, 6, 14];

// ============================================================
// TESTE 1: Taxa de branco nas 4 casas após cada especial
// ============================================================
console.log('\n--- 1. BRANCO APARECE DENTRO DA JANELA DE 4? ---\n');

for (const esp of especiais) {
  let janelas = 0, brancoEm1 = 0, brancoEm2 = 0, brancoEm3 = 0, brancoEm4 = 0, brancoTotal = 0;
  for (let i = 0; i < T - 4; i++) {
    if (rows[i] === esp) {
      janelas++;
      let achou = false;
      for (let j = 1; j <= 4; j++) {
        if (rows[i+j] === 0) {
          if (j === 1) brancoEm1++;
          if (j === 2) brancoEm2++;
          if (j === 3) brancoEm3++;
          if (j === 4) brancoEm4++;
          if (!achou) { brancoTotal++; achou = true; }
        }
      }
    }
  }
  const esperado = (1 - Math.pow(1-0.0658, 4)) * 100; // prob de pelo menos 1 branco em 4
  console.log(`  ESPECIAL ${esp}:`);
  console.log(`    Janelas abertas: ${janelas}`);
  console.log(`    Branco em pelo menos 1 das 4: ${brancoTotal} (${(brancoTotal/janelas*100).toFixed(1)}%) — esperado: ${esperado.toFixed(1)}%`);
  console.log(`      Casa 1: ${brancoEm1} (${(brancoEm1/janelas*100).toFixed(1)}%)`);
  console.log(`      Casa 2: ${brancoEm2} (${(brancoEm2/janelas*100).toFixed(1)}%)`);
  console.log(`      Casa 3: ${brancoEm3} (${(brancoEm3/janelas*100).toFixed(1)}%)`);
  console.log(`      Casa 4: ${brancoEm4} (${(brancoEm4/janelas*100).toFixed(1)}%)`);
  console.log('');
}

// Todos especiais juntos
let jTotal = 0, bTotal = 0;
for (let i = 0; i < T - 4; i++) {
  if (especiais.includes(rows[i])) {
    jTotal++;
    for (let j = 1; j <= 4; j++) { if (rows[i+j] === 0) { bTotal++; break; } }
  }
}
console.log(`  TODOS ESPECIAIS (4+6+14):`);
console.log(`    Janelas: ${jTotal}, Branco dentro: ${bTotal} (${(bTotal/jTotal*100).toFixed(1)}%)`);
console.log(`    Esperado aleatório: ${(1 - Math.pow(1-0.0658, 4) * 100).toFixed(1)}... ~24.0%`);

// ============================================================
// TESTE 2: QUAIS NÚMEROS DENTRO DA JANELA INDICAM BRANCO?
// Quando especial abre janela E número X aparece na janela → branco vem?
// ============================================================
console.log('\n\n--- 2. DENTRO DA JANELA DO ESPECIAL: QUEM AVISA BRANCO? ---');
console.log('(Especial sai, depois vem número X, depois branco vem ou não)\n');

// Para cada especial, ver os números que aparecem nas posições 1-3 da janela
// e se branco veio na posição seguinte (dentro da janela)
const avisos = {}; // {numero: {apareceu, brancoPosDepois}}
for (let n = 1; n <= 14; n++) avisos[n] = {ap: 0, brancoDepois: 0};

for (let i = 0; i < T - 5; i++) {
  if (!especiais.includes(rows[i])) continue;
  // Janela: posições i+1, i+2, i+3, i+4
  for (let pos = 1; pos <= 3; pos++) {
    const num = rows[i + pos];
    if (num === 0 || num < 1 || num > 14) continue;
    avisos[num].ap++;
    // Branco na(s) posição(ões) seguinte(s) dentro da janela?
    for (let k = pos + 1; k <= 4; k++) {
      if (rows[i + k] === 0) { avisos[num].brancoDepois++; break; }
    }
  }
}

console.log('Dentro da janela de especial, após número X aparecer:');
console.log('Número | Vezes na janela | Branco depois (na janela) | Taxa');
console.log('-'.repeat(70));
const ranking = [];
for (let n = 1; n <= 14; n++) {
  const taxa = avisos[n].ap > 0 ? avisos[n].brancoDepois / avisos[n].ap * 100 : 0;
  ranking.push({n, ...avisos[n], taxa});
}
ranking.sort((a, b) => b.taxa - a.taxa);
for (const r of ranking) {
  const mark = r.taxa > 10 ? ' 🔥 AVISADOR' : r.taxa < 4 ? ' 🛡️ BLOQUEADOR' : '';
  console.log(`    ${String(r.n).padStart(2)} |      ${String(r.ap).padStart(4)}       |         ${String(r.brancoDepois).padStart(4)}            | ${r.taxa.toFixed(1)}%${mark}`);
}

// ============================================================
// TESTE 3: NÚMERO IMEDIATO APÓS ESPECIAL → branco na sequência?
// Especial → X → branco? Qual X avisa?
// ============================================================
console.log('\n\n--- 3. ESPECIAL → NÚMERO X → BRANCO? (X como predecessor dentro da janela) ---\n');

const predJanela = {};
for (let n = 1; n <= 14; n++) predJanela[n] = {ap: 0, branco: 0};

for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  const proximo = rows[i + 1];
  if (proximo === 0 || proximo < 1 || proximo > 14) continue;
  predJanela[proximo].ap++;
  // Branco em i+2, i+3 ou i+4?
  for (let j = 2; j <= 4; j++) {
    if (rows[i + j] === 0) { predJanela[proximo].branco++; break; }
  }
}

console.log('Especial(4/6/14) → X → branco em até 3 casas depois?');
console.log('Núm X | Vezes como 1o após especial | Branco em seguida | Taxa');
console.log('-'.repeat(70));
const rank2 = [];
for (let n = 1; n <= 14; n++) {
  const taxa = predJanela[n].ap > 0 ? predJanela[n].branco / predJanela[n].ap * 100 : 0;
  rank2.push({n, ...predJanela[n], taxa});
}
rank2.sort((a, b) => b.taxa - a.taxa);
for (const r of rank2) {
  const mark = r.taxa > 12 ? ' 🔥 AVISADOR' : r.taxa < 5 ? ' 🛡️ BLOQUEADOR' : '';
  console.log(`    ${String(r.n).padStart(2)} |           ${String(r.ap).padStart(4)}              |        ${String(r.branco).padStart(3)}         | ${r.taxa.toFixed(1)}%${mark}`);
}

// ============================================================
// TESTE 4: COMBINAÇÕES — Especial + Avisador vs Especial + Bloqueador
// ============================================================
console.log('\n\n--- 4. COMBINAÇÕES FORTES ---\n');

// Teste: Especial → 11 ou 12 (fake white) → branco?
let fwAp = 0, fwBr = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (rows[i+1] === 11 || rows[i+1] === 12) {
    fwAp++;
    for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { fwBr++; break; } }
  }
}
console.log(`  Especial → Fake White (11/12) → branco: ${fwBr}/${fwAp} (${(fwBr/fwAp*100).toFixed(1)}%)`);

// Teste: Especial → 5 (confirmador) → branco?
let c5Ap = 0, c5Br = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (rows[i+1] === 5) { c5Ap++; for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { c5Br++; break; } } }
}
console.log(`  Especial → 5 (confirmador) → branco: ${c5Br}/${c5Ap} (${(c5Br/c5Ap*100).toFixed(1)}%)`);

// Teste: Especial → 13 (bloqueador) → branco?
let b13Ap = 0, b13Br = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (rows[i+1] === 13) { b13Ap++; for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { b13Br++; break; } } }
}
console.log(`  Especial → 13 (bloqueador) → branco: ${b13Br}/${b13Ap} (${(b13Br/b13Ap*100).toFixed(1)}%)`);

// Teste: Especial → 9 (controlador) → branco?
let c9Ap = 0, c9Br = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (rows[i+1] === 9) { c9Ap++; for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { c9Br++; break; } } }
}
console.log(`  Especial → 9 (controlador) → branco: ${c9Br}/${c9Ap} (${(c9Br/c9Ap*100).toFixed(1)}%)`);

// ============================================================
// TESTE 5: JANELA DO ESPECIAL vs DISTÂNCIA
// Quando está em dist alta E especial abre → taxa?
// ============================================================
console.log('\n\n--- 5. ESPECIAL + DISTÂNCIA ALTA ---\n');

for (const distMin of [10, 15, 20, 25, 30]) {
  let ap = 0, br = 0;
  for (let i = 0; i < T - 4; i++) {
    if (!especiais.includes(rows[i])) continue;
    // Calcular dist do branco nesse ponto
    let dist = 999;
    for (let j = i; j >= 0; j--) { if (rows[j] === 0) { dist = i - j; break; } }
    if (dist >= distMin) {
      ap++;
      for (let j = 1; j <= 4; j++) { if (rows[i+j] === 0) { br++; break; } }
    }
  }
  console.log(`  Especial + dist>=${distMin}: ${br}/${ap} (${ap>0?(br/ap*100).toFixed(1):'0'}%) janelas com branco`);
}

// ============================================================
// TESTE 6: DENTRO DA JANELA — Qual número na posição 2 ou 3 CONFIRMA branco na 4?
// ============================================================
console.log('\n\n--- 6. PADRÃO: Especial → ? → ? → BRANCO (quem aparece antes do branco na janela) ---\n');

const posAntes = {}; // num → vezes que apareceu 1 posição antes do branco dentro da janela
const posTotalAntes = {};
for (let n = 1; n <= 14; n++) { posAntes[n] = 0; posTotalAntes[n] = 0; }

for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  for (let j = 2; j <= 4; j++) {
    if (rows[i+j] === 0 && rows[i+j-1] !== 0) {
      // O número na posição j-1 (antes do branco na janela)
      const num = rows[i+j-1];
      if (num >= 1 && num <= 14) posAntes[num]++;
    }
  }
  // Contar todas as posições 2-4 (exceto brancos) como denominador
  for (let j = 1; j <= 3; j++) {
    if (rows[i+j] >= 1 && rows[i+j] <= 14) posTotalAntes[rows[i+j]]++;
  }
}

console.log('Número que sai IMEDIATAMENTE antes do branco DENTRO da janela do especial:');
console.log('Núm | Vezes antes do branco | Total na janela | Taxa "avisador"');
const rank3 = [];
for (let n = 1; n <= 14; n++) {
  const taxa = posTotalAntes[n] > 0 ? posAntes[n] / posTotalAntes[n] * 100 : 0;
  rank3.push({n, antes: posAntes[n], total: posTotalAntes[n], taxa});
}
rank3.sort((a,b) => b.taxa - a.taxa);
for (const r of rank3) {
  const mark = r.taxa > 9 ? ' 🔥' : r.taxa < 4 ? ' 🛡️' : '';
  console.log(`  ${String(r.n).padStart(2)} |        ${String(r.antes).padStart(3)}           |      ${String(r.total).padStart(4)}       | ${r.taxa.toFixed(1)}%${mark}`);
}

// ============================================================
// TESTE 7: BLOQUEADORES DENTRO DA JANELA — quem aparece e branco NÃO vem?
// ============================================================
console.log('\n\n--- 7. BLOQUEADORES: Quem aparece na janela e IMPEDE o branco? ---\n');

const bloq = {}; // num → {naJanela, janelasSemBranco}
for (let n = 1; n <= 14; n++) bloq[n] = {comNum: 0, comNumSemBranco: 0};

for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  // Branco na janela?
  let temBranco = false;
  for (let j = 1; j <= 4; j++) { if (rows[i+j] === 0) { temBranco = true; break; } }
  // Quais números estão na janela?
  for (let j = 1; j <= 4; j++) {
    const n = rows[i+j];
    if (n >= 1 && n <= 14) {
      bloq[n].comNum++;
      if (!temBranco) bloq[n].comNumSemBranco++;
    }
  }
}

console.log('Número | Janelas que participou | Janelas sem branco | Taxa bloqueio');
const rank4 = [];
for (let n = 1; n <= 14; n++) {
  const taxa = bloq[n].comNum > 0 ? bloq[n].comNumSemBranco / bloq[n].comNum * 100 : 0;
  rank4.push({n, ...bloq[n], taxa});
}
rank4.sort((a,b) => b.taxa - a.taxa);
for (const r of rank4) {
  const mark = r.taxa > 80 ? ' 🛡️ BLOQUEIA JANELA' : r.taxa < 70 ? ' 🔥 PERMITE BRANCO' : '';
  console.log(`    ${String(r.n).padStart(2)} |        ${String(r.comNum).padStart(4)}          |       ${String(r.comNumSemBranco).padStart(4)}         | ${r.taxa.toFixed(1)}%${mark}`);
}
