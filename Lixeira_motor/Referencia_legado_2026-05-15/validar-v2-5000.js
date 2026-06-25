const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s, ts: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

const ctrl = {4:4, 6:4, 10:4, 14:4, 2:2, 9:2, 8:4};

function calcScoreV1(i) {
  let score = 0, dist = 999;
  for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
  if (dist >= 30) score += 3; else if (dist >= 20) score += 2; else if (dist >= 15) score += 1; else if (dist <= 3) score -= 1;
  let zona = false;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { if (ctrl[rows[i-j].num] !== undefined && j <= ctrl[rows[i-j].num]) { zona = true; break; } }
  if (zona) score += 1;
  let t5=false, t13=false, t7=false;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { if(rows[i-j].num===5)t5=true; if(rows[i-j].num===13)t13=true; if(rows[i-j].num===7)t7=true; }
  if(t5&&!t13)score+=2; if(t13&&!t5)score-=2; if(t5&&t13)score-=1; if(t7&&t5&&!t13)score+=1;
  return { score, dist };
}

function calcScoreV2(i) {
  let score = 0, dist = 999;
  for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
  if (dist >= 30) score += 3; else if (dist >= 20) score += 2; else if (dist >= 15) score += 1; else if (dist <= 3) score -= 1;
  let zona = false;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { if (ctrl[rows[i-j].num] !== undefined && j <= ctrl[rows[i-j].num]) { zona = true; break; } }
  if (zona) score += 1;
  let t5=false, t13=false, t7=false, t1=false, t3=false;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { 
    if(rows[i-j].num===5)t5=true; if(rows[i-j].num===13)t13=true; 
    if(rows[i-j].num===7)t7=true; if(rows[i-j].num===1)t1=true;
    if(rows[i-j].num===3)t3=true;
  }
  if(t5&&!t13)score+=2; if(t13&&!t5)score-=2; if(t5&&t13)score-=1; if(t7&&t5&&!t13)score+=1;
  if (t1) score -= 1;
  if (t3 && !t13) score += 1;
  let hasFake3 = false;
  for (let j = 1; j <= 3 && i-j>=0; j++) if (rows[i-j].num===11||rows[i-j].num===12) hasFake3 = true;
  if (hasFake3) score += 1;
  let seqCor = 0;
  if (i > 0) {
    const lastCor = rows[i-1].num >= 1 && rows[i-1].num <= 7 ? 'V' : 'P';
    for (let j = 1; j <= 10 && i-j>=0; j++) { const c = rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P'; if(c===lastCor)seqCor++;else break; }
  }
  if (seqCor >= 3) score += 1;
  return { score, dist, t1, t3, t5, t13, t7, hasFake3, seqCor, zona };
}

console.log('='.repeat(70));
console.log('  VALIDACAO SCORE V2 — 5000 RODADAS COMPLETAS');
console.log('='.repeat(70) + '\n');

const startIdx = 10;

console.log('--- V1 (original) ---');
for (let th = 3; th <= 7; th++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV1(i); if(score>=th){ap++;if(rows[i].num===0){ac++;s+=13;}else{s-=1;}} }
  console.log('  Score>='+th+': '+String(ap).padStart(5)+' apostas, '+String(ac).padStart(4)+' acertos ('+p(ac,ap)+'%), Lucro: '+String(s).padStart(5)+', ROI: '+(ap>0?(s/ap*100).toFixed(1):'0')+'%');
}

console.log('\n--- V2 (melhorado) ---');
for (let th = 3; th <= 8; th++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV2(i); if(score>=th){ap++;if(rows[i].num===0){ac++;s+=13;}else{s-=1;}} }
  console.log('  Score>='+th+': '+String(ap).padStart(5)+' apostas, '+String(ac).padStart(4)+' acertos ('+p(ac,ap)+'%), Lucro: '+String(s).padStart(5)+', ROI: '+(ap>0?(s/ap*100).toFixed(1):'0')+'%');
}

// Distribuicao V2
console.log('\n--- Distribuicao Score V2 ---');
console.log('Score | Total | Brancos | Taxa');
const distV2 = {};
for (let i = startIdx; i < T; i++) { const {score}=calcScoreV2(i); if(!distV2[score])distV2[score]={t:0,b:0}; distV2[score].t++; if(rows[i].num===0)distV2[score].b++; }
for (const k of Object.keys(distV2).map(Number).sort((a,b)=>a-b)) { const v=distV2[k]; console.log(String(k).padStart(4)+'  | '+String(v.t).padStart(5)+' | '+String(v.b).padStart(5)+'   | '+p(v.b,v.t)+'%'); }

// Consistencia por blocos de 500
console.log('\n--- Consistencia V2>=5 por blocos de 500 ---');
console.log('Bloco        | Apostas | Acertos | Taxa  | ROI');
for (let bloco = 0; bloco < Math.floor(T/500); bloco++) {
  const s = bloco*500, e = Math.min(s+500, T);
  let ap=0, ac=0, lu=0;
  for (let i = Math.max(s, startIdx); i < e; i++) { const {score}=calcScoreV2(i); if(score>=5){ap++;if(rows[i].num===0){ac++;lu+=13;}else{lu-=1;}} }
  const hr1=rows[s]?rows[s].hr.substring(0,5):'?', hr2=rows[e-1]?rows[e-1].hr.substring(0,5):'?';
  console.log('  '+hr1+'-'+hr2+' | '+String(ap).padStart(5)+'   | '+String(ac).padStart(5)+'   | '+p(ac,ap).padStart(5)+'% | '+(ap>0?(lu/ap*100).toFixed(1):'0')+'%');
}

console.log('\n--- Consistencia V2>=6 por blocos de 500 ---');
console.log('Bloco        | Apostas | Acertos | Taxa  | ROI');
for (let bloco = 0; bloco < Math.floor(T/500); bloco++) {
  const s = bloco*500, e = Math.min(s+500, T);
  let ap=0, ac=0, lu=0;
  for (let i = Math.max(s, startIdx); i < e; i++) { const {score}=calcScoreV2(i); if(score>=6){ap++;if(rows[i].num===0){ac++;lu+=13;}else{lu-=1;}} }
  const hr1=rows[s]?rows[s].hr.substring(0,5):'?', hr2=rows[e-1]?rows[e-1].hr.substring(0,5):'?';
  console.log('  '+hr1+'-'+hr2+' | '+String(ap).padStart(5)+'   | '+String(ac).padStart(5)+'   | '+p(ac,ap).padStart(5)+'% | '+(ap>0?(lu/ap*100).toFixed(1):'0')+'%');
}

// Drawdown
console.log('\n--- Drawdown maximo ---');
for (let th of [4, 5, 6]) {
  let maxD=0, curD=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV2(i); if(score>=th){if(rows[i].num===0)curD=0;else{curD++;if(curD>maxD)maxD=curD;}} }
  console.log('  V2 Score>='+th+': max '+maxD+' perdas consecutivas (banca minima: '+(maxD*2)+' unidades)');
}

// Validar fator 1
console.log('\n--- Fator 1 (supressor) global ---');
let c1a=0,c1ac=0,s1a=0,s1ac=0;
for (let i = startIdx; i < T; i++) { const info=calcScoreV2(i); if(info.score>=5){if(info.t1){c1a++;if(rows[i].num===0)c1ac++;}else{s1a++;if(rows[i].num===0)s1ac++;}} }
console.log('  Score>=5 COM 1: '+c1ac+'/'+c1a+' ('+p(c1ac,c1a)+'%)');
console.log('  Score>=5 SEM 1: '+s1ac+'/'+s1a+' ('+p(s1ac,s1a)+'%)');

// Validar seq cor
console.log('\n--- Fator seq cor global ---');
let seqS=0,seqSB=0,seqN=0,seqNB=0;
for (let i = startIdx; i < T; i++) {
  let sc=0; if(i>0){const lc=rows[i-1].num>=1&&rows[i-1].num<=7?'V':'P';for(let j=1;j<=10&&i-j>=0;j++){const c=rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P';if(c===lc)sc++;else break;}}
  if(sc>=3){seqS++;if(rows[i].num===0)seqSB++;}else{seqN++;if(rows[i].num===0)seqNB++;}
}
console.log('  Com seq 3+: branco='+p(seqSB,seqS)+'% (n='+seqS+')');
console.log('  Sem seq 3+: branco='+p(seqNB,seqN)+'% (n='+seqN+')');

// V2 por hora
console.log('\n--- V2>=5 por hora ---');
const porH={};
for (let i = startIdx; i < T; i++) { const {score}=calcScoreV2(i); const h=rows[i].h; if(!porH[h])porH[h]={ap:0,ac:0}; if(score>=5){porH[h].ap++;if(rows[i].num===0)porH[h].ac++;} }
console.log('Hora | Apostas | Acertos | Taxa  | ROI');
for (const h of Object.keys(porH).map(Number).sort((a,b)=>a-b)) { const v=porH[h]; if(v.ap>0){const lu=v.ac*13-(v.ap-v.ac); console.log(String(h).padStart(3)+'h | '+String(v.ap).padStart(5)+'   | '+String(v.ac).padStart(5)+'   | '+p(v.ac,v.ap).padStart(5)+'% | '+(lu/v.ap*100).toFixed(1)+'%');} }

// RESUMO
console.log('\n'+'='.repeat(70));
console.log('  RESUMO — MELHOR CONFIGURACAO');
console.log('='.repeat(70)+'\n');
let bAp=0,bAc=0,bS=0; for(let i=startIdx;i<T;i++){const{score}=calcScoreV2(i);if(score>=5){bAp++;if(rows[i].num===0){bAc++;bS+=13;}else{bS-=1;}}}
console.log('V2 Score>=5 (5000 rodadas):');
console.log('  Apostas: '+bAp+' | Acertos: '+bAc+' | Taxa: '+p(bAc,bAp)+'% | Lucro: '+bS+' | ROI: '+(bS/bAp*100).toFixed(1)+'%');
console.log('  Media: '+(bAp/(T/120)).toFixed(1)+' apostas/hora, '+(bAc/(T/120)).toFixed(1)+' acertos/hora');
let bAp2=0,bAc2=0,bS2=0; for(let i=startIdx;i<T;i++){const{score}=calcScoreV2(i);if(score>=6){bAp2++;if(rows[i].num===0){bAc2++;bS2+=13;}else{bS2-=1;}}}
console.log('\nV2 Score>=6 (5000 rodadas):');
console.log('  Apostas: '+bAp2+' | Acertos: '+bAc2+' | Taxa: '+p(bAc2,bAp2)+'% | Lucro: '+bS2+' | ROI: '+(bS2/bAp2*100).toFixed(1)+'%');
console.log('  Media: '+(bAp2/(T/120)).toFixed(1)+' apostas/hora, '+(bAc2/(T/120)).toFixed(1)+' acertos/hora');
let maxD=0,curD=0; for(let i=startIdx;i<T;i++){const{score}=calcScoreV2(i);if(score>=5){if(rows[i].num===0)curD=0;else{curD++;if(curD>maxD)maxD=curD;}}}
console.log('\n  Drawdown V2>=5: max '+maxD+' perdas seguidas');
console.log('  Banca minima sugerida: '+(maxD*2)+' unidades');
