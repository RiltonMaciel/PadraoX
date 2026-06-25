const fs = require('fs');
const data = fs.readFileSync('dados-novos.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s };
}).filter(r => !isNaN(r.num));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

console.log('='.repeat(70));
console.log('  INVESTIGACAO PROFUNDA — PADROES REAIS EM 10K');
console.log('='.repeat(70));
console.log('Base: 658 brancos em 10000 (6.58%)\n');

// ============ TESTE 1: DISTANCIA COMO FATOR PRINCIPAL ============
console.log('--- TESTE 1: TAXA DE BRANCO POR FAIXA DE DISTANCIA ---');
console.log('(Probabilidade de branco DADO dist do ultimo branco)');
const distFaixas = [[1,3],[4,6],[7,10],[11,14],[15,19],[20,24],[25,29],[30,39],[40,49],[50,69],[70,999]];
for (const [lo,hi] of distFaixas) {
  let cnt = 0, cntB = 0;
  for (let i = 1; i < T; i++) {
    let dist = 999;
    for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
    if (dist >= lo && dist <= hi) { cnt++; if (rows[i].num === 0) cntB++; }
  }
  console.log('  Dist '+String(lo).padStart(2)+'-'+String(hi).padStart(3)+': branco='+p(cntB,cnt)+'% ('+cntB+'/'+cnt+') '+(cntB/cnt*100 > 8 ? '***' : cntB/cnt*100 > 7 ? '**' : ''));
}

// ============ TESTE 2: PROBABILIDADE CONDICIONAL CRESCENTE ============
console.log('\n--- TESTE 2: Probabilidade ACUMULADA (P(branco | dist >= N)) ---');
for (let d = 1; d <= 60; d += 3) {
  let cnt = 0, cntB = 0;
  for (let i = 1; i < T; i++) {
    let dist = 999;
    for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
    if (dist >= d) { cnt++; if (rows[i].num === 0) cntB++; }
  }
  if (cnt > 0) console.log('  Dist>='+String(d).padStart(2)+': P(branco)='+p(cntB,cnt)+'% ('+cntB+'/'+cnt+')');
}

// ============ TESTE 3: PARES FORTES (11+12) VALIDAR ============
console.log('\n--- TESTE 3: Par 11+12 (melhor encontrado) - analise detalhada ---');
let p1112=0, p1112B=0;
for (let i = 4; i < T; i++) {
  let has11=false, has12=false;
  for (let j=1;j<=4;j++){if(rows[i-j].num===11)has11=true;if(rows[i-j].num===12)has12=true;}
  if (has11 && has12) { p1112++; if (rows[i].num===0) p1112B++; }
}
console.log('  11+12 nas ult4: '+p1112B+'/'+p1112+' = '+p(p1112B,p1112)+'%');
// Testar por bloco
console.log('  Por bloco de 2000:');
for (let bloco = 0; bloco < 5; bloco++) {
  const s = bloco*2000, e = Math.min(s+2000, T);
  let ap=0, ac=0;
  for (let i = Math.max(s,4); i < e; i++) {
    let has11=false, has12=false;
    for (let j=1;j<=4;j++){if(rows[i-j].num===11)has11=true;if(rows[i-j].num===12)has12=true;}
    if (has11 && has12) { ap++; if (rows[i].num===0) ac++; }
  }
  console.log('    Bloco '+s+'-'+e+': '+ac+'/'+ap+' ('+p(ac,ap)+'%)');
}

// ============ TESTE 4: COMBINACAO DISTANCIA + PARES ============
console.log('\n--- TESTE 4: Dist>=15 + Par presente (combinacoes) ---');
const topPares = [[11,12],[8,13],[2,5],[9,14],[5,14],[1,13],[9,13]];
for (const [a,b] of topPares) {
  let cnt=0, cntB=0;
  for (let i = 4; i < T; i++) {
    let dist=999;
    for (let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
    if (dist < 15) continue;
    let hasA=false, hasB=false;
    for (let j=1;j<=4;j++){if(rows[i-j].num===a)hasA=true;if(rows[i-j].num===b)hasB=true;}
    if (hasA && hasB) { cnt++; if(rows[i].num===0) cntB++; }
  }
  console.log('  Dist>=15 + '+a+'+'+b+': '+cntB+'/'+cnt+' ('+p(cntB,cnt)+'%)');
}

// ============ TESTE 5: DISTANCIA + PREDECESSOR ============
console.log('\n--- TESTE 5: Dist>=15 + Predecessor especifico ---');
for (let n = 1; n <= 14; n++) {
  let cnt=0, cntB=0;
  for (let i = 1; i < T; i++) {
    let dist=999;
    for (let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
    if (dist >= 15 && rows[i-1].num === n) { cnt++; if(rows[i].num===0) cntB++; }
  }
  if (cnt >= 20) console.log('  Dist>=15 + Pred='+String(n).padStart(2)+': '+cntB+'/'+cnt+' ('+p(cntB,cnt)+'%)' + (cntB/cnt*100 > 10 ? ' ***' : ''));
}

// ============ TESTE 6: TRES NUMEROS CONSECUTIVOS IGUAIS? ============
console.log('\n--- TESTE 6: Mesmo numero aparece 2x nas ultimas 3 ---');
for (let n = 1; n <= 14; n++) {
  let cnt=0, cntB=0;
  for (let i = 3; i < T; i++) {
    let count = 0;
    for (let j=1;j<=3;j++) if(rows[i-j].num===n) count++;
    if (count >= 2) { cnt++; if (rows[i].num===0) cntB++; }
  }
  if (cnt >= 10) console.log('  '+String(n).padStart(2)+' 2x nas ult3: '+cntB+'/'+cnt+' ('+p(cntB,cnt)+'%)');
}

// ============ TESTE 7: TEMPO REAL - MINUTOS DESDE ULTIMO BRANCO ============
console.log('\n--- TESTE 7: Minutos desde ultimo branco (temporal) ---');
// Cada rodada = ~30seg, dist*30/60 = minutos
for (let minD = 5; minD <= 30; minD += 5) {
  const distMin = Math.ceil(minD * 2); // rodadas equivalentes
  let cnt=0, cntB=0;
  for (let i=1;i<T;i++){
    let dist=999;
    for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
    if(dist>=distMin&&dist<distMin+10){cnt++;if(rows[i].num===0)cntB++;}
  }
  console.log('  ~'+minD+'min (dist '+distMin+'-'+(distMin+9)+'): '+p(cntB,cnt)+'% ('+cntB+'/'+cnt+')');
}

// ============ TESTE 8: MULTI-FATOR PURAMENTE BASEADO EM DISTÂNCIA ============
console.log('\n--- TESTE 8: Score baseado APENAS em distancia ---');
function scoreDistancia(dist) {
  if (dist >= 50) return 5;
  if (dist >= 40) return 4;
  if (dist >= 30) return 3;
  if (dist >= 20) return 2;
  if (dist >= 15) return 1;
  return 0;
}
for (let th = 1; th <= 5; th++) {
  let ap=0, ac=0, lu=0;
  for (let i=1;i<T;i++){
    let dist=999;
    for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
    if(scoreDistancia(dist)>=th){ap++;if(rows[i].num===0){ac++;lu+=13;}else lu-=1;}
  }
  console.log('  ScoreDist>='+th+': '+ap+' apostas, '+ac+' acertos ('+p(ac,ap)+'%), ROI='+(ap>0?(lu/ap*100).toFixed(1):'0')+'%');
}

// ============ TESTE 9: Dist + Seq cor + Pred combinado ============
console.log('\n--- TESTE 9: Combinacao Dist>=20 + fatores ---');
// Dist>=20 sozinha
let d20=0,d20B=0;
for(let i=1;i<T;i++){let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}if(dist>=20){d20++;if(rows[i].num===0)d20B++;}}
console.log('  Dist>=20 sozinha: '+d20B+'/'+d20+' ('+p(d20B,d20)+'%)');

// Dist>=20 + pred in [1,8,10,13]
let d20p=0,d20pB=0;
for(let i=1;i<T;i++){let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}if(dist>=20&&[1,8,10,13].includes(rows[i-1].num)){d20p++;if(rows[i].num===0)d20pB++;}}
console.log('  Dist>=20 + pred=1/8/10/13: '+d20pB+'/'+d20p+' ('+p(d20pB,d20p)+'%)');

// Dist>=20 + seq cor >=3
let d20s=0,d20sB=0;
for(let i=1;i<T;i++){
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist<20)continue;
  let seqCor=0;
  if(i>0){const lc=rows[i-1].num>=1&&rows[i-1].num<=7?'V':'P';for(let j=1;j<=10&&i-j>=0;j++){const c=rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P';if(c===lc)seqCor++;else break;}}
  if(seqCor>=3){d20s++;if(rows[i].num===0)d20sB++;}
}
console.log('  Dist>=20 + seqCor>=3: '+d20sB+'/'+d20s+' ('+p(d20sB,d20s)+'%)');

// Dist>=20 + 11+12 nas ultimas 4
let d20par=0,d20parB=0;
for(let i=4;i<T;i++){
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist<20)continue;
  let has11=false,has12=false;
  for(let j=1;j<=4;j++){if(rows[i-j].num===11)has11=true;if(rows[i-j].num===12)has12=true;}
  if(has11&&has12){d20par++;if(rows[i].num===0)d20parB++;}
}
console.log('  Dist>=20 + par 11+12: '+d20parB+'/'+d20par+' ('+p(d20parB,d20par)+'%)');

// ============ TESTE 10: Branco em cluster vs isolado ============
console.log('\n--- TESTE 10: Brancos em cluster (dist 1-5 do anterior) ---');
let cluster=0, isolado=0;
for(let i=1;i<T;i++){
  if(rows[i].num!==0) continue;
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist<=5) cluster++; else isolado++;
}
console.log('  Cluster (dist<=5): '+cluster+' ('+p(cluster,cluster+isolado)+'%)');
console.log('  Isolado (dist>5): '+isolado+' ('+p(isolado,cluster+isolado)+'%)');
console.log('  Implicacao: Apos um branco, nos proximos 5 a prob e elevada');
// Taxa exata dist 1-5 apos branco
let postB=0,postBB=0;
for(let i=1;i<T;i++){
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist>=1&&dist<=5){postB++;if(rows[i].num===0)postBB++;}
}
console.log('  Taxa branco quando dist 1-5: '+p(postBB,postB)+'% ('+postBB+'/'+postB+')');

// ============ TESTE 11: VELOCIDADES DE RETORNO ============
console.log('\n--- TESTE 11: Prob cumulativa (branco em ate N rodadas apos ultimo) ---');
const cumulProb = {};
for(let i=1;i<T;i++){
  if(rows[i].num!==0) continue;
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist!==999) { if(!cumulProb[dist]) cumulProb[dist]=0; cumulProb[dist]++; }
}
let acum = 0;
const totalGaps = Object.values(cumulProb).reduce((a,b)=>a+b,0);
for (let d = 1; d <= 50; d++) {
  acum += (cumulProb[d] || 0);
  if (d % 5 === 0 || d <= 5) console.log('  Ate dist '+String(d).padStart(2)+': '+p(acum,totalGaps)+'% dos brancos ja cairam');
}

// ============ TESTE 12: MELHOR JANELA DE ENTRADA ============
console.log('\n--- TESTE 12: Janela otima de aposta (entrar de dist X ate branco cair) ---');
for (let entry = 10; entry <= 40; entry += 5) {
  // Se entrar quando dist=entry e apostar ate acertar, quantas apostas em media?
  let totalApostas = 0, totalSessoes = 0;
  let emSessao = false, apostasAtual = 0;
  for (let i=1;i<T;i++){
    let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
    if(!emSessao && dist >= entry) { emSessao = true; apostasAtual = 0; }
    if(emSessao){
      apostasAtual++;
      if(rows[i].num===0){
        totalSessoes++;
        totalApostas+=apostasAtual;
        emSessao=false;
      }
    }
  }
  const media = totalSessoes > 0 ? (totalApostas/totalSessoes).toFixed(1) : '?';
  const roiPorSessao = totalSessoes > 0 ? ((13 - (totalApostas/totalSessoes - 1)) / (totalApostas/totalSessoes) * 100).toFixed(1) : '?';
  console.log('  Entrar em dist>='+String(entry).padStart(2)+': '+totalSessoes+' sessoes, media '+media+' apostas/sessao, ROI esperado: '+roiPorSessao+'%');
}
