const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor] = l.split(',');
  return { num: parseInt(num), cor };
}).filter(r => !isNaN(r.num));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

console.log('='.repeat(70));
console.log('  ANALISE DOS NUMEROS ORFAOS: 1 e 3');
console.log('='.repeat(70) + '\n');

for (const alvo of [1, 3]) {
  console.log('━'.repeat(50));
  console.log('  NUMERO ' + alvo);
  console.log('━'.repeat(50) + '\n');

  // Frequencia basica
  const freq = rows.filter(r => r.num === alvo).length;
  console.log('Frequencia: ' + freq + '/' + T + ' (' + p(freq, T) + '%) — esperado: 6.67%\n');

  // O que vem DEPOIS do alvo? (1 a 6 casas)
  console.log('O que aparece DEPOIS do ' + alvo + ':');
  for (let dist = 1; dist <= 6; dist++) {
    let t = 0, b0 = 0, b11 = 0, b12 = 0, pool = 0;
    const nums = {};
    for (let i = 0; i < T - dist; i++) {
      if (rows[i].num === alvo) {
        t++;
        const n = rows[i + dist].num;
        nums[n] = (nums[n] || 0) + 1;
        if (n === 0) b0++;
        if (n === 11) b11++;
        if (n === 12) b12++;
        if (n === 0 || n === 11 || n === 12) pool++;
      }
    }
    const top = Object.entries(nums).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => n + '(' + p(v, t) + '%)').join(', ');
    console.log('  +' + dist + ': branco=' + p(b0, t) + '% | 11+12=' + p(b11 + b12, t) + '% | pool=' + p(pool, t) + '% | top: ' + top + ' (n=' + t + ')');
  }

  // Em zona de controlador, o alvo muda algo?
  console.log('\n' + alvo + ' dentro de zona de controlador vs fora:');
  const ctrl = { 4: 4, 6: 4, 10: 4, 14: 4, 2: 2, 9: 2 };
  let zIn = 0, zInB = 0, zInP = 0, zOut = 0, zOutB = 0, zOutP = 0;
  for (let i = 1; i < T; i++) {
    if (rows[i].num === alvo) {
      let inZona = false;
      for (let j = 1; j <= 4 && i - j >= 0; j++) {
        const cn = rows[i - j].num;
        if (ctrl[cn] !== undefined && j <= ctrl[cn]) { inZona = true; break; }
      }
      // O que vem +1 e +2 depois?
      if (i + 2 < T) {
        const next1 = rows[i + 1].num;
        const next2 = rows[i + 2].num;
        const gotB = next1 === 0 || next2 === 0;
        const gotP = next1 === 0 || next1 === 11 || next1 === 12 || next2 === 0 || next2 === 11 || next2 === 12;
        if (inZona) { zIn++; if (gotB) zInB++; if (gotP) zInP++; }
        else { zOut++; if (gotB) zOutB++; if (gotP) zOutP++; }
      }
    }
  }
  console.log('  Dentro zona: ' + zIn + ' | branco em +1/+2: ' + p(zInB, zIn) + '% | pool: ' + p(zInP, zIn) + '%');
  console.log('  Fora zona:   ' + zOut + ' | branco em +1/+2: ' + p(zOutB, zOut) + '% | pool: ' + p(zOutP, zOut) + '%');

  // Antes do branco - o alvo aparece?
  console.log('\n' + alvo + ' antes do branco (5 casas):');
  const bIdx = [];
  rows.forEach((r, i) => { if (r.num === 0) bIdx.push(i); });
  for (let pos = 1; pos <= 5; pos++) {
    let c = 0;
    bIdx.forEach(bi => { if (bi - pos >= 0 && rows[bi - pos].num === alvo) c++; });
    console.log('  -' + pos + ': ' + c + '/' + bIdx.length + ' (' + p(c, bIdx.length) + '%) — esperado ~' + p(freq, T) + '%');
  }

  // Antes do REC
  console.log('\n' + alvo + ' dentro do REC vs fora:');
  const bI2 = []; rows.forEach((r, i) => { if (r.num === 0) bI2.push(i); });
  const gaps = [];
  if (bI2[0] > 0) gaps.push({ s: 0, e: bI2[0] - 1, len: bI2[0] });
  for (let i = 1; i < bI2.length; i++) { const gap = bI2[i] - bI2[i - 1] - 1; if (gap > 0) gaps.push({ s: bI2[i - 1] + 1, e: bI2[i] - 1, len: gap }); }
  const recs = gaps.filter(g => g.len >= 20);
  const inRec = new Set();
  recs.forEach(g => { for (let j = g.s; j <= g.e; j++) inRec.add(j); });
  let rIn = 0, rOut = 0;
  rows.forEach((r, i) => { if (r.num === alvo) { if (inRec.has(i)) rIn++; else rOut++; } });
  const recT = inRec.size; const nRecT = T - recT;
  console.log('  Dentro REC: ' + rIn + '/' + recT + ' (' + p(rIn, recT) + '%) — freq no REC');
  console.log('  Fora REC:   ' + rOut + '/' + nRecT + ' (' + p(rOut, nRecT) + '%) — freq fora');

  // Sequencias - o alvo aparece em dobradinha?
  console.log('\n' + alvo + ' em sequencia (dobradinha/trio):');
  let dob = 0, trio = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === alvo && rows[i + 1].num === alvo) {
      dob++;
      if (i + 2 < T && rows[i + 2].num === alvo) trio++;
    }
  }
  console.log('  Dobradinhas: ' + dob + ' | Trios: ' + trio);

  // Interacao com 5, 7, 13
  console.log('\n' + alvo + ' + interferentes (5, 7, 13) na mesma zona (4 casas):');
  for (const interf of [5, 7, 13]) {
    let ct = 0, cb = 0, cp = 0;
    for (let i = 4; i < T; i++) {
      let hasAlvo = false, hasInterf = false;
      for (let j = 0; j < 4; j++) {
        if (rows[i - j - 1].num === alvo) hasAlvo = true;
        if (rows[i - j - 1].num === interf) hasInterf = true;
      }
      if (hasAlvo && hasInterf) {
        ct++;
        if (rows[i].num === 0) cb++;
        if (rows[i].num === 0 || rows[i].num === 11 || rows[i].num === 12) cp++;
      }
    }
    console.log('  ' + alvo + '+' + interf + ': ' + ct + ' vezes | branco: ' + p(cb, ct) + '% | pool: ' + p(cp, ct) + '%');
  }
  console.log('');
}

// Comparacao geral: todos os numeros como "o que vem antes do branco nas 2 casas"
console.log('='.repeat(70));
console.log('  RANKING: Quem mais aparece 1-2 casas antes do branco?');
console.log('='.repeat(70) + '\n');

const bIdx3 = []; rows.forEach((r, i) => { if (r.num === 0) bIdx3.push(i); });
const antes = {};
for (let n = 1; n <= 14; n++) antes[n] = 0;
bIdx3.forEach(bi => {
  for (let pos = 1; pos <= 2; pos++) {
    if (bi - pos >= 0) antes[rows[bi - pos].num]++;
  }
});
const ranking = Object.entries(antes).sort((a, b) => b[1] - a[1]);
const totalAntes = bIdx3.length * 2;
console.log('Num | Vezes | % das posicoes pre-branco | Freq geral | Ratio');
ranking.forEach(([n, v]) => {
  const fg = rows.filter(r => r.num === parseInt(n)).length;
  const ratio = (v / totalAntes * 100 / (fg / T * 100)).toFixed(2);
  console.log(String(n).padStart(3) + ' | ' + String(v).padStart(4) + '  | ' + p(v, totalAntes).padStart(5) + '%                    | ' + p(fg, T).padStart(5) + '%     | ' + ratio + 'x');
});
