const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s, ts: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse();
const T = rows.length;

const ctrl = {4:4, 6:4, 10:4, 14:4, 2:2, 9:2, 8:4};

function getContext(i) {
  let dist = 999;
  for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
  
  let zona = false, ctrlNum = -1;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { 
    if (ctrl[rows[i-j].num] !== undefined && j <= ctrl[rows[i-j].num]) { zona = true; ctrlNum = rows[i-j].num; break; } 
  }
  
  const prev4 = [];
  for (let j = 1; j <= 4 && i - j >= 0; j++) prev4.push(rows[i-j].num);
  
  const prev8 = [];
  for (let j = 1; j <= 8 && i - j >= 0; j++) prev8.push(rows[i-j].num);
  
  let t5=false, t13=false, t7=false, t1=false, t3=false;
  for (let j = 1; j <= 4 && i - j >= 0; j++) { 
    if(rows[i-j].num===5)t5=true; if(rows[i-j].num===13)t13=true; 
    if(rows[i-j].num===7)t7=true; if(rows[i-j].num===1)t1=true;
    if(rows[i-j].num===3)t3=true;
  }
  
  // Cor das ultimas 4
  let reds=0, blacks=0;
  for (let j = 1; j <= 4 && i-j>=0; j++) {
    const n = rows[i-j].num;
    if (n >= 1 && n <= 7) reds++;
    else if (n >= 8 && n <= 14) blacks++;
  }
  
  // 11+12 nas ultimas 6
  let fakes = 0;
  for (let j = 1; j <= 6 && i-j>=0; j++) if (rows[i-j].num===11 || rows[i-j].num===12) fakes++;
  
  // Sequencia mesma cor
  let seqCor = 0;
  if (i > 0) {
    const lastCor = rows[i-1].num >= 1 && rows[i-1].num <= 7 ? 'V' : 'P';
    for (let j = 1; j <= 10 && i-j>=0; j++) {
      const c = rows[i-j].num === 0 ? 'B' : rows[i-j].num <= 7 ? 'V' : 'P';
      if (c === lastCor) seqCor++; else break;
    }
  }

  return { dist, zona, ctrlNum, prev4, prev8, t5, t13, t7, t1, t3, reds, blacks, fakes, seqCor };
}

function calcScore(i) {
  let score = 0;
  const ctx = getContext(i);
  if (ctx.dist >= 30) score += 3; else if (ctx.dist >= 20) score += 2; else if (ctx.dist >= 15) score += 1; else if (ctx.dist <= 3) score -= 1;
  if (ctx.zona) score += 1;
  if(ctx.t5&&!ctx.t13)score+=2; if(ctx.t13&&!ctx.t5)score-=2; if(ctx.t5&&ctx.t13)score-=1; if(ctx.t7&&ctx.t5&&!ctx.t13)score+=1;
  return { score, ...ctx };
}

console.log('='.repeat(70));
console.log('  ANALISE DE ERROS — O que estamos perdendo?');
console.log('='.repeat(70) + '\n');

// PARTE 1: Analisar TODOS os brancos nas ultimas 500 rodadas
const startIdx = T - 500;
const brancosIdx = [];
const brancosComScore = [];
const naoApostados = [];
const apostadosErro = [];

for (let i = startIdx; i < T; i++) {
  const info = calcScore(i);
  if (rows[i].num === 0) {
    brancosIdx.push(i);
    brancosComScore.push({ idx: i, hr: rows[i].hr, ...info });
    if (info.score < 4) naoApostados.push({ idx: i, hr: rows[i].hr, ...info });
  } else if (info.score >= 4) {
    apostadosErro.push({ idx: i, hr: rows[i].hr, resultado: rows[i].num, ...info });
  }
}

console.log('Ultimas 500 rodadas: ' + brancosIdx.length + ' brancos (' + (brancosIdx.length/500*100).toFixed(1) + '%)');
console.log('Score>=4 acertou: ' + (brancosComScore.length - naoApostados.length) + '/' + brancosComScore.length + ' brancos');
console.log('Brancos PERDIDOS (score<4): ' + naoApostados.length + '\n');

// PARTE 2: Perfil dos brancos que perdemos
console.log('═'.repeat(50));
console.log('  BRANCOS QUE PERDEMOS (score < 4)');
console.log('═'.repeat(50) + '\n');
console.log('Hr       | Score | Dist | Zona | 5? | 13? | 7? | 1? | 3? | Fakes | Prev4');
naoApostados.slice(-20).forEach(b => {
  console.log(b.hr.padEnd(8) + ' | ' + String(b.score).padStart(3) + '   | ' + String(b.dist).padStart(3) + '  | ' + (b.zona?'S':'N') + '    | ' + (b.t5?'S':'N') + '  | ' + (b.t13?'S ':'N ') + '  | ' + (b.t7?'S':'N') + '  | ' + (b.t1?'S':'N') + '  | ' + (b.t3?'S':'N') + '  | ' + b.fakes + '     | [' + b.prev4.join(',') + ']');
});

// PARTE 3: Distribuicao de score dos brancos perdidos
console.log('\nScore dos brancos perdidos:');
const scoreDist = {};
naoApostados.forEach(b => { scoreDist[b.score] = (scoreDist[b.score]||0)+1; });
Object.entries(scoreDist).sort((a,b)=>a[0]-b[0]).forEach(([s,c]) => console.log('  Score ' + s + ': ' + c + ' brancos'));

// PARTE 4: O que os brancos perdidos TEM EM COMUM?
console.log('\n═'.repeat(50));
console.log('  PADROES NOS BRANCOS PERDIDOS');
console.log('═'.repeat(50) + '\n');

const perdidos = naoApostados;
const todosB = brancosComScore;
console.log('Dist media (perdidos): ' + (perdidos.reduce((a,b)=>a+b.dist,0)/perdidos.length).toFixed(1));
console.log('Dist media (todos brancos): ' + (todosB.reduce((a,b)=>a+b.dist,0)/todosB.length).toFixed(1));
console.log('');

// Tem 5 nas 4?
const p5_per = perdidos.filter(b=>b.t5).length;
const p5_all = todosB.filter(b=>b.t5).length;
console.log('5 nas 4 antes — Perdidos: ' + (p5_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (p5_all/todosB.length*100).toFixed(1) + '%');

// Tem 13?
const p13_per = perdidos.filter(b=>b.t13).length;
const p13_all = todosB.filter(b=>b.t13).length;
console.log('13 nas 4 antes — Perdidos: ' + (p13_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (p13_all/todosB.length*100).toFixed(1) + '%');

// Tem zona?
const pz_per = perdidos.filter(b=>b.zona).length;
const pz_all = todosB.filter(b=>b.zona).length;
console.log('Zona ctrl — Perdidos: ' + (pz_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (pz_all/todosB.length*100).toFixed(1) + '%');

// Tem 1?
const p1_per = perdidos.filter(b=>b.t1).length;
const p1_all = todosB.filter(b=>b.t1).length;
console.log('1 nas 4 antes — Perdidos: ' + (p1_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (p1_all/todosB.length*100).toFixed(1) + '%');

// Tem 3?
const p3_per = perdidos.filter(b=>b.t3).length;
const p3_all = todosB.filter(b=>b.t3).length;
console.log('3 nas 4 antes — Perdidos: ' + (p3_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (p3_all/todosB.length*100).toFixed(1) + '%');

// Fakes
const pf_per = perdidos.filter(b=>b.fakes>=2).length;
const pf_all = todosB.filter(b=>b.fakes>=2).length;
console.log('2+ fakes(11/12) nas 6 — Perdidos: ' + (pf_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (pf_all/todosB.length*100).toFixed(1) + '%');

// Cor dominante
const pr_per = perdidos.filter(b=>b.reds>=3).length;
const pr_all = todosB.filter(b=>b.reds>=3).length;
console.log('3+ vermelhos nas 4 — Perdidos: ' + (pr_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (pr_all/todosB.length*100).toFixed(1) + '%');

const pb_per = perdidos.filter(b=>b.blacks>=3).length;
const pb_all = todosB.filter(b=>b.blacks>=3).length;
console.log('3+ pretos nas 4 — Perdidos: ' + (pb_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (pb_all/todosB.length*100).toFixed(1) + '%');

// Seq cor
const ps_per = perdidos.filter(b=>b.seqCor>=3).length;
const ps_all = todosB.filter(b=>b.seqCor>=3).length;
console.log('Seq mesma cor >=3 — Perdidos: ' + (ps_per/perdidos.length*100).toFixed(1) + '% | Todos brancos: ' + (ps_all/todosB.length*100).toFixed(1) + '%');

// PARTE 5: APOSTAS ERRADAS — o que tem em comum?
console.log('\n═'.repeat(50));
console.log('  APOSTAS ERRADAS (score>=4 mas NAO branco)');
console.log('═'.repeat(50) + '\n');

const erros = apostadosErro;
console.log('Total apostas erradas: ' + erros.length);
console.log('Resultado mais comum quando erramos:');
const resErro = {};
erros.forEach(e => { resErro[e.resultado] = (resErro[e.resultado]||0)+1; });
Object.entries(resErro).sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([n,v]) => console.log('  ' + n + ': ' + v + 'x (' + (v/erros.length*100).toFixed(1) + '%)'));

console.log('\nO que tinha nas 4 antes quando erramos:');
console.log('  13 presente: ' + erros.filter(e=>e.t13).length + '/' + erros.length + ' (' + (erros.filter(e=>e.t13).length/erros.length*100).toFixed(1) + '%)');
console.log('  1 presente: ' + erros.filter(e=>e.t1).length + '/' + erros.length + ' (' + (erros.filter(e=>e.t1).length/erros.length*100).toFixed(1) + '%)');
console.log('  Muitos pretos (3+): ' + erros.filter(e=>e.blacks>=3).length + '/' + erros.length + ' (' + (erros.filter(e=>e.blacks>=3).length/erros.length*100).toFixed(1) + '%)');

// PARTE 6: NOVOS FATORES — testar candidatos
console.log('\n═'.repeat(50));
console.log('  TESTANDO NOVOS FATORES');
console.log('═'.repeat(50) + '\n');

// Fator: 11 ou 12 nas ultimas 3 (antes do branco)
console.log('>> Fator: 11/12 nas 3 antes');
let fk_antes_b = 0, fk_antes_t = 0;
for (let i = startIdx; i < T; i++) {
  let hasFake = false;
  for (let j = 1; j <= 3 && i-j>=0; j++) if (rows[i-j].num===11||rows[i-j].num===12) hasFake = true;
  if (hasFake) { fk_antes_t++; if (rows[i].num===0) fk_antes_b++; }
}
console.log('  Com 11/12 nas 3: branco=' + (fk_antes_b/fk_antes_t*100).toFixed(1) + '% (n='+fk_antes_t+')');
let nfk_b=0,nfk_t=0;
for (let i = startIdx; i < T; i++) {
  let hasFake = false;
  for (let j = 1; j <= 3 && i-j>=0; j++) if (rows[i-j].num===11||rows[i-j].num===12) hasFake = true;
  if (!hasFake) { nfk_t++; if (rows[i].num===0) nfk_b++; }
}
console.log('  Sem 11/12 nas 3: branco=' + (nfk_b/nfk_t*100).toFixed(1) + '% (n='+nfk_t+')');

// Fator: sequencia de 3+ mesma cor quebra
console.log('\n>> Fator: Sequencia de 3+ mesma cor');
let seq3_b=0, seq3_t=0, nseq_b=0, nseq_t=0;
for (let i = startIdx; i < T; i++) {
  let sc = 0;
  if (i > 0) {
    const lc = rows[i-1].num >= 1 && rows[i-1].num <= 7 ? 'V' : 'P';
    for (let j = 1; j <= 10 && i-j>=0; j++) { const c = rows[i-j].num===0?'B':rows[i-j].num<=7?'V':'P'; if(c===lc)sc++;else break; }
  }
  if (sc >= 3) { seq3_t++; if(rows[i].num===0)seq3_b++; }
  else { nseq_t++; if(rows[i].num===0)nseq_b++; }
}
console.log('  Apos seq 3+: branco=' + (seq3_b/seq3_t*100).toFixed(1) + '% (n='+seq3_t+')');
console.log('  Sem seq 3+: branco=' + (nseq_b/nseq_t*100).toFixed(1) + '% (n='+nseq_t+')');

// Fator: 3→7 ou 1→5 nas ultimas 4
console.log('\n>> Fator: Combos especiais nas 4');
let cmb_b=0, cmb_t=0;
for (let i = startIdx; i < T; i++) {
  let hasCmb = false;
  for (let j = 1; j <= 3 && i-j-1>=0; j++) {
    if (rows[i-j-1].num===3 && rows[i-j].num===7) hasCmb = true;
    if (rows[i-j-1].num===1 && rows[i-j].num===5) hasCmb = true;
    if (rows[i-j-1].num===3 && rows[i-j].num===1) hasCmb = true;
  }
  if (hasCmb) { cmb_t++; if(rows[i].num===0)cmb_b++; }
}
console.log('  Com combo (3->7, 1->5, 3->1): branco=' + (cmb_t>0?(cmb_b/cmb_t*100).toFixed(1):'0') + '% (n='+cmb_t+')');

// Fator: distancia entre 5 e 15 COM zona ativa
console.log('\n>> Fator: Dist 5-15 + zona');
let mz_b=0, mz_t=0;
for (let i = startIdx; i < T; i++) {
  const ctx = getContext(i);
  if (ctx.dist >= 5 && ctx.dist <= 15 && ctx.zona) { mz_t++; if(rows[i].num===0) mz_b++; }
}
console.log('  Dist 5-15 + zona: branco=' + (mz_t>0?(mz_b/mz_t*100).toFixed(1):'0') + '% (n='+mz_t+')');

// Fator: numero anterior especifico
console.log('\n>> Fator: Numero imediatamente antes do branco');
const antesB = {};
for (let i = startIdx+1; i < T; i++) {
  if (rows[i].num === 0) { const n = rows[i-1].num; antesB[n]=(antesB[n]||0)+1; }
}
const antesTotal = Object.values(antesB).reduce((a,b)=>a+b,0);
console.log('  Top numeros ANTES do branco:');
Object.entries(antesB).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([n,v]) => {
  const freq = rows.slice(startIdx).filter(r=>r.num===parseInt(n)).length;
  const taxa = freq > 0 ? (v / freq * 100).toFixed(1) : '0';
  console.log('    ' + String(n).padStart(2) + ': ' + v + 'x (taxa pos-ele: ' + taxa + '% vs geral 7.3%)');
});

// Fator: o 1 SUPRIME — quantos erros tem 1?
console.log('\n>> Fator: O 1 nas erradas do modelo');
const errosComScore = [];
for (let i = startIdx; i < T; i++) {
  const info = calcScore(i);
  if (info.score >= 4 && rows[i].num !== 0) errosComScore.push(info);
}
const acertosComScore = [];
for (let i = startIdx; i < T; i++) {
  const info = calcScore(i);
  if (info.score >= 4 && rows[i].num === 0) acertosComScore.push(info);
}
console.log('  Erros com 1 nas 4: ' + errosComScore.filter(e=>e.t1).length + '/' + errosComScore.length + ' (' + (errosComScore.filter(e=>e.t1).length/errosComScore.length*100).toFixed(1) + '%)');
console.log('  Acertos com 1 nas 4: ' + acertosComScore.filter(e=>e.t1).length + '/' + acertosComScore.length + ' (' + (acertosComScore.filter(e=>e.t1).length/acertosComScore.length*100).toFixed(1) + '%)');

// PARTE 7: Score melhorado
console.log('\n═'.repeat(50));
console.log('  SCORE V2 — Testando melhorias');
console.log('═'.repeat(50) + '\n');

function calcScoreV2(i) {
  let score = 0;
  const ctx = getContext(i);
  
  // Dist (igual)
  if (ctx.dist >= 30) score += 3; else if (ctx.dist >= 20) score += 2; else if (ctx.dist >= 15) score += 1; else if (ctx.dist <= 3) score -= 1;
  
  // Zona
  if (ctx.zona) score += 1;
  
  // Interferentes (igual)
  if(ctx.t5&&!ctx.t13)score+=2; if(ctx.t13&&!ctx.t5)score-=2; if(ctx.t5&&ctx.t13)score-=1; if(ctx.t7&&ctx.t5&&!ctx.t13)score+=1;
  
  // NOVO: 1 suprime (-1 se 1 presente)
  if (ctx.t1) score -= 1;
  
  // NOVO: 3 acelera (+1 se 3 presente sem 13)
  if (ctx.t3 && !ctx.t13) score += 1;
  
  // NOVO: fakes nas 3 antes (+1)
  let hasFake3 = false;
  for (let j = 1; j <= 3 && i-j>=0; j++) if (rows[i-j].num===11||rows[i-j].num===12) hasFake3 = true;
  if (hasFake3) score += 1;
  
  // NOVO: sequencia 3+ mesma cor (+1)
  if (ctx.seqCor >= 3) score += 1;
  
  return { score, ...ctx };
}

// Testar V2 nas 500 rodadas
for (let threshold = 3; threshold <= 7; threshold++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) {
    const { score } = calcScoreV2(i);
    if (score >= threshold) { ap++; if(rows[i].num===0){ac++;s+=13;}else{s-=1;} }
  }
  const roi = ap > 0 ? (s/ap*100).toFixed(1) : '0';
  const taxa = ap > 0 ? (ac/ap*100).toFixed(1) : '0';
  console.log('  V2 Score>=' + threshold + ': ' + ap + ' apostas, ' + ac + ' acertos (' + taxa + '%), Lucro: ' + s + ', ROI: ' + roi + '%');
}

console.log('\n  --- V1 original para comparacao ---');
for (let threshold = 3; threshold <= 7; threshold++) {
  let ap=0, ac=0, s=0;
  for (let i = startIdx; i < T; i++) {
    const { score } = calcScore(i);
    if (score >= threshold) { ap++; if(rows[i].num===0){ac++;s+=13;}else{s-=1;} }
  }
  const roi = ap > 0 ? (s/ap*100).toFixed(1) : '0';
  const taxa = ap > 0 ? (ac/ap*100).toFixed(1) : '0';
  console.log('  V1 Score>=' + threshold + ': ' + ap + ' apostas, ' + ac + ' acertos (' + taxa + '%), Lucro: ' + s + ', ROI: ' + roi + '%');
}

// Teste final: V2 na ultima hora
console.log('\n═'.repeat(50));
console.log('  V2 NA ULTIMA HORA');
console.log('═'.repeat(50) + '\n');
const start1h = T - 120;
for (let threshold = 4; threshold <= 6; threshold++) {
  let ap=0, ac=0, s=0;
  const hits = [];
  for (let i = start1h; i < T; i++) {
    const info = calcScoreV2(i);
    if (info.score >= threshold) { 
      ap++; 
      if(rows[i].num===0){ac++;s+=13; hits.push('  '+rows[i].hr+' Score='+info.score+' dist='+info.dist);}
      else{s-=1;} 
    }
  }
  console.log('V2 Score>=' + threshold + ': ' + ap + ' apostas, ' + ac + ' acertos (' + (ap>0?(ac/ap*100).toFixed(1):0) + '%), Lucro: ' + s + ', ROI: ' + (ap>0?(s/ap*100).toFixed(1):0) + '%');
  if (hits.length) hits.forEach(h => console.log(h));
  console.log('');
}
