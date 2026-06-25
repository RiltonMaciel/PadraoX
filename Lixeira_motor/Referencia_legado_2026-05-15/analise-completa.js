const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, hr, h, m, s, ts: h * 3600 + m * 60 + s, minKey: h + ':' + String(m).padStart(2, '0') };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

// ======== 1. G1 vs G2 ========
console.log('='.repeat(70));
console.log('  1. G1 vs G2 — Posicao no minuto');
console.log('='.repeat(70) + '\n');

const porMinuto = {};
for (const r of rows) {
  if (!porMinuto[r.minKey]) porMinuto[r.minKey] = [];
  porMinuto[r.minKey].push(r);
}

let g1t=0,g1b=0,g1_11=0,g1_12=0,g2t=0,g2b=0,g2_11=0,g2_12=0;
const g1n={},g2n={};
for (const [,jogadas] of Object.entries(porMinuto)) {
  const sorted = jogadas.sort((a,b) => a.s - b.s);
  if (sorted.length >= 1) { const g=sorted[0]; g1t++; if(g.num===0)g1b++; if(g.num===11)g1_11++; if(g.num===12)g1_12++; g1n[g.num]=(g1n[g.num]||0)+1; }
  if (sorted.length >= 2) { const g=sorted[1]; g2t++; if(g.num===0)g2b++; if(g.num===11)g2_11++; if(g.num===12)g2_12++; g2n[g.num]=(g2n[g.num]||0)+1; }
}
console.log('G1 (1o do min): '+g1t+' | Branco: '+p(g1b,g1t)+'% ('+g1b+') | 11:'+p(g1_11,g1t)+'% | 12:'+p(g1_12,g1t)+'% | Pool:'+p(g1b+g1_11+g1_12,g1t)+'%');
console.log('G2 (2o do min): '+g2t+' | Branco: '+p(g2b,g2t)+'% ('+g2b+') | 11:'+p(g2_11,g2t)+'% | 12:'+p(g2_12,g2t)+'% | Pool:'+p(g2b+g2_11+g2_12,g2t)+'%');
console.log('\nTop5 G1: '+Object.entries(g1n).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>n+'('+p(v,g1t)+'%)').join(', '));
console.log('Top5 G2: '+Object.entries(g2n).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>n+'('+p(v,g2t)+'%)').join(', '));
console.log('\n>>> BRANCO prefere G1 ou G2? G1='+p(g1b,g1t)+'% vs G2='+p(g2b,g2t)+'%\n');

// ======== 2. POR HORA ========
console.log('='.repeat(70));
console.log('  2. ANALISE POR HORA');
console.log('='.repeat(70) + '\n');
const porHora={};
for(const r of rows){if(!porHora[r.h])porHora[r.h]={t:0,b0:0,b11:0,b12:0};porHora[r.h].t++;if(r.num===0)porHora[r.h].b0++;if(r.num===11)porHora[r.h].b11++;if(r.num===12)porHora[r.h].b12++;}
console.log('Hora | Rodadas | Branco(0) | 11+12  | Pool');
for(const h of Object.keys(porHora).map(Number).sort((a,b)=>a-b)){
  const v=porHora[h]; const pool=v.b0+v.b11+v.b12;
  console.log(String(h).padStart(3)+'h | '+String(v.t).padStart(5)+'   | '+p(v.b0,v.t).padStart(5)+'%    | '+p(v.b11+v.b12,v.t).padStart(5)+'%  | '+p(pool,v.t).padStart(5)+'%');
}
console.log('');

// ======== 3. FAIXAS DE 30 MIN ========
console.log('='.repeat(70));
console.log('  3. FAIXAS DE 30 MIN');
console.log('='.repeat(70) + '\n');
const f30={};
for(const r of rows){const f=r.h+':'+(r.m<30?'00':'30');if(!f30[f])f30[f]={t:0,b0:0,b11:0,b12:0};f30[f].t++;if(r.num===0)f30[f].b0++;if(r.num===11)f30[f].b11++;if(r.num===12)f30[f].b12++;}
console.log('Faixa    | Rod | Branco |  11+12 | Pool  | Real/Pool');
for(const[f,v] of Object.entries(f30).sort((a,b)=>{const[ah,am]=a[0].split(':').map(Number);const[bh,bm]=b[0].split(':').map(Number);return(ah*60+am)-(bh*60+bm);})){
  const pool=v.b0+v.b11+v.b12; const ratio=pool>0?(v.b0/pool*100).toFixed(0):'0';
  console.log(f.padEnd(8)+' | '+String(v.t).padStart(3)+' | '+p(v.b0,v.t).padStart(5)+'% | '+p(v.b11+v.b12,v.t).padStart(5)+'%  | '+p(pool,v.t).padStart(5)+'% | '+ratio+'% real');
}
console.log('');

// ======== 4. DETECÇÃO DE REC ========
console.log('='.repeat(70));
console.log('  4. DETECCAO DE REC — Periodos sem branco');
console.log('='.repeat(70) + '\n');
const bIdx=[]; rows.forEach((r,i)=>{if(r.num===0)bIdx.push(i);});
const gaps=[];
if(bIdx[0]>0) gaps.push({s:0,e:bIdx[0]-1,len:bIdx[0]});
for(let i=1;i<bIdx.length;i++){const gap=bIdx[i]-bIdx[i-1]-1;if(gap>0)gaps.push({s:bIdx[i-1]+1,e:bIdx[i]-1,len:gap});}

const recs=gaps.filter(g=>g.len>=20);
console.log('Gaps total: '+gaps.length+' | REC(>=20): '+recs.length+' | REC longo(>=30): '+gaps.filter(g=>g.len>=30).length+' | Extremo(>=50): '+gaps.filter(g=>g.len>=50).length);
console.log('\nDistribuicao:');
const fg={'1-5':0,'6-10':0,'11-15':0,'16-20':0,'21-30':0,'31-50':0,'51+':0};
gaps.forEach(g=>{if(g.len<=5)fg['1-5']++;else if(g.len<=10)fg['6-10']++;else if(g.len<=15)fg['11-15']++;else if(g.len<=20)fg['16-20']++;else if(g.len<=30)fg['21-30']++;else if(g.len<=50)fg['31-50']++;else fg['51+']++;});
for(const[k,v] of Object.entries(fg)) console.log('  '+k.padEnd(6)+': '+v+' ('+p(v,gaps.length)+'%)');

console.log('\nRECs detalhados:');
console.log('  # | Hora inicio     | Hora fim        | Rodadas | Minutos | 11+12 | %11+12');
recs.forEach((g,i)=>{
  const sr=rows[g.s],er=rows[g.e]; const dm=Math.abs((er.ts-sr.ts)/60).toFixed(1);
  let c1112=0; for(let j=g.s;j<=g.e;j++){if(rows[j].num===11||rows[j].num===12)c1112++;}
  console.log('  '+String(i+1).padStart(2)+' | '+(sr.hr||'').padEnd(15)+' | '+(er.hr||'').padEnd(15)+' | '+String(g.len).padStart(5)+'   | '+dm.padStart(5)+'   | '+String(c1112).padStart(3)+'   | '+p(c1112,g.len)+'%');
});
console.log('');

// ======== 5. SINAIS ANTES DO REC ========
console.log('='.repeat(70));
console.log('  5. O QUE VEM ANTES DO REC?');
console.log('='.repeat(70) + '\n');
const antesRec={};
recs.forEach(g=>{for(let j=1;j<=10&&g.s-j>=0;j++){const n=rows[g.s-j].num;const k='p'+j;if(!antesRec[k])antesRec[k]={};antesRec[k][n]=(antesRec[k][n]||0)+1;}});
console.log('Numeros frequentes antes do REC:');
for(let pos=1;pos<=5;pos++){const k='p'+pos;if(!antesRec[k])continue;const s=Object.entries(antesRec[k]).sort((a,b)=>b[1]-a[1]).slice(0,4);console.log('  -'+pos+': '+s.map(([n,v])=>n+'('+v+'x)').join(', ')+(pos===1?' (ultima jogada antes do REC)':''));}
console.log('');
let rec13antes=0;
recs.forEach(g=>{for(let j=1;j<=5&&g.s-j>=0;j++){if(rows[g.s-j].num===13){rec13antes++;break;}}});
console.log('13 nas 5 antes do REC: '+rec13antes+'/'+recs.length+' ('+p(rec13antes,recs.length)+'%)');
let rec5antes=0;
recs.forEach(g=>{for(let j=1;j<=5&&g.s-j>=0;j++){if(rows[g.s-j].num===5){rec5antes++;break;}}});
console.log('5 nas 5 antes do REC: '+rec5antes+'/'+recs.length+' ('+p(rec5antes,recs.length)+'%)');
console.log('');

// ======== 6. DURANTE O REC ========
console.log('='.repeat(70));
console.log('  6. DURANTE O REC — Numeros dominantes');
console.log('='.repeat(70) + '\n');
let rV=0,rP=0,r11=0,r12=0,rT=0; const rN={};
recs.forEach(g=>{for(let j=g.s;j<=g.e;j++){rT++;const n=rows[j].num;rN[n]=(rN[n]||0)+1;const c=n===0?'B':[1,2,3,4,5,6,7].includes(n)?'V':'P';if(c==='V')rV++;if(c==='P')rP++; if(n===11)r11++;if(n===12)r12++;}});
console.log('Rodadas em REC: '+rT+' ('+p(rT,T)+'% do total)');
console.log('V='+p(rV,rT)+'% P='+p(rP,rT)+'% | 11+12='+p(r11+r12,rT)+'%');
console.log('\nTop nums no REC:');
Object.entries(rN).sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([n,v])=>{console.log('  '+String(n).padStart(2)+': '+p(v,rT)+'% ('+v+')');});
console.log('');

// ======== 7. FIM DO REC ========
console.log('='.repeat(70));
console.log('  7. COMO O REC TERMINA?');
console.log('='.repeat(70) + '\n');
console.log('Ultimas 5 rodadas do REC (sinais de fim):');
for(let pos=1;pos<=5;pos++){const nums={};recs.forEach(g=>{if(g.e-pos+1>=g.s){const n=rows[g.e-pos+1].num;nums[n]=(nums[n]||0)+1;}});const s=Object.entries(nums).sort((a,b)=>b[1]-a[1]).slice(0,4);console.log('  -'+pos+' do fim: '+s.map(([n,v])=>n+'('+v+'x)').join(', '));}
console.log('');
console.log('Numero que sai do REC (pos+1 apos ultimo):');
const fimN={};recs.forEach(g=>{if(g.e+1<T)fimN[rows[g.e+1].num]=(fimN[rows[g.e+1].num]||0)+1;});
Object.entries(fimN).sort((a,b)=>b[1]-a[1]).forEach(([n,v])=>{console.log('  '+n+': '+v+'x');});
console.log('');

// ======== 8. MODELO DE SCORE ========
console.log('='.repeat(70));
console.log('  8. MODELO DE PREVISAO — Score de probabilidade');
console.log('='.repeat(70) + '\n');

const ctrl={4:4,6:4,10:4,14:4,2:2,9:2,8:4};
const scores=[];
for(let i=10;i<T;i++){
  let score=0;
  let dist=999;for(let j=i-1;j>=0;j--){if(rows[j].num===0){dist=i-j;break;}}
  if(dist>=30)score+=3;else if(dist>=20)score+=2;else if(dist>=15)score+=1;else if(dist<=3)score-=1;
  let zona=false;for(let j=1;j<=4&&i-j>=0;j++){const n=rows[i-j].num;if(ctrl[n]!==undefined&&j<=ctrl[n]){zona=true;break;}}
  if(zona)score+=1;
  let t5=false,t13=false,t7=false;
  for(let j=1;j<=4&&i-j>=0;j++){if(rows[i-j].num===5)t5=true;if(rows[i-j].num===13)t13=true;if(rows[i-j].num===7)t7=true;}
  if(t5&&!t13)score+=2;if(t13&&!t5)score-=2;if(t5&&t13)score-=1;
  if(t7&&t5&&!t13)score+=1;
  scores.push({pos:i,score,real:rows[i].num===0?1:0,dist});
}

console.log('Score | Total | Brancos | Taxa   | Acao');
const fS={};scores.forEach(s=>{if(!fS[s.score])fS[s.score]={t:0,b:0};fS[s.score].t++;if(s.real)fS[s.score].b++;});
for(const k of Object.keys(fS).map(Number).sort((a,b)=>a-b)){
  const v=fS[k];const tx=(v.b/v.t*100).toFixed(1);
  let act='';if(parseFloat(tx)>10)act='*** APOSTAR ***';else if(parseFloat(tx)>7)act='** Atencao **';else if(parseFloat(tx)<3)act='(evitar)';
  console.log(String(k).padStart(4)+' | '+String(v.t).padStart(5)+' | '+String(v.b).padStart(5)+'   | '+tx.padStart(5)+'%  | '+act);
}
console.log('\nBaseline: 5.7%');
console.log('\nSimulacao (ROI com payout 14x):');
for(let th=-2;th<=6;th++){
  const ap=scores.filter(s=>s.score>=th);const ac=ap.filter(s=>s.real).length;
  const roi=ap.length>0?((ac*14-ap.length)/ap.length*100).toFixed(1):'0';
  console.log('  Score>='+String(th).padStart(2)+': '+String(ap.length).padStart(4)+' entradas, '+String(ac).padStart(3)+' acertos ('+p(ac,ap.length)+'%), ROI='+roi+'%');
}
