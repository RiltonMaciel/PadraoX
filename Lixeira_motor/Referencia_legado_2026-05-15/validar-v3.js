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

console.log('='.repeat(70));
console.log('  SCORE V3 — CORRIGIDO COM NOVOS MAPEAMENTOS');
console.log('='.repeat(70));
console.log('Total rodadas:', T, '\n');

// ============ V2 original (para comparação) ============
const ctrl = {4:4, 6:4, 10:4, 14:4, 2:2, 9:2, 8:4};

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
  return { score, dist };
}

// ============ V3 — NOVO MODELO ============
function calcScoreV3(i) {
  let score = 0, dist = 999;
  
  // --- FATOR 1: Distância do último branco ---
  for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
  if (dist >= 30) score += 3;
  else if (dist >= 20) score += 2;
  else if (dist >= 15) score += 1;
  else if (dist <= 3) score -= 1;
  
  // Coletar números nas últimas janelas
  let last4 = [], last2 = [], last6 = [];
  for (let j = 1; j <= 6 && i-j >= 0; j++) {
    if (j <= 2) last2.push(rows[i-j].num);
    if (j <= 4) last4.push(rows[i-j].num);
    last6.push(rows[i-j].num);
  }
  
  // --- FATOR 2: Número 2 (BOOSTER forte) ---
  // +5.9% nas últimas 4, +7.0% nas últimas 6
  const has2in4 = last4.includes(2);
  const has2in2 = last2.includes(2);
  if (has2in2) score += 2;       // muito forte nas últimas 2
  else if (has2in4) score += 1;  // ainda bom nas últimas 4
  
  // --- FATOR 3: Número 12 (BOOSTER fortíssimo nas últimas 2) ---
  // 13.2% nas últimas 2, 20% como predecessor imediato
  const has12in2 = last2.includes(12);
  const has12in4 = last4.includes(12);
  if (has12in2) score += 2;
  else if (has12in4) score += 1;
  
  // --- FATOR 4: Número 14 (BOOSTER moderado) ---
  // +4.8% nas últimas 2
  const has14in2 = last2.includes(14);
  if (has14in2) score += 1;
  
  // --- FATOR 5: Número 8 (booster leve) ---
  // +3.5% nas últimas 2
  const has8in4 = last4.includes(8);
  if (has8in4) score += 1;
  
  // --- FATOR 6: SUPPRESSORS (4, 5, 9, 10, 11) ---
  // Todos com taxa 0% nas últimas 2 rodadas!
  const suppressors2 = [4, 5, 9, 10, 11];
  let suppCount = 0;
  for (const s of suppressors2) {
    if (last2.includes(s)) suppCount++;
  }
  if (suppCount >= 2) score -= 2;     // múltiplos suppressors = muito ruim
  else if (suppCount === 1) score -= 1;
  
  // --- FATOR 7: Número 1 (suppressor leve, mantém do V2) ---
  if (last4.includes(1)) score -= 1;
  
  // --- FATOR 8: Predecessor imediato ---
  // 12(20%), 7(15.4%), 6(9.1%), 13(10%), 8(7.7%) = bons
  // 1,3,4,5,9,10,11 = 0% NUNCA viram branco
  if (i > 0) {
    const pred = rows[i-1].num;
    if (pred === 12) score += 2;
    else if (pred === 7 || pred === 13) score += 1;
    else if ([1, 3, 4, 5, 9, 10, 11].includes(pred)) score -= 1;
  }
  
  // --- FATOR 9: Doublet (repetição nas últimas 4) ---
  // 8.8% vs 3.6% = forte
  const seen = {};
  let hasDoublet = false;
  for (const x of last4) { seen[x] = (seen[x]||0)+1; if(seen[x]>=2) hasDoublet = true; }
  if (hasDoublet) score += 1;
  
  // --- FATOR 10: Pares fortes (2+12, 8+12, 2+7, 2+14, 2+8) ---
  const has7in4 = last4.includes(7);
  if (has2in4 && has12in4) score += 1;  // 20%
  if (has2in4 && has7in4) score += 1;   // 18.2%
  
  // --- FATOR 11: Pares bloqueadores ---
  // 3+9(0/23), 4+9(0/20), 5+8(0/17), 5+14(0/17)
  const has3in4 = last4.includes(3);
  const has5in4 = last4.includes(5);
  const has9in4 = last4.includes(9);
  const has4in4 = last4.includes(4);
  if (has3in4 && has9in4) score -= 1;
  if (has4in4 && has9in4) score -= 1;
  if (has5in4 && has8in4) score -= 1;
  
  // --- FATOR 12: Sequência de cor (mantém do V2) ---
  let seqCor = 0;
  if (i > 0) {
    const lastCor = rows[i-1].num >= 1 && rows[i-1].num <= 7 ? 'V' : 'P';
    for (let j = 1; j <= 10 && i-j>=0; j++) { 
      const c = rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P'; 
      if(c===lastCor) seqCor++; else break; 
    }
  }
  if (seqCor >= 3) score += 1;

  return { score, dist, has2in4, has12in4, has14in2, has8in4, suppCount, hasDoublet, seqCor,
           pred: i > 0 ? rows[i-1].num : -1 };
}

// ============ COMPARAÇÃO V2 vs V3 ============
const startIdx = 10;

console.log('--- V2 (antigo) ---');
for (let th = 4; th <= 8; th++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV2(i); if(score>=th){ap++;if(rows[i].num===0){ac++;s+=13;}else{s-=1;}} }
  console.log('  Score>='+th+': '+String(ap).padStart(4)+' apostas, '+String(ac).padStart(3)+' acertos ('+p(ac,ap)+'%), Lucro: '+String(s).padStart(4)+', ROI: '+(ap>0?(s/ap*100).toFixed(1):'0')+'%');
}

console.log('\n--- V3 (novo) ---');
for (let th = 3; th <= 10; th++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(score>=th){ap++;if(rows[i].num===0){ac++;s+=13;}else{s-=1;}} }
  console.log('  Score>='+th+': '+String(ap).padStart(4)+' apostas, '+String(ac).padStart(3)+' acertos ('+p(ac,ap)+'%), Lucro: '+String(s).padStart(4)+', ROI: '+(ap>0?(s/ap*100).toFixed(1):'0')+'%');
}

// Distribuição V3
console.log('\n--- Distribuicao Score V3 ---');
console.log('Score | Total | Brancos | Taxa');
const distV3 = {};
for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(!distV3[score])distV3[score]={t:0,b:0}; distV3[score].t++; if(rows[i].num===0)distV3[score].b++; }
for (const k of Object.keys(distV3).map(Number).sort((a,b)=>a-b)) { 
  const v=distV3[k]; 
  console.log(String(k).padStart(4)+'  | '+String(v.t).padStart(5)+' | '+String(v.b).padStart(5)+'   | '+p(v.b,v.t)+'%'); 
}

// Drawdown V3
console.log('\n--- Drawdown V3 ---');
for (let th of [5, 6, 7, 8]) {
  let maxD=0, curD=0, total=0;
  for (let i = startIdx; i < T; i++) { const {score}=calcScoreV3(i); if(score>=th){total++; if(rows[i].num===0)curD=0;else{curD++;if(curD>maxD)maxD=curD;}} }
  if (total > 0) console.log('  V3 Score>='+th+': max '+maxD+' perdas consecutivas (de '+total+' apostas)');
}

// Detalhar acertos V3
console.log('\n--- Acertos V3 (Score>=6) ---');
for (let i = startIdx; i < T; i++) {
  const info = calcScoreV3(i);
  if (info.score >= 6 && rows[i].num === 0) {
    const prev4 = [];
    for (let j = 1; j <= 4; j++) if (i-j >= 0) prev4.push(rows[i-j].num);
    console.log('  HIT Rodada '+i+' ('+rows[i].hr+'): Score='+info.score+', Dist='+info.dist+', Prev=['+prev4.join(',')+']');
  }
}

// Detalhar todos os brancos e qual score V3 tinham
console.log('\n--- Todos os brancos e seu Score V3 ---');
let captured = 0, missed = 0;
for (let i = startIdx; i < T; i++) {
  if (rows[i].num === 0) {
    const info = calcScoreV3(i);
    const prev4 = [];
    for (let j = 1; j <= 4; j++) if (i-j >= 0) prev4.push(rows[i-j].num);
    const status = info.score >= 6 ? 'CAPTURADO' : 'PERDIDO';
    if (info.score >= 6) captured++; else missed++;
    console.log('  ['+status+'] Rod '+i+' ('+rows[i].hr+'): Score='+info.score+', Dist='+info.dist+', Prev=['+prev4.join(',')+']');
  }
}
console.log('\n  Total brancos: '+(captured+missed)+' | Capturados (>=6): '+captured+' | Perdidos: '+missed);
console.log('  Taxa captura: '+p(captured, captured+missed)+'%');

// Brancos perdidos - o que impede?
console.log('\n--- Analise dos brancos PERDIDOS (Score<6) ---');
for (let i = startIdx; i < T; i++) {
  if (rows[i].num === 0) {
    const info = calcScoreV3(i);
    if (info.score < 6) {
      const prev6 = [];
      for (let j = 1; j <= 6; j++) if (i-j >= 0) prev6.push(rows[i-j].num);
      console.log('  Rod '+i+' ('+rows[i].hr+'): Score='+info.score+', Dist='+info.dist);
      console.log('    Prev6=['+prev6.join(',')+'] pred='+info.pred+' supp='+info.suppCount+' 2in4='+info.has2in4+' 12in4='+info.has12in4+' dbl='+info.hasDoublet);
    }
  }
}

// V3 por hora
console.log('\n--- V3>=6 por hora ---');
const porH={};
for (let i = startIdx; i < T; i++) { 
  const {score}=calcScoreV3(i); 
  const h=rows[i].h; 
  if(!porH[h])porH[h]={ap:0,ac:0}; 
  if(score>=6){porH[h].ap++;if(rows[i].num===0)porH[h].ac++;} 
}
console.log('Hora | Apostas | Acertos | Taxa  | ROI');
for (const h of Object.keys(porH).map(Number).sort((a,b)=>a-b)) { 
  const v=porH[h]; 
  if(v.ap>0){
    const lu=v.ac*13-(v.ap-v.ac); 
    console.log(String(h).padStart(3)+'h | '+String(v.ap).padStart(5)+'   | '+String(v.ac).padStart(5)+'   | '+p(v.ac,v.ap).padStart(5)+'% | '+(lu/v.ap*100).toFixed(1)+'%');
  } 
}

console.log('\n'+'='.repeat(70));
console.log('  RESUMO V3');
console.log('='.repeat(70));
