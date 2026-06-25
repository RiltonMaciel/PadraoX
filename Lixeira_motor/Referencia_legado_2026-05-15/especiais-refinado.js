const fs = require('fs');
const data = fs.readFileSync('dados-novos.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num] = l.split(',');
  return parseInt(num);
}).filter(r => !isNaN(r));
rows.reverse();
const T = rows.length;

const especiais = [4, 6, 14];

// A análise anterior mostrou que SOZINHOS os especiais têm taxa base (~24%)
// Agora vamos cruzar: ESPECIAL + quem está DENTRO da janela + DIST

console.log('='.repeat(70));
console.log('  ANÁLISE REFINADA: ESPECIAL + CONTEXTO');
console.log('  "Quando a janela do especial REALMENTE dá branco?"');
console.log('='.repeat(70));

// ============================================================
// 1. ESPECIAL quando tem AVISADORES FORTES dentro da janela
// Avisadores encontrados no teste 3: 9, 13, 2, 1 (>20%)
// Anti-avisadores: 3, 7, 8 (<15%)
// ============================================================
console.log('\n--- 1. ESPECIAL → Avisador (9/13/1) na pos 1 → taxa ---\n');

const avisadores = [9, 13, 1];
const antiavisadores = [3, 7, 8, 11];

let avAp = 0, avBr = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (avisadores.includes(rows[i+1])) {
    avAp++;
    for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { avBr++; break; } }
  }
}
console.log(`  Especial → Avisador(9/13/1): ${avBr}/${avAp} (${(avBr/avAp*100).toFixed(1)}%)`);

let antiAp = 0, antiBr = 0;
for (let i = 0; i < T - 4; i++) {
  if (!especiais.includes(rows[i])) continue;
  if (antiavisadores.includes(rows[i+1])) {
    antiAp++;
    for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { antiBr++; break; } }
  }
}
console.log(`  Especial → Anti-avisador(3/7/8/11): ${antiBr}/${antiAp} (${(antiBr/antiAp*100).toFixed(1)}%)`);

// ============================================================
// 2. ESPECIAL + DIST >= 15 + Avisador
// ============================================================
console.log('\n--- 2. ESPECIAL + DIST + AVISADOR ---\n');

for (const distMin of [10, 15, 20]) {
  let a1=0, b1=0, a2=0, b2=0;
  for (let i = 0; i < T - 4; i++) {
    if (!especiais.includes(rows[i])) continue;
    let dist = 999;
    for (let j = i; j >= 0; j--) { if (rows[j] === 0) { dist = i-j; break; } }
    if (dist < distMin) continue;
    
    if (avisadores.includes(rows[i+1])) {
      a1++;
      for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { b1++; break; } }
    }
    if (antiavisadores.includes(rows[i+1])) {
      a2++;
      for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { b2++; break; } }
    }
  }
  console.log(`  Dist>=${distMin} + Especial + Avisador: ${b1}/${a1} (${a1>0?(b1/a1*100).toFixed(1):'0'}%)`);
  console.log(`  Dist>=${distMin} + Especial + Anti-avisador: ${b2}/${a2} (${a2>0?(b2/a2*100).toFixed(1):'0'}%)`);
  console.log('');
}

// ============================================================
// 3. PADRÕES SEQUENCIAIS DENTRO DA JANELA
// Especial → A → B → branco? Quais pares A,B funcionam?
// ============================================================
console.log('\n--- 3. PARES DENTRO DA JANELA: Especial → A → B → BRANCO? ---\n');

const pares = {};
for (let i = 0; i < T - 3; i++) {
  if (!especiais.includes(rows[i])) continue;
  const a = rows[i+1], b = rows[i+2];
  if (a === 0 || b === 0 || a < 1 || b < 1) continue;
  const key = a + '→' + b;
  if (!pares[key]) pares[key] = {ap: 0, br: 0};
  pares[key].ap++;
  if (rows[i+3] === 0) pares[key].br++;
}

// Filtrar pares com amostra >= 5 e taxa alta
const paresArr = Object.entries(pares)
  .map(([k, v]) => ({par: k, ...v, taxa: v.br/v.ap*100}))
  .filter(p => p.ap >= 8)
  .sort((a,b) => b.taxa - a.taxa);

console.log('TOP 20 - Pares que TRAZEM branco (Especial → A → B → BRANCO):');
console.log('Par     | Vezes | Branco | Taxa');
for (const p of paresArr.slice(0, 20)) {
  console.log(`  ${p.par.padEnd(7)} |  ${String(p.ap).padStart(3)}  |   ${String(p.br).padStart(2)}   | ${p.taxa.toFixed(1)}%`);
}

console.log('\nBOTTOM 15 - Pares que BLOQUEIAM branco (Especial → A → B → sem branco):');
const paresBottom = paresArr.filter(p => p.taxa === 0 || p.taxa < 3).slice(0, 15);
for (const p of paresBottom) {
  console.log(`  ${p.par.padEnd(7)} |  ${String(p.ap).padStart(3)}  |   ${String(p.br).padStart(2)}   | ${p.taxa.toFixed(1)}%`);
}

// ============================================================
// 4. O 13 REALMENTE BLOQUEIA DENTRO DA JANELA?
// V2 diz 13 = bloqueador. Mas teste 3 mostrou 22.2% (alto!)
// Vamos investigar: talvez 13 avisa que branco VEM (não bloqueia)
// ============================================================
console.log('\n\n--- 4. CASO ESPECIAL DO 13: BLOQUEADOR OU AVISADOR? ---\n');

// 13 na posição 1 → branco em alguma das 3 seguintes: 22.2% (ALTO!)
// Mas 13 aparecendo em QUALQUER posição da janela → 81.7% sem branco
// Contradição? Vamos detalhar por posição

for (let pos = 1; pos <= 4; pos++) {
  let ap = 0, br = 0;
  for (let i = 0; i < T - 4; i++) {
    if (!especiais.includes(rows[i])) continue;
    if (rows[i+pos] === 13) {
      ap++;
      // Branco nas posições DEPOIS dele na janela?
      let temBranco = false;
      for (let j = pos+1; j <= 4; j++) { if (rows[i+j] === 0) { temBranco = true; break; } }
      if (temBranco) br++;
    }
  }
  console.log(`  13 na posição ${pos} da janela → branco depois: ${br}/${ap} (${ap>0?(br/ap*100).toFixed(1):'0'}%)`);
}

// Comparar: 9 nas mesmas posições
console.log('');
for (let pos = 1; pos <= 4; pos++) {
  let ap = 0, br = 0;
  for (let i = 0; i < T - 4; i++) {
    if (!especiais.includes(rows[i])) continue;
    if (rows[i+pos] === 9) {
      ap++;
      let temBranco = false;
      for (let j = pos+1; j <= 4; j++) { if (rows[i+j] === 0) { temBranco = true; break; } }
      if (temBranco) br++;
    }
  }
  console.log(`   9 na posição ${pos} da janela → branco depois: ${br}/${ap} (${ap>0?(br/ap*100).toFixed(1):'0'}%)`);
}

// ============================================================
// 5. CADA ESPECIAL SEPARADO + composição
// ============================================================
console.log('\n\n--- 5. CADA ESPECIAL SEPARADO ---\n');

for (const esp of especiais) {
  console.log(`\n  === ESPECIAL ${esp} ===`);
  // Top 3 avisadores pós-especial
  const numPost = {};
  for (let n = 1; n <= 14; n++) numPost[n] = {ap:0, br:0};
  for (let i = 0; i < T - 4; i++) {
    if (rows[i] !== esp) continue;
    const prox = rows[i+1];
    if (prox >= 1 && prox <= 14) {
      numPost[prox].ap++;
      for (let j = 2; j <= 4; j++) { if (rows[i+j] === 0) { numPost[prox].br++; break; } }
    }
  }
  const sorted = Object.entries(numPost)
    .map(([n, v]) => ({n: parseInt(n), ...v, taxa: v.ap>0?v.br/v.ap*100:0}))
    .sort((a,b) => b.taxa - a.taxa);
  
  console.log('  TOP 5 avisadores após ' + esp + ':');
  for (const s of sorted.slice(0, 5)) {
    console.log(`    ${esp}→${s.n}: ${s.br}/${s.ap} (${s.taxa.toFixed(1)}%)`);
  }
  console.log('  BOTTOM 3 bloqueadores após ' + esp + ':');
  for (const s of sorted.slice(-3)) {
    console.log(`    ${esp}→${s.n}: ${s.br}/${s.ap} (${s.taxa.toFixed(1)}%)`);
  }
}
