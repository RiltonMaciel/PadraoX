const XLSX = require('xlsx');
const path = require('path');

// Ler AMBOS os arquivos para mais dados
const files = [
  'tipminer-dados-blaze-double (8).xlsx',
  'tipminer-dados-blaze-double (9).xlsx'
];

let allNums = [];
for (const f of files) {
  const wb = XLSX.readFile(path.join(__dirname, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  const nums = data.map(r => Number(r['Número'])).filter(n => !isNaN(n)).reverse();
  console.log(`${f}: ${nums.length} números`);
  allNums.push(...nums);
}

// Remover duplicatas (se houver sobreposição entre planilhas)
// Na verdade, como são períodos diferentes, vamos usar todos
const nums = allNums;
console.log(`\n=== ANÁLISE EXPANDIDA - ${nums.length} rodadas totais ===\n`);

// Localizar brancos
const brancos = [];
for (let i = 0; i < nums.length; i++) {
  if (nums[i] === 0) brancos.push(i);
}
console.log(`Total brancos: ${brancos.length} (${(brancos.length/nums.length*100).toFixed(1)}%)\n`);

// Segmentos entre brancos
const segmentos = [];
let inicio = 0;
for (const b of brancos) {
  segmentos.push({ inicio, fim: b, tamanho: b - inicio, numeros: nums.slice(inicio, b) });
  inicio = b + 1;
}
if (inicio < nums.length) {
  segmentos.push({ inicio, fim: nums.length, tamanho: nums.length - inicio, numeros: nums.slice(inicio) });
}

const sorted = [...segmentos].sort((a,b) => a.tamanho - b.tamanho);
const mediana = sorted[Math.floor(sorted.length / 2)].tamanho;
const mediaGap = (segmentos.reduce((s,x) => s + x.tamanho, 0) / segmentos.length).toFixed(1);
console.log(`Média gap entre brancos: ${mediaGap} | Mediana: ${mediana}\n`);

// ========================================
// ANÁLISE 1: Repetir frequência por número em secas longas vs curtas
// ========================================
const longas = segmentos.filter(s => s.tamanho > mediana);
const curtas = segmentos.filter(s => s.tamanho <= mediana);

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

console.log('=== FREQUÊNCIA POR NÚMERO: SECAS LONGAS vs CURTAS (2000 rodadas) ===\n');
console.log('Num | %Seca Longa | %Seca Curta | Ratio (L/C)');
console.log('----|------------|------------|------------');

const resultado = [];
for (let n = 1; n <= 14; n++) {
  const pctLonga = ((freqLonga[n] || 0) / totalLonga * 100);
  const pctCurta = ((freqCurta[n] || 0) / totalCurta * 100);
  const ratio = pctCurta > 0 ? (pctLonga / pctCurta) : 999;
  resultado.push({ num: n, pctLonga, pctCurta, ratio });
}
resultado.sort((a,b) => b.ratio - a.ratio);
resultado.forEach(r => {
  const marker = r.ratio > 1.3 ? ' ← SUSPEITO' : r.ratio < 0.7 ? ' ← RARO em secas' : '';
  console.log(`${String(r.num).padStart(3)} | ${r.pctLonga.toFixed(2).padStart(9)}% | ${r.pctCurta.toFixed(2).padStart(9)}% | ${r.ratio.toFixed(2).padStart(10)}${marker}`);
});

// ========================================
// ANÁLISE 2: Distância média após cada número
// ========================================
console.log('\n=== DISTÂNCIA MÉDIA ATÉ BRANCO APÓS CADA NÚMERO (2000 rodadas) ===\n');

const distPorNum = {};
for (let i = 0; i < nums.length; i++) {
  const n = nums[i];
  if (n === 0) continue;
  let d = 0, achou = false;
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
  distResult.push({ num: n, media, count: arr.length });
}
distResult.sort((a,b) => b.media - a.media);
console.log('Num | Média Dist | Amostras');
console.log('----|-----------|--------');
distResult.forEach(r => {
  const marker = r.media > 13 ? ' ← ATRASA BRANCO' : r.media < 11 ? ' ← ACELERA BRANCO' : '';
  console.log(`${String(r.num).padStart(3)} | ${r.media.toFixed(1).padStart(9)} | ${String(r.count).padStart(7)}${marker}`);
});

// ========================================
// ANÁLISE PRINCIPAL: QUANDO 11/12/REP APARECE SEM OS BLOQUEADORES (1,4,6) PERTO
// ========================================
console.log('\n' + '='.repeat(70));
console.log('PERGUNTA CENTRAL: 11/12/REP ATRASA BRANCO QUANDO 1/4/6 NÃO ESTÃO PERTO?');
console.log('='.repeat(70) + '\n');

// Suspeitos do arquivo anterior: 1, 4, 6 (e talvez 10)
const SUSPEITOS = [1, 4, 6];

// Para cada 11, 12 ou repetido: verificar se tem suspeito nas 5 anteriores
let comSuspeito = [], semSuspeito = [];
for (let i = 0; i < nums.length; i++) {
  const eh11ou12 = nums[i] === 11 || nums[i] === 12;
  const ehRep = i > 0 && nums[i] === nums[i-1] && nums[i] !== 0 && nums[i] !== 11 && nums[i] !== 12;
  
  if (!eh11ou12 && !ehRep) continue;
  
  // Checar se tem suspeito nas 5 anteriores
  const janela = nums.slice(Math.max(0, i - 5), i);
  const temSuspeito = janela.some(n => SUSPEITOS.includes(n));
  
  // Dist até branco
  let d = 0, achou = false;
  for (let j = i + 1; j < nums.length; j++) {
    d++;
    if (nums[j] === 0) { achou = true; break; }
  }
  if (!achou) continue;
  
  if (temSuspeito) {
    comSuspeito.push({ pos: i, num: nums[i], tipo: eh11ou12 ? `seg${nums[i]}` : 'rep', dist: d });
  } else {
    semSuspeito.push({ pos: i, num: nums[i], tipo: eh11ou12 ? `seg${nums[i]}` : 'rep', dist: d });
  }
}

const mediaComS = comSuspeito.length > 0 ? (comSuspeito.reduce((s,x) => s+x.dist, 0) / comSuspeito.length).toFixed(1) : '?';
const mediaSemS = semSuspeito.length > 0 ? (semSuspeito.reduce((s,x) => s+x.dist, 0) / semSuspeito.length).toFixed(1) : '?';

console.log(`11/12/Rep COM suspeito (1,4,6) nas 5 anteriores:`);
console.log(`  ${comSuspeito.length} casos | Média dist branco: ${mediaComS}`);
console.log(`  ≤5 rod: ${comSuspeito.filter(x=>x.dist<=5).length} (${(comSuspeito.filter(x=>x.dist<=5).length/comSuspeito.length*100).toFixed(1)}%)`);
console.log(`  ≤10 rod: ${comSuspeito.filter(x=>x.dist<=10).length} (${(comSuspeito.filter(x=>x.dist<=10).length/comSuspeito.length*100).toFixed(1)}%)`);
console.log(`  >15 rod: ${comSuspeito.filter(x=>x.dist>15).length} (${(comSuspeito.filter(x=>x.dist>15).length/comSuspeito.length*100).toFixed(1)}%)`);
console.log(`  >25 rod: ${comSuspeito.filter(x=>x.dist>25).length} (${(comSuspeito.filter(x=>x.dist>25).length/comSuspeito.length*100).toFixed(1)}%)`);

console.log(`\n11/12/Rep SEM suspeito nas 5 anteriores:`);
console.log(`  ${semSuspeito.length} casos | Média dist branco: ${mediaSemS}`);
console.log(`  ≤5 rod: ${semSuspeito.filter(x=>x.dist<=5).length} (${(semSuspeito.filter(x=>x.dist<=5).length/semSuspeito.length*100).toFixed(1)}%)`);
console.log(`  ≤10 rod: ${semSuspeito.filter(x=>x.dist<=10).length} (${(semSuspeito.filter(x=>x.dist<=10).length/semSuspeito.length*100).toFixed(1)}%)`);
console.log(`  >15 rod: ${semSuspeito.filter(x=>x.dist>15).length} (${(semSuspeito.filter(x=>x.dist>15).length/semSuspeito.length*100).toFixed(1)}%)`);
console.log(`  >25 rod: ${semSuspeito.filter(x=>x.dist>25).length} (${(semSuspeito.filter(x=>x.dist>25).length/semSuspeito.length*100).toFixed(1)}%)`);

console.log(`\n  DIFERENÇA: ${mediaComS} vs ${mediaSemS} (com vs sem suspeito)`);

// Testar cada suspeito individualmente
console.log('\n--- Teste individual de cada suspeito ---\n');
for (const susp of [1, 4, 6, 10, 2, 13]) {
  let com = [], sem = [];
  for (let i = 0; i < nums.length; i++) {
    const eh11ou12 = nums[i] === 11 || nums[i] === 12;
    const ehRep = i > 0 && nums[i] === nums[i-1] && nums[i] !== 0 && nums[i] !== 11 && nums[i] !== 12;
    if (!eh11ou12 && !ehRep) continue;
    
    const janela = nums.slice(Math.max(0, i - 5), i);
    const temEste = janela.includes(susp);
    
    let d = 0, achou = false;
    for (let j = i + 1; j < nums.length; j++) {
      d++;
      if (nums[j] === 0) { achou = true; break; }
    }
    if (!achou) continue;
    
    if (temEste) com.push(d); else sem.push(d);
  }
  const mCom = com.length > 0 ? (com.reduce((s,v)=>s+v,0)/com.length).toFixed(1) : '?';
  const mSem = sem.length > 0 ? (sem.reduce((s,v)=>s+v,0)/sem.length).toFixed(1) : '?';
  const diff = com.length > 0 && sem.length > 0 ? (parseFloat(mCom) - parseFloat(mSem)).toFixed(1) : '?';
  console.log(`  Num ${String(susp).padStart(2)} antes de 11/12/rep: COM=${mCom} (${com.length}) | SEM=${mSem} (${sem.length}) | Diff=${diff}`);
}

// ========================================
// ANÁLISE REVERSA: Quando branco NÃO vem (seca >20), quais números dominam?
// ========================================
console.log('\n=== NAS SECAS >20 RODADAS: QUAIS NÚMEROS DOMINAM? ===\n');

const secasGrandes = segmentos.filter(s => s.tamanho >= 20);
const secasPequenas = segmentos.filter(s => s.tamanho >= 3 && s.tamanho <= 8);

const fGrande = {}, fPequena = {};
let tGrande = 0, tPequena = 0;
secasGrandes.forEach(s => { s.numeros.forEach(n => { fGrande[n] = (fGrande[n]||0)+1; tGrande++; }); });
secasPequenas.forEach(s => { s.numeros.forEach(n => { fPequena[n] = (fPequena[n]||0)+1; tPequena++; }); });

console.log('Num | % em Seca≥20 | % em Seca 3-8 | Ratio | Interpretação');
console.log('----|-------------|--------------|-------|-------------');
const comp = [];
for (let n = 1; n <= 14; n++) {
  const pG = (fGrande[n]||0)/tGrande*100;
  const pP = (fPequena[n]||0)/tPequena*100;
  const r = pP > 0 ? pG/pP : 99;
  comp.push({n, pG, pP, r});
}
comp.sort((a,b) => b.r - a.r);
comp.forEach(c => {
  const interp = c.r > 1.4 ? 'BLOQUEADOR' : c.r < 0.7 ? 'FACILITADOR' : 'neutro';
  console.log(`${String(c.n).padStart(3)} | ${c.pG.toFixed(1).padStart(10)}% | ${c.pP.toFixed(1).padStart(11)}% | ${c.r.toFixed(2).padStart(5)} | ${interp}`);
});

// ========================================
// ANÁLISE CHAVE: 11/12 sem NENHUM bloqueador na janela inteira de seca
// ========================================
console.log('\n=== SECAS QUE TÊM 11/12 MAS NÃO TÊM OS BLOQUEADORES ===\n');

let secas1112semBloq = 0, secas1112comBloq = 0;
let tamSemBloq = [], tamComBloq = [];

for (const s of segmentos) {
  if (s.tamanho < 3) continue;
  const tem1112 = s.numeros.some(n => n === 11 || n === 12);
  if (!tem1112) continue;
  
  const temBloq = s.numeros.some(n => SUSPEITOS.includes(n));
  if (temBloq) {
    secas1112comBloq++;
    tamComBloq.push(s.tamanho);
  } else {
    secas1112semBloq++;
    tamSemBloq.push(s.tamanho);
  }
}

console.log(`Secas com 11/12 E com bloqueador (1/4/6): ${secas1112comBloq} | Média tam: ${tamComBloq.length > 0 ? (tamComBloq.reduce((s,v)=>s+v,0)/tamComBloq.length).toFixed(1) : '?'}`);
console.log(`Secas com 11/12 mas SEM bloqueador (1/4/6): ${secas1112semBloq} | Média tam: ${tamSemBloq.length > 0 ? (tamSemBloq.reduce((s,v)=>s+v,0)/tamSemBloq.length).toFixed(1) : '?'}`);
if (tamSemBloq.length > 0) {
  console.log(`  Tamanhos sem bloqueador: ${tamSemBloq.sort((a,b)=>a-b).join(', ')}`);
}

// ========================================
// ANÁLISE EXTRA: O que acontece quando 11/12 aparece SOZINHO (sem bloqueador em toda janela de 10)
// ========================================
console.log('\n=== 11/12 ISOLADO (sem 1/4/6 nas 10 anteriores) vs 11/12 COM bloqueador ===\n');

let isolado = [], acompanhado = [];
for (let i = 5; i < nums.length; i++) {
  if (nums[i] !== 11 && nums[i] !== 12) continue;
  
  const janela10 = nums.slice(Math.max(0, i - 10), i);
  const temBloq = janela10.some(n => SUSPEITOS.includes(n));
  
  let d = 0, achou = false;
  for (let j = i + 1; j < nums.length; j++) {
    d++;
    if (nums[j] === 0) { achou = true; break; }
  }
  if (!achou) continue;
  
  if (temBloq) acompanhado.push(d);
  else isolado.push(d);
}

const mIso = isolado.length > 0 ? (isolado.reduce((s,v)=>s+v,0)/isolado.length).toFixed(1) : '?';
const mAco = acompanhado.length > 0 ? (acompanhado.reduce((s,v)=>s+v,0)/acompanhado.length).toFixed(1) : '?';

console.log(`11/12 ISOLADO (sem 1/4/6 nas 10 ant): ${isolado.length} casos | Média até branco: ${mIso}`);
console.log(`  ≤5: ${isolado.filter(d=>d<=5).length} | ≤10: ${isolado.filter(d=>d<=10).length} | >15: ${isolado.filter(d=>d>15).length} | >25: ${isolado.filter(d=>d>25).length}`);
console.log(`\n11/12 COM bloqueador (1/4/6 nas 10 ant): ${acompanhado.length} casos | Média até branco: ${mAco}`);
console.log(`  ≤5: ${acompanhado.filter(d=>d<=5).length} | ≤10: ${acompanhado.filter(d=>d<=10).length} | >15: ${acompanhado.filter(d=>d>15).length} | >25: ${acompanhado.filter(d=>d>25).length}`);

console.log(`\n  >> CONCLUSÃO: Quando 11/12 aparece sem bloqueador, branco vem em ${mIso} vs ${mAco} com bloqueador`);
console.log(`  >> Diferença: ${(parseFloat(mAco) - parseFloat(mIso)).toFixed(1)} rodadas a mais quando tem bloqueador`);

// ========================================
// BONUS: Qual número ESPECÍFICO mais causa a seca quando combinado com 11/12?
// ========================================
console.log('\n=== QUAL NÚMERO COMBINADO COM 11/12 CAUSA MAIS SECA? ===\n');

for (let susp = 1; susp <= 14; susp++) {
  if (susp === 11 || susp === 12 || susp === 0) continue;
  
  let comEste = [], semEste = [];
  for (let i = 5; i < nums.length; i++) {
    if (nums[i] !== 11 && nums[i] !== 12) continue;
    
    const janela = nums.slice(Math.max(0, i - 8), i);
    const temEste = janela.includes(susp);
    
    let d = 0, achou = false;
    for (let j = i + 1; j < nums.length; j++) {
      d++;
      if (nums[j] === 0) { achou = true; break; }
    }
    if (!achou) continue;
    
    if (temEste) comEste.push(d); else semEste.push(d);
  }
  
  const mC = comEste.length > 0 ? (comEste.reduce((s,v)=>s+v,0)/comEste.length).toFixed(1) : '?';
  const mS = semEste.length > 0 ? (semEste.reduce((s,v)=>s+v,0)/semEste.length).toFixed(1) : '?';
  const diff = (comEste.length > 0 && semEste.length > 0) ? (parseFloat(mC) - parseFloat(mS)).toFixed(1) : '?';
  const marker = parseFloat(diff) > 3 ? ' ← POTENCIALIZA SECA' : parseFloat(diff) < -3 ? ' ← AJUDA BRANCO' : '';
  console.log(`  Num ${String(susp).padStart(2)}: COM na janela8 → ${mC} (${comEste.length}) | SEM → ${mS} (${semEste.length}) | Diff: +${diff}${marker}`);
}

console.log('\n=== FIM DA ANÁLISE EXPANDIDA ===');
