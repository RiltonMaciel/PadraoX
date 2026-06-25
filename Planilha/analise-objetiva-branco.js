const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8').split('\n');

const dados = [];
for (let i = csvRaw.length - 1; i >= 2; i--) {
  const cols = csvRaw[i].split(',');
  if (cols.length < 4) continue;
  const num = parseInt(cols[0]);
  if (isNaN(num) || num < 0 || num > 14) continue;
  dados.push(num);
}
const h = dados, T = h.length;
const baseRate = h.filter(n=>n===0).length / T;

console.log('═'.repeat(80));
console.log('  ANÁLISE OBJETIVA: QUANDO O BRANCO REALMENTE VEM?');
console.log('  N=' + T + ' | base=' + (baseRate*100).toFixed(2) + '% | Foco: condições com taxa ACIMA da base');
console.log('═'.repeat(80));

// ══════════ 1. TODOS OS PARES — taxa branco na PRÓXIMA rodada ══════════
console.log('\n▓ 1. TODOS OS 225 PARES (A,B) → P(branco na PRÓXIMA rodada)');
console.log('  Mostrando apenas pares com taxa > 10% E N >= 10\n');

const pareStats = {};
for (let i = 2; i < T; i++) {
  const par = h[i-2] + ',' + h[i-1];
  if (!pareStats[par]) pareStats[par] = {n:0, b:0};
  pareStats[par].n++;
  if (h[i] === 0) pareStats[par].b++;
}

let paresFortes = [];
for (const [par, s] of Object.entries(pareStats)) {
  if (s.n >= 10) {
    const taxa = s.b / s.n;
    const z = (taxa - baseRate) / Math.sqrt(baseRate * (1-baseRate) / s.n);
    paresFortes.push({par, taxa, n: s.n, b: s.b, z});
  }
}
paresFortes.sort((a,b) => b.taxa - a.taxa);

console.log('  Par    | Taxa      | N    | Brancos | Z-score | Status');
console.log('  ' + '─'.repeat(65));
for (const p of paresFortes.filter(p => p.taxa > 0.10)) {
  const status = p.z >= 3.0 ? '🔥 FORTE' : p.z >= 2.0 ? '✓ VÁLIDO' : p.z >= 1.5 ? '~ marginal' : '  amostra';
  console.log(`  ${p.par.padEnd(6)} | ${(p.taxa*100).toFixed(1)}%     | ${String(p.n).padStart(4)} | ${String(p.b).padStart(4)}    | ${p.z.toFixed(2).padStart(5)}   | ${status}`);
}

// ══════════ 2. TRIPLAS (A,B,C) → P(branco em seguida) ══════════
console.log('\n\n▓ 2. TRIPLAS (A,B,C) → P(branco na PRÓXIMA rodada)');
console.log('  Mostrando triplas com taxa > 15% E N >= 5\n');

const triplaStats = {};
for (let i = 3; i < T; i++) {
  const key = h[i-3] + ',' + h[i-2] + ',' + h[i-1];
  if (!triplaStats[key]) triplaStats[key] = {n:0, b:0};
  triplaStats[key].n++;
  if (h[i] === 0) triplaStats[key].b++;
}

let triplasFortes = [];
for (const [key, s] of Object.entries(triplaStats)) {
  if (s.n >= 5) {
    const taxa = s.b / s.n;
    const z = (taxa - baseRate) / Math.sqrt(baseRate * (1-baseRate) / s.n);
    triplasFortes.push({key, taxa, n: s.n, b: s.b, z});
  }
}
triplasFortes.sort((a,b) => b.taxa - a.taxa);

console.log('  Tripla      | Taxa      | N   | Brancos | Z-score');
console.log('  ' + '─'.repeat(60));
for (const t of triplasFortes.filter(t => t.taxa > 0.15)) {
  console.log(`  ${t.key.padEnd(12)} | ${(t.taxa*100).toFixed(1)}%     | ${String(t.n).padStart(3)} | ${String(t.b).padStart(4)}    | ${t.z.toFixed(2)}`);
}

// ══════════ 3. CONDIÇÕES COMBINADAS — quando MÚLTIPLAS coisas alinham ══════════
console.log('\n\n▓ 3. CONDIÇÕES COMBINADAS — múltiplos fatores alinhados');
console.log('  Testando: Par forte + Dist alta + Rep padrão\n');

// Condição: distância + par forte + últimos números
function analisarCondicao(label, filtro) {
  let n = 0, b = 0;
  for (let i = 4; i < T - 1; i++) {
    if (filtro(h, i)) {
      n++;
      if (h[i] === 0) b++;
    }
  }
  if (n < 5) return;
  const taxa = b / n;
  const z = (taxa - baseRate) / Math.sqrt(baseRate * (1-baseRate) / n);
  console.log(`  ${label.padEnd(45)} | ${b}/${n} = ${(taxa*100).toFixed(1)}% | Z=${z.toFixed(2)}`);
}

// Distância desde último branco
function dist(hist, idx) {
  for (let i = idx-1; i >= 0; i--) { if (hist[i] === 0) return idx - i; }
  return idx;
}

analisarCondicao('Dist >= 20', (h,i) => dist(h,i) >= 20);
analisarCondicao('Dist >= 25', (h,i) => dist(h,i) >= 25);
analisarCondicao('Dist >= 30', (h,i) => dist(h,i) >= 30);
analisarCondicao('Dist >= 35', (h,i) => dist(h,i) >= 35);
analisarCondicao('Dist >= 40', (h,i) => dist(h,i) >= 40);
analisarCondicao('Dist >= 50', (h,i) => dist(h,i) >= 50);

analisarCondicao('11+12 nas últimas 4', (h,i) => {
  const l4 = [h[i-1],h[i-2],h[i-3],h[i-4]];
  return l4.includes(11) && l4.includes(12);
});

analisarCondicao('Rep 1 (2x últimas 3)', (h,i) => {
  return [h[i-1],h[i-2],h[i-3]].filter(x=>x===1).length >= 2;
});

analisarCondicao('Rep 0 (branco nas últimas 3)', (h,i) => {
  return [h[i-1],h[i-2],h[i-3]].includes(0);
});

analisarCondicao('Último = 0 (branco acabou de sair)', (h,i) => h[i-1] === 0);

analisarCondicao('Dist>=35 E 11+12 últimas 4', (h,i) => {
  const l4 = [h[i-1],h[i-2],h[i-3],h[i-4]];
  return dist(h,i) >= 35 && l4.includes(11) && l4.includes(12);
});

analisarCondicao('Dist>=25 E Rep1', (h,i) => {
  return dist(h,i) >= 25 && [h[i-1],h[i-2],h[i-3]].filter(x=>x===1).length >= 2;
});

analisarCondicao('Dist>=30 E número anterior = 8 ou 10', (h,i) => {
  return dist(h,i) >= 30 && (h[i-1] === 8 || h[i-1] === 10);
});

analisarCondicao('Par 9,1 (último=1, anterior=9)', (h,i) => h[i-1]===1 && h[i-2]===9);
analisarCondicao('Par 13,0 especial (penúlt=13,últ≠0)', (h,i) => h[i-2]===13 && h[i-1]===0);
analisarCondicao('Último=0 E penúltimo=13', (h,i) => h[i-1]===0 && h[i-2]===13);

// ══════════ 4. SEQUÊNCIAS — o que acontece APÓS o branco? ══════════
console.log('\n\n▓ 4. O QUE ACONTECE APÓS O BRANCO SAIR?');
console.log('  Se branco saiu, qual a chance de sair OUTRO branco em X rodadas?\n');

for (let gap of [1,2,3,4,5,7,10,15,20]) {
  let n = 0, b = 0;
  for (let i = 0; i < T - gap; i++) {
    if (h[i] === 0) {
      n++;
      let ok = false;
      for (let j = 1; j <= gap; j++) { if (h[i+j] === 0) { ok = true; break; } }
      if (ok) b++;
    }
  }
  if (n > 0) {
    const taxa = b/n;
    const bl = 1 - Math.pow(1-baseRate, gap);
    console.log(`  Após branco, P(outro branco em ${String(gap).padStart(2)} rodadas): ${(taxa*100).toFixed(1)}% vs random ${(bl*100).toFixed(1)}% | edge ${((taxa-bl)*100).toFixed(1)}pp (N=${n})`);
  }
}

// ══════════ 5. NÚMEROS ESPECÍFICOS antes do branco ══════════
console.log('\n\n▓ 5. QUAL NÚMERO INDIVIDUAL PRECEDE O BRANCO MAIS?');
console.log('  P(branco) dado que o número anterior foi X\n');

console.log('  Número | Vezes que precedeu branco | Total aparições | Taxa | Z-score');
console.log('  ' + '─'.repeat(65));
for (let num = 0; num <= 14; num++) {
  let n = 0, b = 0;
  for (let i = 1; i < T; i++) {
    if (h[i-1] === num) { n++; if (h[i] === 0) b++; }
  }
  const taxa = b/n;
  const z = (taxa - baseRate) / Math.sqrt(baseRate * (1-baseRate) / n);
  const status = z >= 2.0 ? ' ← ELEVADO' : z <= -2.0 ? ' ← REDUZIDO' : '';
  console.log(`    ${String(num).padStart(2)}   |          ${String(b).padStart(3)}              |      ${String(n).padStart(4)}      | ${(taxa*100).toFixed(1)}% | ${z.toFixed(2)}${status}`);
}

// ══════════ 6. GAPS: distribuição real dos intervalos entre brancos ══════════
console.log('\n\n▓ 6. GAPS ENTRE BRANCOS — Distribuição real');
console.log('  Se o gap mediano é 10 e o jogo fosse IID, a distribuição seria geométrica.');
console.log('  Desvios indicam MEMÓRIA ou padrão.\n');

const gaps = [];
let lastBranco = -1;
for (let i = 0; i < T; i++) {
  if (h[i] === 0) {
    if (lastBranco >= 0) gaps.push(i - lastBranco);
    lastBranco = i;
  }
}

const faixasGap = [[1,3],[4,7],[8,12],[13,18],[19,25],[26,35],[36,50],[51,100]];
console.log('  Faixa    | Freq real | Freq teórica (geom) | Diff   | Significado');
const pGeom = baseRate; // geométrica com p = baseRate

for (const [a,b] of faixasGap) {
  const real = gaps.filter(g => g >= a && g <= b).length;
  // P(gap entre a e b) para geométrica = sum_{k=a}^{b} (1-p)^(k-1) * p
  let pTeo = 0;
  for (let k = a; k <= b; k++) pTeo += Math.pow(1-pGeom, k-1) * pGeom;
  const expected = pTeo * gaps.length;
  const diff = real - expected;
  const chi = Math.pow(diff, 2) / expected;
  const status = chi > 6.63 ? '⚠️ ANOMALIA' : chi > 3.84 ? '! desviou' : '≈ normal';
  console.log(`  ${String(a).padStart(2)}-${String(b).padStart(3)}  | ${String(real).padStart(4)}      |    ${expected.toFixed(0).padStart(4)}          | ${diff>=0?'+':''}${diff.toFixed(0).padStart(4)}   | ${status}`);
}

// ══════════ 7. STREAKS DE CORES — padrão antes do branco ══════════
console.log('\n\n▓ 7. COR DOMINANTE ANTES DO BRANCO');
console.log('  Quando sai muito preto/vermelho seguido, muda a chance?\n');

function corNum(n) { if (n===0) return 'B'; return [1,2,3,4,5,6,7].includes(n) ? 'V' : 'P'; }

for (let streak of [3,4,5,6,7,8]) {
  // Streak de mesma cor (P ou V) nas últimas X
  let nP = 0, bP = 0, nV = 0, bV = 0;
  for (let i = streak; i < T; i++) {
    const cores = [];
    for (let j = 1; j <= streak; j++) cores.push(corNum(h[i-j]));
    if (cores.every(c => c === 'P')) { nP++; if (h[i]===0) bP++; }
    if (cores.every(c => c === 'V')) { nV++; if (h[i]===0) bV++; }
  }
  const tP = nP > 0 ? (bP/nP*100).toFixed(1) : 'N/A';
  const tV = nV > 0 ? (bV/nV*100).toFixed(1) : 'N/A';
  console.log(`  ${streak}x PRETO seguido → P(branco): ${tP}% (N=${nP}) | ${streak}x VERMELHO → ${tV}% (N=${nV})`);
}

console.log('\n' + '═'.repeat(80));
console.log('  FIM — Todos os dados acima são FATOS PUROS, sem interpretação.');
console.log('═'.repeat(80) + '\n');
