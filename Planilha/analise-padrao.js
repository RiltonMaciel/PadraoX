const XLSX = require('xlsx');
const path = require('path');

// Carregar dados
const files = ['tipminer-dados-blaze-double (8).xlsx', 'tipminer-dados-blaze-double (9).xlsx'];
let nums = [];
for (const f of files) {
  const wb = XLSX.readFile(path.join(__dirname, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  nums.push(...data.map(r => Number(r['Número'])).filter(n => !isNaN(n)).reverse());
}
console.log(`=== ANÁLISE DE PADRÕES - ${nums.length} rodadas ===\n`);

// ========================================
// 1. QUAL É O PADRÃO QUE ANTECEDE BRANCO?
// ========================================
console.log('='.repeat(60));
console.log('1. PADRÃO DOS ÚLTIMOS 10 NÚMEROS ANTES DE CADA BRANCO');
console.log('='.repeat(60) + '\n');

const brancos = [];
for (let i = 0; i < nums.length; i++) if (nums[i] === 0) brancos.push(i);

// Métricas da janela pré-branco
let preBranco = [];
for (const b of brancos) {
  if (b < 10) continue;
  const janela = nums.slice(b - 10, b);
  const media = janela.reduce((s,v) => s+v, 0) / janela.length;
  const desvio = Math.sqrt(janela.reduce((s,v) => s + (v-media)**2, 0) / janela.length);
  const pares = janela.filter(n => n % 2 === 0).length;
  const impares = janela.filter(n => n % 2 === 1).length;
  const altos = janela.filter(n => n >= 8).length; // 8-14
  const baixos = janela.filter(n => n >= 1 && n <= 7).length; // 1-7
  const pretos = janela.filter(n => [2,4,6,8,10,11,13].includes(n)).length;
  const vermelhos = janela.filter(n => [1,3,5,7,9,12,14].includes(n)).length;
  const seg = janela.filter(n => n === 11 || n === 12).length;
  const reps = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]===janela[i-1]) c++; return c; })();
  const crescentes = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]>janela[i-1]) c++; return c; })();
  const decrescentes = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]<janela[i-1]) c++; return c; })();
  const alternancia = crescentes + decrescentes; // quanto "mexe"
  const uniqueNums = new Set(janela).size;
  
  preBranco.push({ media, desvio, pares, impares, altos, baixos, pretos, vermelhos, seg, reps, crescentes, decrescentes, alternancia, uniqueNums, janela });
}

// Mesmas métricas para janelas ALEATÓRIAS (que NÃO precedem branco)
let preNormal = [];
for (let i = 10; i < nums.length; i++) {
  if (nums[i] === 0) continue; // pular as que precedem branco
  if (Math.random() > 0.1) continue; // amostrar 10%
  const janela = nums.slice(i - 10, i);
  const media = janela.reduce((s,v) => s+v, 0) / janela.length;
  const desvio = Math.sqrt(janela.reduce((s,v) => s + (v-media)**2, 0) / janela.length);
  const pares = janela.filter(n => n % 2 === 0).length;
  const impares = janela.filter(n => n % 2 === 1).length;
  const altos = janela.filter(n => n >= 8).length;
  const baixos = janela.filter(n => n >= 1 && n <= 7).length;
  const pretos = janela.filter(n => [2,4,6,8,10,11,13].includes(n)).length;
  const vermelhos = janela.filter(n => [1,3,5,7,9,12,14].includes(n)).length;
  const seg = janela.filter(n => n === 11 || n === 12).length;
  const reps = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]===janela[i-1]) c++; return c; })();
  const crescentes = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]>janela[i-1]) c++; return c; })();
  const decrescentes = (() => { let c = 0; for(let i=1;i<janela.length;i++) if(janela[i]<janela[i-1]) c++; return c; })();
  const alternancia = crescentes + decrescentes;
  const uniqueNums = new Set(janela).size;
  
  preNormal.push({ media, desvio, pares, impares, altos, baixos, pretos, vermelhos, seg, reps, crescentes, decrescentes, alternancia, uniqueNums, janela });
}

function mediaArr(arr, key) { return (arr.reduce((s,x) => s + x[key], 0) / arr.length).toFixed(2); }

console.log(`Amostras: ${preBranco.length} pré-branco | ${preNormal.length} normais\n`);
console.log('Métrica          | Pré-Branco | Normal   | Diff');
console.log('-----------------|-----------|----------|------');
const metricas = ['media','desvio','pares','impares','altos','baixos','pretos','vermelhos','seg','reps','crescentes','decrescentes','alternancia','uniqueNums'];
const nomes = ['Média valor','Desvio padrão','Qtd pares','Qtd ímpares','Altos (8-14)','Baixos (1-7)','Pretos','Vermelhos','Qtd 11/12','Repetições','Crescentes','Decrescentes','Alternância','Únicos'];
metricas.forEach((m, i) => {
  const pb = parseFloat(mediaArr(preBranco, m));
  const pn = parseFloat(mediaArr(preNormal, m));
  const diff = (pb - pn).toFixed(2);
  const marker = Math.abs(diff) > 0.3 ? ' ← DIFERENTE' : '';
  console.log(`${nomes[i].padEnd(17)}| ${String(pb).padStart(9)} | ${String(pn).padStart(8)} | ${diff}${marker}`);
});

// ========================================
// 2. COMO 11/12 ALTERA O PADRÃO?
// ========================================
console.log('\n' + '='.repeat(60));
console.log('2. O PADRÃO MUDA QUANDO 11/12 ENTRA? (análise de transição)');
console.log('='.repeat(60) + '\n');

// Probabilidade de branco nos próximos N após cada tipo de evento
function probBrancoApos(posicoes, label) {
  let total = posicoes.length;
  let brancoEm = [0,0,0,0,0,0,0,0,0,0]; // rodadas 1-10
  for (const pos of posicoes) {
    for (let j = 1; j <= 10; j++) {
      if (pos + j < nums.length && nums[pos + j] === 0) {
        brancoEm[j-1]++;
      }
    }
  }
  console.log(`${label} (${total} eventos):`);
  const acum = [];
  let acc = 0;
  for (let j = 0; j < 10; j++) {
    acc += brancoEm[j];
    acum.push(acc);
  }
  console.log(`  Branco em 1-3: ${acum[2]} (${(acum[2]/total*100).toFixed(1)}%)`);
  console.log(`  Branco em 1-5: ${acum[4]} (${(acum[4]/total*100).toFixed(1)}%)`);
  console.log(`  Branco em 1-10: ${acum[9]} (${(acum[9]/total*100).toFixed(1)}%)`);
  return { total, acum };
}

// Posições de cada evento
const pos11 = [], pos12 = [], posRep = [], posNormal = [];
for (let i = 1; i < nums.length - 10; i++) {
  if (nums[i] === 0) continue;
  if (nums[i] === 11) pos11.push(i);
  else if (nums[i] === 12) pos12.push(i);
  else if (nums[i] === nums[i-1]) posRep.push(i);
  else posNormal.push(i);
}

probBrancoApos(pos11, 'Após sair 11');
probBrancoApos(pos12, 'Após sair 12');
probBrancoApos(posRep, 'Após repetido');
probBrancoApos(posNormal, 'Após número normal');

// ========================================
// 3. PADRÃO QUEBRADO: sequência "boa" interrompida por 11/12
// ========================================
console.log('\n' + '='.repeat(60));
console.log('3. PADRÃO INTERROMPIDO: Uma sequência "boa" que é quebrada por 11/12');
console.log('='.repeat(60) + '\n');

// Definir "padrão bom" = últimos brancos vieram com intervalo regular (8-15)
// Checar se quando o ritmo é bom e 11/12 aparece, ele QUEBRA o ritmo

let ritmoBom = 0, ritmoQuebrado = 0, ritmoMantido = 0;
for (let i = 2; i < brancos.length; i++) {
  const gap1 = brancos[i-1] - brancos[i-2]; // gap anterior
  const gap2 = brancos[i] - brancos[i-1];   // gap atual
  
  // Ritmo "bom" = gap anterior entre 5-15
  if (gap1 >= 5 && gap1 <= 15) {
    ritmoBom++;
    // Checar se tem 11/12 no gap atual
    const segmento = nums.slice(brancos[i-1] + 1, brancos[i]);
    const tem1112 = segmento.some(n => n === 11 || n === 12);
    const temRep = (() => { for(let j=1;j<segmento.length;j++) if(segmento[j]===segmento[j-1]) return true; return false; })();
    
    if (tem1112 || temRep) {
      // O gap atual é maior que o anterior? (ritmo quebrado)
      if (gap2 > gap1 * 1.5) ritmoQuebrado++;
      else ritmoMantido++;
    }
  }
}
console.log(`Situações com ritmo bom (gap 5-15): ${ritmoBom}`);
console.log(`Quando 11/12/rep aparece no gap seguinte:`);
console.log(`  Ritmo QUEBRADO (gap cresceu >50%): ${ritmoQuebrado}`);
console.log(`  Ritmo MANTIDO: ${ritmoMantido}`);
console.log(`  Taxa de quebra: ${(ritmoQuebrado/(ritmoQuebrado+ritmoMantido)*100).toFixed(1)}%`);

// Comparar: sem 11/12/rep
let semSegRitmoQuebrado = 0, semSegRitmoMantido = 0;
for (let i = 2; i < brancos.length; i++) {
  const gap1 = brancos[i-1] - brancos[i-2];
  const gap2 = brancos[i] - brancos[i-1];
  
  if (gap1 >= 5 && gap1 <= 15) {
    const segmento = nums.slice(brancos[i-1] + 1, brancos[i]);
    const tem1112 = segmento.some(n => n === 11 || n === 12);
    const temRep = (() => { for(let j=1;j<segmento.length;j++) if(segmento[j]===segmento[j-1]) return true; return false; })();
    
    if (!tem1112 && !temRep) {
      if (gap2 > gap1 * 1.5) semSegRitmoQuebrado++;
      else semSegRitmoMantido++;
    }
  }
}
console.log(`\nSEM 11/12/rep no gap:`);
console.log(`  Ritmo QUEBRADO: ${semSegRitmoQuebrado}`);
console.log(`  Ritmo MANTIDO: ${semSegRitmoMantido}`);
console.log(`  Taxa de quebra: ${(semSegRitmoQuebrado/(semSegRitmoQuebrado+semSegRitmoMantido)*100).toFixed(1)}%`);

// ========================================
// 4. TRANSIÇÃO DE ESTADOS: após 11/12, o que muda nas probabilidades?
// ========================================
console.log('\n' + '='.repeat(60));
console.log('4. CADEIA DE MARKOV: Transições alteradas por 11/12');
console.log('='.repeat(60) + '\n');

// Prob de branco dado estado anterior
// Estado = (distância atual do branco, último número foi 11/12 ou não)
const stats = { seg_perto: 0, seg_perto_branco: 0, norm_perto: 0, norm_perto_branco: 0,
                seg_longe: 0, seg_longe_branco: 0, norm_longe: 0, norm_longe_branco: 0 };

let distAtual = 0;
for (let i = 0; i < nums.length; i++) {
  if (nums[i] === 0) { distAtual = 0; continue; }
  distAtual++;
  
  const ehSeg = nums[i] === 11 || nums[i] === 12 || (i > 0 && nums[i] === nums[i-1]);
  const perto = distAtual <= 15; // "perto" do esperado
  
  // Próximo é branco?
  const proxBranco = i + 1 < nums.length && nums[i + 1] === 0;
  
  if (ehSeg && perto) { stats.seg_perto++; if (proxBranco) stats.seg_perto_branco++; }
  else if (ehSeg && !perto) { stats.seg_longe++; if (proxBranco) stats.seg_longe_branco++; }
  else if (!ehSeg && perto) { stats.norm_perto++; if (proxBranco) stats.norm_perto_branco++; }
  else { stats.norm_longe++; if (proxBranco) stats.norm_longe_branco++; }
}

console.log('Estado                    | Prob branco na próxima | Amostras');
console.log('--------------------------|----------------------|--------');
console.log(`11/12/rep + dist≤15       | ${(stats.seg_perto_branco/stats.seg_perto*100).toFixed(2)}%              | ${stats.seg_perto}`);
console.log(`Normal + dist≤15          | ${(stats.norm_perto_branco/stats.norm_perto*100).toFixed(2)}%              | ${stats.norm_perto}`);
console.log(`11/12/rep + dist>15       | ${(stats.seg_longe_branco/stats.seg_longe*100).toFixed(2)}%              | ${stats.seg_longe}`);
console.log(`Normal + dist>15          | ${(stats.norm_longe_branco/stats.norm_longe*100).toFixed(2)}%              | ${stats.norm_longe}`);

// ========================================
// 5. SEQUÊNCIA EXATA: Os últimos 5 antes de branco vs após 11/12
// ========================================
console.log('\n' + '='.repeat(60));
console.log('5. FINGERPRINT: Classificação dos últimos 5 antes de branco');
console.log('='.repeat(60) + '\n');

// Categorizar os 5 números antes de cada branco
const fingerprints = { baixo_puro: 0, alto_puro: 0, misto: 0, com_seg: 0, com_rep: 0 };
const fp_detalhe = [];

for (const b of brancos) {
  if (b < 5) continue;
  const ult5 = nums.slice(b - 5, b);
  const temSeg = ult5.some(n => n === 11 || n === 12);
  const temRep = (() => { for(let j=1;j<ult5.length;j++) if(ult5[j]===ult5[j-1]) return true; return false; })();
  const todoBaixo = ult5.every(n => n <= 7);
  const todoAlto = ult5.every(n => n >= 8);
  
  if (temSeg) fingerprints.com_seg++;
  else if (temRep) fingerprints.com_rep++;
  else if (todoBaixo) fingerprints.baixo_puro++;
  else if (todoAlto) fingerprints.alto_puro++;
  else fingerprints.misto++;
  
  fp_detalhe.push({ ult5, temSeg, temRep });
}

console.log('Tipo de janela pré-branco:');
Object.entries(fingerprints).forEach(([k, v]) => {
  console.log(`  ${k.padEnd(15)}: ${v} (${(v/brancos.length*100).toFixed(1)}%)`);
});

// ========================================
// 6. ANÁLISE CHAVE: Após 11/12, o PRÓXIMO número tem padrão diferente?
// ========================================
console.log('\n' + '='.repeat(60));
console.log('6. APÓS 11/12: O PRÓXIMO NÚMERO É DIFERENTE DO ESPERADO?');
console.log('='.repeat(60) + '\n');

// Distribuição do número que vem APÓS 11
const apos11 = {}, apos12 = {}, aposNorm = {};
for (let i = 0; i < nums.length - 1; i++) {
  const prox = nums[i + 1];
  if (prox === 0) continue; // ignorar brancos aqui
  if (nums[i] === 11) apos11[prox] = (apos11[prox] || 0) + 1;
  else if (nums[i] === 12) apos12[prox] = (apos12[prox] || 0) + 1;
  else if (nums[i] !== 0) aposNorm[prox] = (aposNorm[prox] || 0) + 1;
}

const total11 = Object.values(apos11).reduce((s,v)=>s+v,0);
const total12 = Object.values(apos12).reduce((s,v)=>s+v,0);
const totalN = Object.values(aposNorm).reduce((s,v)=>s+v,0);

console.log('Num | % após 11 | % após 12 | % após normal | 11 vs Normal');
console.log('----|----------|----------|--------------|-------------');
for (let n = 1; n <= 14; n++) {
  const p11 = ((apos11[n]||0)/total11*100);
  const p12 = ((apos12[n]||0)/total12*100);
  const pN = ((aposNorm[n]||0)/totalN*100);
  const diff = (p11 - pN).toFixed(1);
  const marker = Math.abs(parseFloat(diff)) > 2 ? (parseFloat(diff) > 0 ? ' ← PUXA' : ' ← EVITA') : '';
  console.log(`${String(n).padStart(3)} | ${p11.toFixed(1).padStart(7)}% | ${p12.toFixed(1).padStart(7)}% | ${pN.toFixed(1).padStart(11)}% | ${diff}%${marker}`);
}

// ========================================
// 7. HIPÓTESE FINAL: 11/12 "reseta" a cadeia de Markov
// ========================================
console.log('\n' + '='.repeat(60));
console.log('7. HIPÓTESE: 11/12 RESETA O "TIMER" DO BRANCO?');
console.log('='.repeat(60) + '\n');

// Se distância até branco estava convergindo e 11/12 aparece, ele "reseta"?
// Comparar: gap médio quando 11/12 aparece PERTO do branco esperado vs não

// Calcular: para cada posição, qual era a "expectativa" de branco
let resetados = [], naoResetados = [];
for (let i = 10; i < nums.length - 20; i++) {
  if (nums[i] !== 11 && nums[i] !== 12) continue;
  
  // Qual era a distância desde o último branco?
  let distUltBranco = 0;
  for (let j = i - 1; j >= 0; j--) {
    if (nums[j] === 0) break;
    distUltBranco++;
  }
  
  // Dist até próx branco
  let distProxBranco = 0;
  for (let j = i + 1; j < nums.length; j++) {
    distProxBranco++;
    if (nums[j] === 0) break;
  }
  
  // Se já estava "maduro" (dist > 10), 11/12 resetou?
  if (distUltBranco >= 10) {
    resetados.push({ distUlt: distUltBranco, distProx: distProxBranco });
  } else {
    naoResetados.push({ distUlt: distUltBranco, distProx: distProxBranco });
  }
}

const mReset = resetados.length > 0 ? (resetados.reduce((s,x)=>s+x.distProx,0)/resetados.length).toFixed(1) : '?';
const mNaoReset = naoResetados.length > 0 ? (naoResetados.reduce((s,x)=>s+x.distProx,0)/naoResetados.length).toFixed(1) : '?';

console.log(`11/12 quando branco já era esperado (dist≥10):`);
console.log(`  ${resetados.length} casos | Dist até próx branco: ${mReset}`);
console.log(`  ≤5: ${resetados.filter(x=>x.distProx<=5).length} | ≤10: ${resetados.filter(x=>x.distProx<=10).length} | >15: ${resetados.filter(x=>x.distProx>15).length}`);

console.log(`\n11/12 quando branco NÃO era esperado ainda (dist<10):`);
console.log(`  ${naoResetados.length} casos | Dist até próx branco: ${mNaoReset}`);
console.log(`  ≤5: ${naoResetados.filter(x=>x.distProx<=5).length} | ≤10: ${naoResetados.filter(x=>x.distProx<=10).length} | >15: ${naoResetados.filter(x=>x.distProx>15).length}`);

// Comparar com número normal no mesmo cenário
let normalMaduro = [];
for (let i = 10; i < nums.length - 20; i++) {
  if (nums[i] === 0 || nums[i] === 11 || nums[i] === 12) continue;
  if (i > 0 && nums[i] === nums[i-1]) continue;
  
  let distUltBranco = 0;
  for (let j = i - 1; j >= 0; j--) {
    if (nums[j] === 0) break;
    distUltBranco++;
  }
  
  if (distUltBranco >= 10) {
    let distProxBranco = 0;
    for (let j = i + 1; j < nums.length; j++) {
      distProxBranco++;
      if (nums[j] === 0) break;
    }
    normalMaduro.push({ distProx: distProxBranco });
  }
}

const mNormal = normalMaduro.length > 0 ? (normalMaduro.reduce((s,x)=>s+x.distProx,0)/normalMaduro.length).toFixed(1) : '?';
console.log(`\nNúmero NORMAL quando branco já era esperado (dist≥10):`);
console.log(`  ${normalMaduro.length} casos | Dist até próx branco: ${mNormal}`);
console.log(`  ≤5: ${normalMaduro.filter(x=>x.distProx<=5).length} | ≤10: ${normalMaduro.filter(x=>x.distProx<=10).length} | >15: ${normalMaduro.filter(x=>x.distProx>15).length}`);

console.log(`\n  >> 11/12 na zona madura: ${mReset} | Normal na zona madura: ${mNormal}`);
console.log(`  >> Diferença: ${(parseFloat(mReset) - parseFloat(mNormal)).toFixed(1)} rodadas`);
if (parseFloat(mReset) > parseFloat(mNormal)) {
  console.log(`  >> ✅ CONFIRMADO: 11/12 ATRASA branco quando já era esperado! (+${(parseFloat(mReset) - parseFloat(mNormal)).toFixed(1)} rod)`);
} else {
  console.log(`  >> ❌ NÃO confirmado: 11/12 não atrasa significativamente`);
}

console.log('\n=== FIM ===');
