const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, timestamp: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.timestamp));

rows.reverse(); // ordem cronológica

const corLetra = (n) => n === 0 ? 'B' : [1,2,3,4,5,6,7].includes(n) ? 'V' : 'P';
const corNome = (n) => n === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(n) ? 'VERM' : 'PRETO';

// ============================================================
// TESTE 1: Números 4, 6, 10, 14 → próximas 4 casas
// ============================================================
console.log('='.repeat(70));
console.log('  TESTE 1: Numeros 4, 6, 10, 14 → Controlam as proximas 4 casas?');
console.log('='.repeat(70) + '\n');

const grupo4casas = [4, 6, 10, 14];

for (const alvo of grupo4casas) {
  let total = 0;
  const cores4 = { V: 0, P: 0, B: 0 };
  let dominanteV = 0, dominanteP = 0;
  const nums4 = [{}, {}, {}, {}];

  for (let i = 0; i < rows.length - 4; i++) {
    if (rows[i].num !== alvo) continue;
    total++;
    let v = 0, p = 0;
    for (let j = 1; j <= 4; j++) {
      const c = corLetra(rows[i + j].num);
      cores4[c]++;
      if (c === 'V') v++;
      if (c === 'P') p++;
      nums4[j - 1][rows[i + j].num] = (nums4[j - 1][rows[i + j].num] || 0) + 1;
    }
    if (v > p) dominanteV++;
    else if (p > v) dominanteP++;
  }

  const t4 = total * 4;
  console.log(`--- NUMERO ${alvo} (${corNome(alvo)}) --- ${total} ocorrencias ---`);
  console.log(`  Nas proximas 4 casas:`);
  console.log(`    Vermelho: ${(cores4.V / t4 * 100).toFixed(1)}% | Preto: ${(cores4.P / t4 * 100).toFixed(1)}% | Branco: ${(cores4.B / t4 * 100).toFixed(1)}%`);
  console.log(`    Vermelho dominou: ${(dominanteV / total * 100).toFixed(1)}% | Preto dominou: ${(dominanteP / total * 100).toFixed(1)}%`);
  console.log(`  Numero mais provavel por posicao:`);
  for (let p = 0; p < 4; p++) {
    const sorted = Object.entries(nums4[p]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const str = sorted.map(([n, v]) => `${n}(${corNome(parseInt(n))[0]}):${(v / total * 100).toFixed(0)}%`).join('  ');
    console.log(`    +${p + 1}: ${str}`);
  }

  // Padrão de cor dominante
  const padroesCorSeq = {};
  for (let i = 0; i < rows.length - 4; i++) {
    if (rows[i].num !== alvo) continue;
    const seq = [1, 2, 3, 4].map(j => corLetra(rows[i + j].num)).join('');
    padroesCorSeq[seq] = (padroesCorSeq[seq] || 0) + 1;
  }
  const topSeq = Object.entries(padroesCorSeq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`  Top 5 padroes de cor (4 casas):`);
  topSeq.forEach(([s, v]) => {
    const desc = s.split('').map(c => c === 'V' ? 'verm' : c === 'P' ? 'pret' : 'bran').join('-');
    console.log(`    ${desc}: ${v}x (${(v / total * 100).toFixed(1)}%)`);
  });
  console.log('');
}

// Comparar com média geral
console.log('--- MEDIA GERAL (baseline) ---');
let gV = 0, gP = 0, gB = 0;
rows.forEach(r => { const c = corLetra(r.num); if (c === 'V') gV++; if (c === 'P') gP++; if (c === 'B') gB++; });
console.log(`  Vermelho: ${(gV / rows.length * 100).toFixed(1)}% | Preto: ${(gP / rows.length * 100).toFixed(1)}% | Branco: ${(gB / rows.length * 100).toFixed(1)}%`);
console.log(`  (Se nao houvesse influencia, as % pós-numero seriam iguais a estas)\n`);

// ============================================================
// TESTE 2: Números 2, 9 → próximas 2 casas
// ============================================================
console.log('='.repeat(70));
console.log('  TESTE 2: Numeros 2, 9 → Controlam as proximas 2 casas?');
console.log('='.repeat(70) + '\n');

const grupo2casas = [2, 9];

for (const alvo of grupo2casas) {
  let total = 0;
  const cores2 = { V: 0, P: 0, B: 0 };
  const nums2 = [{}, {}];
  let ambosV = 0, ambosP = 0, misto = 0;

  for (let i = 0; i < rows.length - 2; i++) {
    if (rows[i].num !== alvo) continue;
    total++;
    const c1 = corLetra(rows[i + 1].num);
    const c2 = corLetra(rows[i + 2].num);
    cores2[c1]++;
    cores2[c2]++;
    nums2[0][rows[i + 1].num] = (nums2[0][rows[i + 1].num] || 0) + 1;
    nums2[1][rows[i + 2].num] = (nums2[1][rows[i + 2].num] || 0) + 1;

    if (c1 === 'V' && c2 === 'V') ambosV++;
    else if (c1 === 'P' && c2 === 'P') ambosP++;
    else misto++;
  }

  const t2 = total * 2;
  console.log(`--- NUMERO ${alvo} (${corNome(alvo)}) --- ${total} ocorrencias ---`);
  console.log(`  Nas proximas 2 casas:`);
  console.log(`    Vermelho: ${(cores2.V / t2 * 100).toFixed(1)}% | Preto: ${(cores2.P / t2 * 100).toFixed(1)}% | Branco: ${(cores2.B / t2 * 100).toFixed(1)}%`);
  console.log(`    Ambos verm: ${(ambosV / total * 100).toFixed(1)}% | Ambos preto: ${(ambosP / total * 100).toFixed(1)}% | Misto: ${(misto / total * 100).toFixed(1)}%`);
  console.log(`  Numero mais provavel:`);
  for (let p = 0; p < 2; p++) {
    const sorted = Object.entries(nums2[p]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const str = sorted.map(([n, v]) => `${n}(${corNome(parseInt(n))[0]}):${(v / total * 100).toFixed(0)}%`).join('  ');
    console.log(`    +${p + 1}: ${str}`);
  }

  // Padroes de par
  const pares = {};
  for (let i = 0; i < rows.length - 2; i++) {
    if (rows[i].num !== alvo) continue;
    const par = corLetra(rows[i + 1].num) + corLetra(rows[i + 2].num);
    pares[par] = (pares[par] || 0) + 1;
  }
  console.log(`  Padroes de cor (2 casas):`);
  Object.entries(pares).sort((a, b) => b[1] - a[1]).forEach(([s, v]) => {
    const desc = s.split('').map(c => c === 'V' ? 'verm' : c === 'P' ? 'pret' : 'bran').join('-');
    console.log(`    ${desc}: ${v}x (${(v / total * 100).toFixed(1)}%)`);
  });
  console.log('');
}

// ============================================================
// TESTE 3: Número 8 → efeito 2 MINUTOS depois
// ============================================================
console.log('='.repeat(70));
console.log('  TESTE 3: Numero 8 → Controla a casa que cai ~2 MIN depois?');
console.log('='.repeat(70) + '\n');

// Cada rodada dura ~30s, então 2min ≈ 4 rodadas.
// Mas vamos calcular PELO TEMPO REAL

let totalOito = 0;
const alvo2min = { V: 0, P: 0, B: 0 };
const numAlvo2min = {};
const tempoReal = [];
const janelas = { '90-120s': { V: 0, P: 0, B: 0, t: 0 }, '120-150s': { V: 0, P: 0, B: 0, t: 0 }, '105-135s': { V: 0, P: 0, B: 0, t: 0 } };

for (let i = 0; i < rows.length; i++) {
  if (rows[i].num !== 8) continue;
  totalOito++;
  const ts8 = rows[i].timestamp;

  // Encontrar a rodada MAIS PRÓXIMA de exatamente 2 min (120s) depois
  let melhor = null, melhorDiff = Infinity;
  for (let j = i + 1; j < rows.length && j <= i + 8; j++) {
    const diff = rows[j].timestamp - ts8;
    if (diff < 0) continue; // cruzou meia-noite
    if (Math.abs(diff - 120) < melhorDiff) {
      melhorDiff = Math.abs(diff - 120);
      melhor = j;
    }
  }

  if (melhor !== null) {
    const diffReal = rows[melhor].timestamp - ts8;
    tempoReal.push(diffReal);
    const c = corLetra(rows[melhor].num);
    alvo2min[c]++;
    numAlvo2min[rows[melhor].num] = (numAlvo2min[rows[melhor].num] || 0) + 1;

    // Por janela
    for (const [faixa, obj] of Object.entries(janelas)) {
      const [min, max] = faixa.replace('s', '').split('-').map(Number);
      if (diffReal >= min && diffReal <= max) {
        obj[c]++;
        obj.t++;
      }
    }
  }
}

console.log(`Numero 8 apareceu ${totalOito} vezes`);
console.log(`\nRodada mais proxima de 2min depois do 8:`);
const t2m = alvo2min.V + alvo2min.P + alvo2min.B;
console.log(`  Vermelho: ${(alvo2min.V / t2m * 100).toFixed(1)}% | Preto: ${(alvo2min.P / t2m * 100).toFixed(1)}% | Branco: ${(alvo2min.B / t2m * 100).toFixed(1)}%`);
console.log(`  Tempo medio real: ${(tempoReal.reduce((a, b) => a + b, 0) / tempoReal.length).toFixed(0)}s (~${(tempoReal.reduce((a, b) => a + b, 0) / tempoReal.length / 60).toFixed(1)} min)`);
console.log(`  = Corresponde a ~${Math.round(120 / 30)} casas a frente`);

console.log(`\nNumeros que mais caem ~2min apos o 8 (top 5):`);
Object.entries(numAlvo2min).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([n, v]) => {
  console.log(`  ${n} (${corNome(parseInt(n))}): ${v}x (${(v / t2m * 100).toFixed(1)}%)`);
});

console.log(`\nAnalise por janela de tempo:`);
for (const [faixa, obj] of Object.entries(janelas)) {
  if (obj.t === 0) continue;
  console.log(`  ${faixa}: V=${(obj.V / obj.t * 100).toFixed(1)}% P=${(obj.P / obj.t * 100).toFixed(1)}% B=${(obj.B / obj.t * 100).toFixed(1)}% (${obj.t} amostras)`);
}

// Comparar: efeito do 8 nas posições +1 a +6
console.log(`\nEfeito do 8 por POSICAO (pra ver onde cai o pico de influencia):`);
for (let pos = 1; pos <= 6; pos++) {
  let v = 0, p = 0, b = 0, t = 0;
  for (let i = 0; i < rows.length - pos; i++) {
    if (rows[i].num !== 8) continue;
    t++;
    const c = corLetra(rows[i + pos].num);
    if (c === 'V') v++;
    else if (c === 'P') p++;
    else b++;
  }
  const vPct = (v / t * 100).toFixed(1);
  const pPct = (p / t * 100).toFixed(1);
  const bPct = (b / t * 100).toFixed(1);
  const diff = rows.length > 0 ? ((rows[1] || rows[0]).timestamp - rows[0].timestamp) : 30;
  console.log(`  +${pos} (~${pos * 30}s): V=${vPct}% P=${pPct}% B=${bPct}%`);
}

// ============================================================
// RESUMO: Validação da teoria
// ============================================================
console.log('\n\n' + '='.repeat(70));
console.log('  VALIDACAO FINAL DA TEORIA');
console.log('='.repeat(70) + '\n');

// Baseline
const baseV = gV / rows.length * 100;
const baseP = gP / rows.length * 100;

console.log(`Baseline: Verm=${baseV.toFixed(1)}% Preto=${baseP.toFixed(1)}%\n`);

console.log('GRUPO 1: 4, 6, 10, 14 controlam 4 casas?');
for (const alvo of [4, 6, 10, 14]) {
  let vt = 0, pt = 0, tot = 0;
  for (let i = 0; i < rows.length - 4; i++) {
    if (rows[i].num !== alvo) continue;
    for (let j = 1; j <= 4; j++) {
      tot++;
      const c = corLetra(rows[i + j].num);
      if (c === 'V') vt++;
      if (c === 'P') pt++;
    }
  }
  const vPct = vt / tot * 100;
  const pPct = pt / tot * 100;
  const desvioV = vPct - baseV;
  const desvioP = pPct - baseP;
  const sinal = Math.abs(desvioV) > 3 || Math.abs(desvioP) > 3 ? '*** SIGNIFICATIVO ***' : '(fraco)';
  console.log(`  ${alvo}: V=${vPct.toFixed(1)}%(${desvioV > 0 ? '+' : ''}${desvioV.toFixed(1)}) P=${pPct.toFixed(1)}%(${desvioP > 0 ? '+' : ''}${desvioP.toFixed(1)}) ${sinal}`);
}

console.log('\nGRUPO 2: 2, 9 controlam 2 casas?');
for (const alvo of [2, 9]) {
  let vt = 0, pt = 0, tot = 0;
  for (let i = 0; i < rows.length - 2; i++) {
    if (rows[i].num !== alvo) continue;
    for (let j = 1; j <= 2; j++) {
      tot++;
      const c = corLetra(rows[i + j].num);
      if (c === 'V') vt++;
      if (c === 'P') pt++;
    }
  }
  const vPct = vt / tot * 100;
  const pPct = pt / tot * 100;
  const desvioV = vPct - baseV;
  const desvioP = pPct - baseP;
  const sinal = Math.abs(desvioV) > 3 || Math.abs(desvioP) > 3 ? '*** SIGNIFICATIVO ***' : '(fraco)';
  console.log(`  ${alvo}: V=${vPct.toFixed(1)}%(${desvioV > 0 ? '+' : ''}${desvioV.toFixed(1)}) P=${pPct.toFixed(1)}%(${desvioP > 0 ? '+' : ''}${desvioP.toFixed(1)}) ${sinal}`);
}

console.log('\nGRUPO 3: 8 controla ~2min depois (~4 casas)?');
{
  const vPct = alvo2min.V / t2m * 100;
  const pPct = alvo2min.P / t2m * 100;
  const desvioV = vPct - baseV;
  const desvioP = pPct - baseP;
  const sinal = Math.abs(desvioV) > 3 || Math.abs(desvioP) > 3 ? '*** SIGNIFICATIVO ***' : '(fraco)';
  console.log(`  8 (2min): V=${vPct.toFixed(1)}%(${desvioV > 0 ? '+' : ''}${desvioV.toFixed(1)}) P=${pPct.toFixed(1)}%(${desvioP > 0 ? '+' : ''}${desvioP.toFixed(1)}) ${sinal}`);
}
