const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (8).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Extrair números (cronológico: antigo → recente)
let nums = data.map(r => Number(r['Número'])).filter(n => !isNaN(n)).reverse();
console.log(`=== CAÇA AO NÚMERO BLOQUEADOR - ${nums.length} rodadas ===\n`);

// Localizar todos os brancos
const brancos = [];
for (let i = 0; i < nums.length; i++) {
  if (nums[i] === 0) brancos.push(i);
}

// Criar segmentos entre brancos (períodos de seca)
const segmentos = [];
let inicio = 0;
for (const b of brancos) {
  segmentos.push({ inicio, fim: b, tamanho: b - inicio, numeros: nums.slice(inicio, b) });
  inicio = b + 1;
}
// Último segmento (após último branco)
if (inicio < nums.length) {
  segmentos.push({ inicio, fim: nums.length, tamanho: nums.length - inicio, numeros: nums.slice(inicio) });
}

console.log(`Segmentos entre brancos: ${segmentos.length}`);
console.log(`Tamanhos: ${segmentos.map(s => s.tamanho).join(', ')}`);
const mediaGap = (segmentos.reduce((s,x) => s + x.tamanho, 0) / segmentos.length).toFixed(1);
console.log(`Média gap: ${mediaGap}\n`);

// Separar secas LONGAS (acima da mediana) vs CURTAS
const sorted = [...segmentos].sort((a,b) => a.tamanho - b.tamanho);
const mediana = sorted[Math.floor(sorted.length / 2)].tamanho;
const longas = segmentos.filter(s => s.tamanho > mediana);  // secas longas
const curtas = segmentos.filter(s => s.tamanho <= mediana); // secas curtas

console.log(`Mediana gap: ${mediana}`);
console.log(`Secas longas (>${mediana}): ${longas.length} | Secas curtas (≤${mediana}): ${curtas.length}\n`);

// ========================================
// ANÁLISE 1: Frequência de cada número em secas longas vs curtas
// ========================================
console.log('=== FREQUÊNCIA POR NÚMERO: SECAS LONGAS vs CURTAS ===');
console.log('(Se um número aparece MAIS em secas longas, ele pode ser o bloqueador)\n');

function contarFreq(segs) {
  const freq = {};
  let total = 0;
  for (const s of segs) {
    for (const n of s.numeros) {
      freq[n] = (freq[n] || 0) + 1;
      total++;
    }
  }
  return { freq, total };
}

const { freq: freqLonga, total: totalLonga } = contarFreq(longas);
const { freq: freqCurta, total: totalCurta } = contarFreq(curtas);

const resultado = [];
for (let n = 1; n <= 14; n++) {
  const pctLonga = ((freqLonga[n] || 0) / totalLonga * 100);
  const pctCurta = ((freqCurta[n] || 0) / totalCurta * 100);
  const ratio = pctCurta > 0 ? (pctLonga / pctCurta) : 999;
  resultado.push({ num: n, pctLonga, pctCurta, ratio, freqL: freqLonga[n]||0, freqC: freqCurta[n]||0 });
}

resultado.sort((a,b) => b.ratio - a.ratio);
console.log('Num | %Seca Longa | %Seca Curta | Ratio (L/C) | FreqL | FreqC');
console.log('----|------------|------------|-------------|-------|------');
resultado.forEach(r => {
  const marker = r.ratio > 1.3 ? ' ← SUSPEITO' : r.ratio < 0.7 ? ' ← RARO em secas' : '';
  console.log(`${String(r.num).padStart(3)} | ${r.pctLonga.toFixed(2).padStart(9)}% | ${r.pctCurta.toFixed(2).padStart(9)}% | ${r.ratio.toFixed(2).padStart(10)} | ${String(r.freqL).padStart(5)} | ${String(r.freqC).padStart(5)}${marker}`);
});

// ========================================
// ANÁLISE 2: Qual número quando SAI, o branco demora mais?
// ========================================
console.log('\n=== DISTÂNCIA MÉDIA ATÉ BRANCO APÓS CADA NÚMERO ===');
console.log('(Se após número X o branco demora mais, X pode ser o bloqueador)\n');

const distPorNum = {};
for (let i = 0; i < nums.length; i++) {
  const n = nums[i];
  if (n === 0) continue;
  // Achar próximo branco
  let d = 0;
  let achou = false;
  for (let j = i + 1; j < nums.length; j++) {
    d++;
    if (nums[j] === 0) { achou = true; break; }
  }
  if (achou) {
    if (!distPorNum[n]) distPorNum[n] = [];
    distPorNum[n].push(d);
  }
}

const distResult = [];
for (let n = 1; n <= 14; n++) {
  const arr = distPorNum[n] || [];
  if (arr.length === 0) continue;
  const media = arr.reduce((s,v) => s+v, 0) / arr.length;
  const sorted2 = [...arr].sort((a,b) => a-b);
  const med = sorted2[Math.floor(sorted2.length/2)];
  const mais15 = arr.filter(d => d > 15).length;
  distResult.push({ num: n, media, mediana: med, count: arr.length, mais15 });
}

distResult.sort((a,b) => b.media - a.media);
console.log('Num | Média Dist | Mediana | >15 rod | Amostras');
console.log('----|-----------|---------|---------|--------');
distResult.forEach(r => {
  const marker = r.media > 14 ? ' ← BLOQUEADOR?' : '';
  console.log(`${String(r.num).padStart(3)} | ${r.media.toFixed(1).padStart(9)} | ${String(r.mediana).padStart(7)} | ${String(r.mais15).padStart(7)} | ${String(r.count).padStart(7)}${marker}`);
});

// ========================================
// ANÁLISE 3: Pares de números — qual PAR precede secas longas?
// ========================================
console.log('\n=== PARES QUE PRECEDEM SECAS LONGAS (≥20 rodadas sem branco) ===\n');

const secasMuitoLongas = segmentos.filter(s => s.tamanho >= 20);
console.log(`Secas ≥20 rodadas: ${secasMuitoLongas.length}`);

// Primeiros 5 números de cada seca longa
console.log('\nPrimeiros 5 números de cada seca ≥20:');
secasMuitoLongas.forEach((s, i) => {
  const prim5 = s.numeros.slice(0, 5).join(',');
  const ult5 = s.numeros.slice(-5).join(',');
  console.log(`  Seca ${i+1} (${s.tamanho} rod): início [${prim5}] ... fim [${ult5}]`);
});

// Contar frequência dos primeiros 3 números em secas longas vs curtas
console.log('\nNúmeros que INICIAM secas longas (primeiros 3):');
const inicioLonga = {};
secasMuitoLongas.forEach(s => {
  s.numeros.slice(0, 3).forEach(n => { inicioLonga[n] = (inicioLonga[n] || 0) + 1; });
});
Object.entries(inicioLonga).sort((a,b) => b[1] - a[1]).forEach(([n, c]) => {
  console.log(`  Num ${n}: ${c} vezes`);
});

// ========================================
// ANÁLISE 4: Número "gatilho" — qual número aparece ANTES de uma sequência de 11/12?
// ========================================
console.log('\n=== NÚMERO QUE PRECEDE APARIÇÃO DE 11/12 ===');
console.log('(Se há um número que "chama" 11/12 e depois seca longa, ele é o verdadeiro bloqueador)\n');

let preSeguradores = {};
for (let i = 1; i < nums.length; i++) {
  if (nums[i] === 11 || nums[i] === 12) {
    const prev = nums[i-1];
    if (prev !== 0 && prev !== 11 && prev !== 12) {
      preSeguradores[prev] = (preSeguradores[prev] || 0) + 1;
    }
  }
}
console.log('Número que precede 11/12:');
Object.entries(preSeguradores).sort((a,b) => b[1] - a[1]).forEach(([n, c]) => {
  console.log(`  Num ${n}: ${c} vezes precede 11/12`);
});

// ========================================
// ANÁLISE 5: Combinações de 2 números seguidos e distância até branco
// ========================================
console.log('\n=== TOP PARES CONSECUTIVOS COM MAIOR DISTÂNCIA ATÉ BRANCO ===\n');

const pares = {};
for (let i = 0; i < nums.length - 1; i++) {
  if (nums[i] === 0 || nums[i+1] === 0) continue;
  const par = `${nums[i]},${nums[i+1]}`;
  // Dist até branco
  let d = 0, achou = false;
  for (let j = i + 2; j < nums.length; j++) {
    d++;
    if (nums[j] === 0) { achou = true; break; }
  }
  if (achou) {
    if (!pares[par]) pares[par] = [];
    pares[par].push(d);
  }
}

// Filtrar pares com pelo menos 3 ocorrências
const paresResult = Object.entries(pares)
  .filter(([,arr]) => arr.length >= 3)
  .map(([par, arr]) => ({
    par,
    media: arr.reduce((s,v) => s+v, 0) / arr.length,
    count: arr.length,
    max: Math.max(...arr)
  }))
  .sort((a,b) => b.media - a.media);

console.log('Par     | Média Dist | Max  | Ocorrências');
console.log('--------|-----------|------|------------');
paresResult.slice(0, 20).forEach(r => {
  console.log(`${r.par.padEnd(7)} | ${r.media.toFixed(1).padStart(9)} | ${String(r.max).padStart(4)} | ${r.count}`);
});

// ========================================
// ANÁLISE 6: Números que aparecem EXCLUSIVAMENTE em secas longas
// ========================================
console.log('\n=== NÚMEROS CONCENTRADOS NAS ÚLTIMAS 5 POSIÇÕES ANTES DO BRANCO ===');
console.log('(Quem aparece logo antes do branco NÃO é bloqueador)\n');

const antesDobranco = {};
for (const b of brancos) {
  const janela = nums.slice(Math.max(0, b - 5), b);
  janela.forEach(n => { antesDobranco[n] = (antesDobranco[n] || 0) + 1; });
}
const totalAntes = Object.values(antesDobranco).reduce((s,v) => s+v, 0);
console.log('Num | Freq antes do branco | % relativa');
Object.entries(antesDobranco)
  .sort((a,b) => b[1] - a[1])
  .forEach(([n, c]) => {
    console.log(`  ${String(n).padStart(3)} | ${String(c).padStart(3)} | ${(c/totalAntes*100).toFixed(1)}%`);
  });

// ========================================
// ANÁLISE 7: Sequências especiais — números que quando se repetem 2x causam seca
// ========================================
console.log('\n=== NÚMERO REPETIDO 2X+ E DISTÂNCIA ATÉ BRANCO ===\n');

const repDist = {};
for (let i = 1; i < nums.length; i++) {
  if (nums[i] === nums[i-1] && nums[i] !== 0) {
    const n = nums[i];
    let d = 0, achou = false;
    for (let j = i + 1; j < nums.length; j++) {
      d++;
      if (nums[j] === 0) { achou = true; break; }
    }
    if (achou) {
      if (!repDist[n]) repDist[n] = [];
      repDist[n].push(d);
    }
  }
}

console.log('Num Repetido | Média Dist | Mediana | Ocorrências');
Object.entries(repDist)
  .map(([n, arr]) => ({ n, media: arr.reduce((s,v)=>s+v,0)/arr.length, med: [...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)], count: arr.length }))
  .sort((a,b) => b.media - a.media)
  .forEach(r => {
    console.log(`  ${String(r.n).padStart(3)}×2       | ${r.media.toFixed(1).padStart(9)} | ${String(r.med).padStart(7)} | ${r.count}`);
  });

console.log('\n=== FIM ===');
