const fs = require('fs');
const data = fs.readFileSync('dados-novos.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s, ts: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse(); // cronológico
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

console.log('='.repeat(70));
console.log('  ANALISE COMPLETA — 10000 RODADAS (02/05 a 05/05/2026)');
console.log('='.repeat(70));
console.log('Total rodadas:', T);
const totalB = rows.filter(r => r.num === 0).length;
console.log('Total brancos:', totalB, '(' + p(totalB, T) + '%)');
console.log('');

// ============ SCORE V3 ============
function calcScoreV3(i) {
  let score = 0, dist = 999;
  for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
  if (dist >= 30) score += 3; else if (dist >= 20) score += 2; else if (dist >= 15) score += 1; else if (dist <= 3) score -= 1;

  let last2 = [], last4 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) { if (j <= 2) last2.push(rows[i-j].num); last4.push(rows[i-j].num); }

  const has2in2 = last2.includes(2), has2in4 = last4.includes(2);
  if (has2in2) score += 2; else if (has2in4) score += 1;

  const has12in2 = last2.includes(12), has12in4 = last4.includes(12);
  if (has12in2) score += 2; else if (has12in4) score += 1;

  if (last2.includes(14)) score += 1;
  if (last4.includes(8)) score += 1;

  const suppressors = [4, 5, 9, 10, 11];
  let suppCount = 0;
  for (const s of suppressors) { if (last2.includes(s)) suppCount++; }
  if (suppCount >= 2) score -= 2; else if (suppCount === 1) score -= 1;

  if (last4.includes(1)) score -= 1;

  if (i > 0) {
    const pred = rows[i-1].num;
    if (pred === 12) score += 2;
    else if (pred === 7 || pred === 13) score += 1;
    else if ([1, 3, 4, 5, 9, 10, 11].includes(pred)) score -= 1;
  }

  const seen = {}; let hasDoublet = false;
  for (const x of last4) { seen[x] = (seen[x]||0)+1; if(seen[x]>=2) hasDoublet = true; }
  if (hasDoublet) score += 1;

  const has7in4 = last4.includes(7);
  if (has2in4 && has12in4) score += 1;
  if (has2in4 && has7in4) score += 1;

  const has3in4 = last4.includes(3), has5in4 = last4.includes(5);
  const has9in4 = last4.includes(9), has4in4 = last4.includes(4);
  if (has3in4 && has9in4) score -= 1;
  if (has4in4 && has9in4) score -= 1;
  if (has5in4 && last4.includes(8)) score -= 1;

  let seqCor = 0;
  if (i > 0) {
    const lastCor = rows[i-1].num >= 1 && rows[i-1].num <= 7 ? 'V' : 'P';
    for (let j = 1; j <= 10 && i-j>=0; j++) { const c = rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P'; if(c===lastCor) seqCor++; else break; }
  }
  if (seqCor >= 3) score += 1;

  return { score, dist };
}

// ============ VALIDACAO V3 ============
const startIdx = 10;
console.log('--- SCORE V3 — PERFORMANCE POR THRESHOLD ---');
for (let th = 3; th <= 9; th++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(score>=th){ap++;if(rows[i].num===0){ac++;s+=13;}else{s-=1;}} }
  console.log('  Score>='+th+': '+String(ap).padStart(5)+' apostas, '+String(ac).padStart(4)+' acertos ('+p(ac,ap)+'%), Lucro: '+String(s).padStart(5)+', ROI: '+(ap>0?(s/ap*100).toFixed(1):'0')+'%');
}

// ============ DISTRIBUICAO ============
console.log('\n--- DISTRIBUICAO SCORE V3 ---');
const distV3 = {};
for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(!distV3[score])distV3[score]={t:0,b:0}; distV3[score].t++; if(rows[i].num===0)distV3[score].b++; }
console.log('Score | Total | Brancos | Taxa');
for (const k of Object.keys(distV3).map(Number).sort((a,b)=>a-b)) { const v=distV3[k]; console.log(String(k).padStart(4)+'  | '+String(v.t).padStart(5)+' | '+String(v.b).padStart(5)+'   | '+p(v.b,v.t)+'%'); }

// ============ DRAWDOWN ============
console.log('\n--- DRAWDOWN MAXIMO ---');
for (let th of [5, 6, 7]) {
  let maxD=0, curD=0, total=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(score>=th){total++;if(rows[i].num===0)curD=0;else{curD++;if(curD>maxD)maxD=curD;}} }
  console.log('  V3>='+th+': max '+maxD+' perdas consecutivas ('+total+' apostas total)');
}

// ============ CONSISTENCIA POR BLOCOS DE 1000 ============
console.log('\n--- CONSISTENCIA V3>=6 POR BLOCOS DE 1000 ---');
console.log('Bloco    | Apostas | Acertos | Taxa   | ROI');
for (let bloco = 0; bloco < Math.ceil(T/1000); bloco++) {
  const s = bloco*1000, e = Math.min(s+1000, T);
  let ap=0, ac=0, lu=0;
  for (let i = Math.max(s, startIdx); i < e; i++) { const {score}=calcScoreV3(i); if(score>=6){ap++;if(rows[i].num===0){ac++;lu+=13;}else{lu-=1;}} }
  console.log('  '+String(s).padStart(5)+'-'+String(e).padStart(5)+' | '+String(ap).padStart(5)+'   | '+String(ac).padStart(5)+'   | '+p(ac,ap).padStart(5)+'% | '+(ap>0?(lu/ap*100).toFixed(1):'0')+'%');
}

// ============ POR HORA ============
console.log('\n--- V3>=6 POR HORA ---');
const porH={};
for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); const h=rows[i].h; if(!porH[h])porH[h]={ap:0,ac:0}; if(score>=6){porH[h].ap++;if(rows[i].num===0)porH[h].ac++;} }
console.log('Hora | Apostas | Acertos | Taxa  | ROI');
for (const h of Object.keys(porH).map(Number).sort((a,b)=>a-b)) { const v=porH[h]; if(v.ap>0){const lu=v.ac*13-(v.ap-v.ac); console.log(String(h).padStart(3)+'h | '+String(v.ap).padStart(5)+'   | '+String(v.ac).padStart(5)+'   | '+p(v.ac,v.ap).padStart(5)+'% | '+(lu/v.ap*100).toFixed(1)+'%');} }

// ============ ANALISE DE CADA NUMERO (janela 4) ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE INDIVIDUAL — CADA NUMERO NAS ULTIMAS 4');
console.log('='.repeat(70));
console.log('Num | COM -> branco | SEM -> branco | Diff   | Papel');
for (let n = 1; n <= 14; n++) {
  let comN=0, comNB=0, semN=0, semNB=0;
  for (let i = 4; i < T; i++) {
    let has = false;
    for (let j = 1; j <= 4; j++) if (rows[i-j].num === n) has = true;
    if (has) { comN++; if (rows[i].num===0) comNB++; } else { semN++; if (rows[i].num===0) semNB++; }
  }
  const taxaCom = comN>0?comNB/comN*100:0, taxaSem = semN>0?semNB/semN*100:0;
  const diff = taxaCom - taxaSem;
  const papel = diff > 2 ? 'BOOSTER' : diff < -2 ? 'SUPPRESSOR' : 'neutro';
  console.log(String(n).padStart(2) + '  | ' + p(comNB,comN).padStart(5)+'% ('+comNB+'/'+comN+')' + ' | ' + p(semNB,semN).padStart(5)+'% ('+semNB+'/'+semN+')' + ' | '+(diff>=0?'+':'')+diff.toFixed(1)+'% | '+papel);
}

// ============ TESTE JANELA 2 ============
console.log('\n--- CADA NUMERO NAS ULTIMAS 2 ---');
console.log('Num | COM -> branco | SEM -> branco | Diff   | Papel');
for (let n = 1; n <= 14; n++) {
  let comN=0, comNB=0, semN=0, semNB=0;
  for (let i = 2; i < T; i++) {
    let has = false;
    for (let j = 1; j <= 2; j++) if (rows[i-j].num === n) has = true;
    if (has) { comN++; if (rows[i].num===0) comNB++; } else { semN++; if (rows[i].num===0) semNB++; }
  }
  const taxaCom = comN>0?comNB/comN*100:0, taxaSem = semN>0?semNB/semN*100:0;
  const diff = taxaCom - taxaSem;
  const papel = diff > 2 ? 'BOOSTER' : diff < -2 ? 'SUPPRESSOR' : 'neutro';
  console.log(String(n).padStart(2) + '  | ' + p(comNB,comN).padStart(5)+'% ('+comNB+'/'+comN+')' + ' | ' + p(semNB,semN).padStart(5)+'% ('+semNB+'/'+semN+')' + ' | '+(diff>=0?'+':'')+diff.toFixed(1)+'% | '+papel);
}

// ============ PREDECESSOR IMEDIATO ============
console.log('\n--- PREDECESSOR IMEDIATO (ultimo antes do branco) ---');
console.log('Num | Apareceu Nx | Taxa que virou branco');
for (let n = 1; n <= 14; n++) {
  let total = 0, virou = 0;
  for (let i = 0; i < T-1; i++) { if (rows[i].num === n) { total++; if (rows[i+1].num === 0) virou++; } }
  console.log(String(n).padStart(2) + '  | ' + String(total).padStart(5) + 'x    | ' + p(virou,total) + '% (' + virou + '/' + total + ')');
}

// ============ PARES NAS ULTIMAS 4 ============
console.log('\n--- TOP 20 PARES QUE PRECEDEM BRANCO ---');
const pares = [];
for (let a = 1; a <= 14; a++) {
  for (let b = a+1; b <= 14; b++) {
    let com=0, comB=0;
    for (let i = 4; i < T; i++) {
      let hasA=false, hasB=false;
      for (let j=1;j<=4;j++){if(rows[i-j].num===a)hasA=true;if(rows[i-j].num===b)hasB=true;}
      if (hasA && hasB) { com++; if (rows[i].num===0) comB++; }
    }
    if (com >= 20) pares.push({a,b,com,comB,taxa:comB/com*100});
  }
}
pares.sort((x,y) => y.taxa - x.taxa);
for (const pr of pares.slice(0, 20)) { console.log('  '+pr.a+'+'+pr.b+': '+pr.comB+'/'+pr.com+' ('+pr.taxa.toFixed(1)+'%)'); }

console.log('\n--- TOP 15 PARES BLOQUEADORES (0% / baixa taxa) ---');
const bloq = pares.filter(p => p.taxa < 3 && p.com >= 30).sort((a,b) => a.taxa - b.taxa || b.com - a.com);
for (const pr of bloq.slice(0, 15)) { console.log('  '+pr.a+'+'+pr.b+': '+pr.comB+'/'+pr.com+' ('+pr.taxa.toFixed(1)+'%)'); }

// ============ DOUBLET ============
console.log('\n--- DOUBLET (repeticao nas ultimas 4) ---');
let rep=0, repB=0, noRep=0, noRepB=0;
for (let i = 4; i < T; i++) {
  let hasRepeat=false; const last4=[];
  for (let j=1;j<=4;j++) last4.push(rows[i-j].num);
  const seen={}; for(const x of last4){seen[x]=(seen[x]||0)+1;if(seen[x]>=2)hasRepeat=true;}
  if(hasRepeat){rep++;if(rows[i].num===0)repB++;}else{noRep++;if(rows[i].num===0)noRepB++;}
}
console.log('COM repeticao: branco='+p(repB,rep)+'% ('+repB+'/'+rep+')');
console.log('SEM repeticao: branco='+p(noRepB,noRep)+'% ('+noRepB+'/'+noRep+')');

// ============ SEQUENCIA DE COR ============
console.log('\n--- SEQUENCIA DE COR ---');
for (let minSeq = 3; minSeq <= 6; minSeq++) {
  let cnt=0, cntB=0;
  for (let i = 1; i < T; i++) {
    let seqCor=0;
    const lastCor = rows[i-1].num>=1&&rows[i-1].num<=7?'V':'P';
    for(let j=1;j<=10&&i-j>=0;j++){const c=rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P';if(c===lastCor)seqCor++;else break;}
    if(seqCor>=minSeq){cnt++;if(rows[i].num===0)cntB++;}
  }
  console.log('  Seq>='+minSeq+': branco='+p(cntB,cnt)+'% ('+cntB+'/'+cnt+')');
}

// ============ GAPS ENTRE BRANCOS ============
console.log('\n--- DISTANCIAS ENTRE BRANCOS ---');
let lastB=-1; const gaps=[];
for(let i=0;i<T;i++){if(rows[i].num===0){if(lastB>=0)gaps.push(i-lastB);lastB=i;}}
console.log('Total gaps:', gaps.length);
console.log('Media:', (gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(1));
console.log('Mediana:', gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)]);
console.log('Min:', Math.min(...gaps), 'Max:', Math.max(...gaps));
// Faixas
const faixas = [[1,5],[6,10],[11,15],[16,20],[21,30],[31,50],[51,999]];
console.log('Distribuicao:');
for (const [lo,hi] of faixas) { const cnt = gaps.filter(g=>g>=lo&&g<=hi).length; console.log('  '+lo+'-'+hi+': '+cnt+' ('+p(cnt,gaps.length)+'%)'); }

// ============ SOMA ULTIMAS 4 ============
console.log('\n--- SOMA ULTIMOS 4 ---');
const somaFaixas = [[0,15],[16,25],[26,35],[36,45],[46,56]];
for (const [lo,hi] of somaFaixas) {
  let cnt=0, cntB=0;
  for (let i=4;i<T;i++){let soma=0;for(let j=1;j<=4;j++)soma+=rows[i-j].num;if(soma>=lo&&soma<=hi){cnt++;if(rows[i].num===0)cntB++;}}
  console.log('  Soma '+lo+'-'+hi+': branco='+p(cntB,cnt)+'% ('+cntB+'/'+cnt+')');
}
