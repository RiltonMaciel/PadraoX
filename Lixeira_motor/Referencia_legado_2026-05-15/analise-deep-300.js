const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s };
}).filter(r => !isNaN(r.num));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

console.log('Total rodadas:', T);
console.log('Total brancos:', rows.filter(r => r.num === 0).length);
console.log('Taxa base branco:', p(rows.filter(r => r.num === 0).length, T) + '%\n');

// ============ TESTE 1: Presença de cada número nas últimas N rodadas antes de um branco ============
console.log('='.repeat(70));
console.log('  TESTE 1: Presenca de cada numero nas ultimas 4 rodadas vs branco');
console.log('='.repeat(70));
console.log('Num | COM num -> branco | SEM num -> branco | Diferenca | Efeito');

for (let n = 1; n <= 14; n++) {
  let comN = 0, comNB = 0, semN = 0, semNB = 0;
  for (let i = 4; i < T; i++) {
    let has = false;
    for (let j = 1; j <= 4; j++) if (rows[i-j].num === n) has = true;
    if (has) { comN++; if (rows[i].num === 0) comNB++; }
    else { semN++; if (rows[i].num === 0) semNB++; }
  }
  const taxaCom = comN > 0 ? comNB / comN * 100 : 0;
  const taxaSem = semN > 0 ? semNB / semN * 100 : 0;
  const diff = taxaCom - taxaSem;
  const efeito = diff > 3 ? 'BOOSTER' : diff < -3 ? 'SUPPRESSOR' : 'neutro';
  console.log(String(n).padStart(2) + '  | ' + 
    p(comNB, comN).padStart(5) + '% ('+comNB+'/'+comN+')' + ' | ' +
    p(semNB, semN).padStart(5) + '% ('+semNB+'/'+semN+')' + ' | ' +
    (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%  | ' + efeito);
}

// ============ TESTE 2: Últimas 2 e 3 rodadas (janelas menores) ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 2: Presenca nas ultimas 2 rodadas (janela curta)');
console.log('='.repeat(70));
console.log('Num | COM -> branco | SEM -> branco | Diff   | Efeito');

for (let n = 1; n <= 14; n++) {
  let comN = 0, comNB = 0, semN = 0, semNB = 0;
  for (let i = 2; i < T; i++) {
    let has = false;
    for (let j = 1; j <= 2; j++) if (rows[i-j].num === n) has = true;
    if (has) { comN++; if (rows[i].num === 0) comNB++; }
    else { semN++; if (rows[i].num === 0) semNB++; }
  }
  const taxaCom = comN > 0 ? comNB / comN * 100 : 0;
  const taxaSem = semN > 0 ? semNB / semN * 100 : 0;
  const diff = taxaCom - taxaSem;
  const efeito = diff > 4 ? '** BOOSTER **' : diff < -4 ? '** SUPPRESSOR **' : '';
  console.log(String(n).padStart(2) + '  | ' + 
    p(comNB, comN).padStart(5) + '% ('+comNB+'/'+comN+')' + ' | ' +
    p(semNB, semN).padStart(5) + '% ('+semNB+'/'+semN+')' + ' | ' +
    (diff >= 0 ? '+' : '') + diff.toFixed(1) + '% | ' + efeito);
}

// ============ TESTE 3: O que aparece IMEDIATAMENTE antes do branco ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 3: Numero imediatamente antes do branco (posicao -1)');
console.log('='.repeat(70));

const brancoIdx = [];
for (let i = 1; i < T; i++) if (rows[i].num === 0) brancoIdx.push(i);
console.log('Brancos encontrados:', brancoIdx.length);

const anteBranco = {};
for (const bi of brancoIdx) {
  const prev = rows[bi-1].num;
  anteBranco[prev] = (anteBranco[prev] || 0) + 1;
}
console.log('\nNumero antes do branco (contagem):');
for (let n = 1; n <= 14; n++) {
  const cnt = anteBranco[n] || 0;
  const totalN = rows.filter((r, i) => i < T-1 && r.num === n).length;
  const taxa = totalN > 0 ? cnt / totalN * 100 : 0;
  console.log('  ' + String(n).padStart(2) + ': ' + cnt + 'x' + 
    ' (de ' + totalN + ' vezes que apareceu, ' + taxa.toFixed(1) + '% virou branco)');
}

// ============ TESTE 4: Combinações de 2 números nas últimas 4 ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 4: Pares de numeros nas ultimas 4 que MAIS precedem branco');
console.log('='.repeat(70));

const pares = [];
for (let a = 1; a <= 14; a++) {
  for (let b = a+1; b <= 14; b++) {
    let com = 0, comB = 0;
    for (let i = 4; i < T; i++) {
      let hasA = false, hasB = false;
      for (let j = 1; j <= 4; j++) {
        if (rows[i-j].num === a) hasA = true;
        if (rows[i-j].num === b) hasB = true;
      }
      if (hasA && hasB) { com++; if (rows[i].num === 0) comB++; }
    }
    if (com >= 3) pares.push({ a, b, com, comB, taxa: comB/com*100 });
  }
}
pares.sort((x, y) => y.taxa - x.taxa);
console.log('TOP 15 pares que MAIS atraem branco:');
for (const pr of pares.slice(0, 15)) {
  console.log('  ' + pr.a + '+' + pr.b + ': ' + pr.comB + '/' + pr.com + ' (' + pr.taxa.toFixed(1) + '%)');
}
console.log('\nTOP 10 pares que BLOQUEIAM branco (taxa 0%):');
const bloq = pares.filter(p => p.taxa === 0 && p.com >= 5).sort((a,b) => b.com - a.com);
for (const pr of bloq.slice(0, 10)) {
  console.log('  ' + pr.a + '+' + pr.b + ': 0/' + pr.com + ' (0%)');
}

// ============ TESTE 5: Distância do último branco nos momentos de acerto vs erro ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 5: Contexto dos 2 acertos vs 19 erros no Score>=6');
console.log('='.repeat(70));

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
  return { score, dist, t1, t3, t5, t13, t7, hasFake3, seqCor, zona };
}

console.log('\nACERTOS (Score>=6 que acertou branco):');
for (let i = 10; i < T; i++) {
  const info = calcScoreV2(i);
  if (info.score >= 6 && rows[i].num === 0) {
    const prev4 = [];
    for (let j = 1; j <= 6; j++) if (i-j >= 0) prev4.push(rows[i-j].num);
    console.log('  Rodada ' + i + ' ('+rows[i].hr+'): Score=' + info.score + ', Dist=' + info.dist);
    console.log('    Ultimos 6: [' + prev4.join(', ') + ']');
    console.log('    Fatores: t1='+info.t1+' t3='+info.t3+' t5='+info.t5+' t13='+info.t13+' t7='+info.t7+' fake='+info.hasFake3+' seq='+info.seqCor+' zona='+info.zona);
  }
}

console.log('\nERROS (Score>=6 que NÃO acertou):');
for (let i = 10; i < T; i++) {
  const info = calcScoreV2(i);
  if (info.score >= 6 && rows[i].num !== 0) {
    const prev4 = [];
    for (let j = 1; j <= 6; j++) if (i-j >= 0) prev4.push(rows[i-j].num);
    console.log('  Rodada ' + i + ' ('+rows[i].hr+'): Score=' + info.score + ', Dist=' + info.dist + ', Saiu=' + rows[i].num);
    console.log('    Ultimos 6: [' + prev4.join(', ') + ']');
    console.log('    Fatores: t1='+info.t1+' t3='+info.t3+' t5='+info.t5+' t13='+info.t13+' t7='+info.t7+' fake='+info.hasFake3+' seq='+info.seqCor+' zona='+info.zona);
  }
}

// ============ TESTE 6: Números que NUNCA aparecem antes do branco ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 6: Presenca de cada numero nas ultimas 6 rodadas antes de branco vs nao-branco');
console.log('='.repeat(70));

for (let n = 1; n <= 14; n++) {
  let comN = 0, comNB = 0, semN = 0, semNB = 0;
  for (let i = 6; i < T; i++) {
    let has = false;
    for (let j = 1; j <= 6; j++) if (rows[i-j].num === n) has = true;
    if (has) { comN++; if (rows[i].num === 0) comNB++; }
    else { semN++; if (rows[i].num === 0) semNB++; }
  }
  const taxaCom = comN > 0 ? comNB / comN * 100 : 0;
  const taxaSem = semN > 0 ? semNB / semN * 100 : 0;
  const diff = taxaCom - taxaSem;
  if (Math.abs(diff) > 2) {
    console.log(String(n).padStart(2) + ': COM=' + p(comNB,comN) + '% SEM=' + p(semNB,semN) + '% DIFF=' + (diff>0?'+':'') + diff.toFixed(1) + '% ' + (diff > 3 ? 'BOOSTER' : diff < -3 ? 'SUPPRESSOR' : ''));
  }
}

// ============ TESTE 7: Sequências específicas ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 7: Repeticao do mesmo numero nas ultimas 4 (doublet/triplet)');
console.log('='.repeat(70));

let rep2 = 0, rep2B = 0, noRep = 0, noRepB = 0;
for (let i = 4; i < T; i++) {
  let hasRepeat = false;
  const last4 = [];
  for (let j = 1; j <= 4; j++) last4.push(rows[i-j].num);
  const seen = {};
  for (const x of last4) { seen[x] = (seen[x]||0)+1; if(seen[x]>=2) hasRepeat = true; }
  if (hasRepeat) { rep2++; if (rows[i].num === 0) rep2B++; }
  else { noRep++; if (rows[i].num === 0) noRepB++; }
}
console.log('COM repeticao (doublet+): branco=' + p(rep2B,rep2) + '% ('+rep2B+'/'+rep2+')');
console.log('SEM repeticao: branco=' + p(noRepB,noRep) + '% ('+noRepB+'/'+noRep+')');

// ============ TESTE 8: Alternância de cor ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 8: Alternancia de cor (V-P-V-P ou P-V-P-V) nas ultimas 4');
console.log('='.repeat(70));

let alt = 0, altB = 0, noAlt = 0, noAltB = 0;
for (let i = 4; i < T; i++) {
  let alternating = true;
  for (let j = 1; j <= 3; j++) {
    const c1 = rows[i-j].num === 0 ? 'B' : rows[i-j].num <= 7 ? 'V' : 'P';
    const c2 = rows[i-j-1].num === 0 ? 'B' : rows[i-j-1].num <= 7 ? 'V' : 'P';
    if (c1 === c2 || c1 === 'B' || c2 === 'B') { alternating = false; break; }
  }
  if (alternating) { alt++; if (rows[i].num === 0) altB++; }
  else { noAlt++; if (rows[i].num === 0) noAltB++; }
}
console.log('COM alternancia perfeita: branco=' + p(altB,alt) + '% ('+altB+'/'+alt+')');
console.log('SEM alternancia: branco=' + p(noAltB,noAlt) + '% ('+noAltB+'/'+noAlt+')');

// ============ TESTE 9: Soma das últimas 4 ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 9: Soma dos ultimos 4 numeros vs branco');
console.log('='.repeat(70));

const faixas = [[0,20],[21,30],[31,40],[41,56]];
for (const [lo, hi] of faixas) {
  let cnt = 0, cntB = 0;
  for (let i = 4; i < T; i++) {
    let soma = 0;
    for (let j = 1; j <= 4; j++) soma += rows[i-j].num;
    if (soma >= lo && soma <= hi) { cnt++; if (rows[i].num === 0) cntB++; }
  }
  console.log('  Soma ' + lo + '-' + hi + ': branco=' + p(cntB,cnt) + '% ('+cntB+'/'+cnt+')');
}

// ============ TESTE 10: Números altos vs baixos ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 10: Predominancia de numeros altos(8-14) vs baixos(1-7) nas ultimas 4');
console.log('='.repeat(70));

let hi4=0, hi4B=0, lo4=0, lo4B=0, mix=0, mixB=0;
for (let i = 4; i < T; i++) {
  let altos = 0, baixos = 0;
  for (let j = 1; j <= 4; j++) {
    if (rows[i-j].num >= 8) altos++;
    else if (rows[i-j].num >= 1) baixos++;
  }
  if (altos >= 3) { hi4++; if (rows[i].num === 0) hi4B++; }
  else if (baixos >= 3) { lo4++; if (rows[i].num === 0) lo4B++; }
  else { mix++; if (rows[i].num === 0) mixB++; }
}
console.log('3+ altos(8-14): branco=' + p(hi4B,hi4) + '% ('+hi4B+'/'+hi4+')');
console.log('3+ baixos(1-7): branco=' + p(lo4B,lo4) + '% ('+lo4B+'/'+lo4+')');
console.log('Misto: branco=' + p(mixB,mix) + '% ('+mixB+'/'+mix+')');

// ============ TESTE 11: Gap entre brancos (padrão cíclico) ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 11: Distancias entre brancos consecutivos');
console.log('='.repeat(70));

let lastB = -1;
const gaps = [];
for (let i = 0; i < T; i++) {
  if (rows[i].num === 0) {
    if (lastB >= 0) gaps.push(i - lastB);
    lastB = i;
  }
}
console.log('Gaps entre brancos:', gaps.join(', '));
console.log('Media:', (gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(1));
console.log('Min:', Math.min(...gaps), 'Max:', Math.max(...gaps));

// ============ TESTE 12: Número 0 recente como "recarga" ============
console.log('\n' + '='.repeat(70));
console.log('  TESTE 12: Branco recente (dist 5-10) como sinal de atividade');
console.log('='.repeat(70));
let zoneAct = 0, zoneActB = 0, zoneDead = 0, zoneDeadB = 0;
for (let i = 10; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  if (dist >= 5 && dist <= 12) { zoneAct++; if (rows[i].num === 0) zoneActB++; }
  else if (dist > 12) { zoneDead++; if (rows[i].num === 0) zoneDeadB++; }
}
console.log('Dist 5-12 (zona ativa): branco=' + p(zoneActB,zoneAct) + '% ('+zoneActB+'/'+zoneAct+')');
console.log('Dist >12 (zona fria): branco=' + p(zoneDeadB,zoneDead) + '% ('+zoneDeadB+'/'+zoneDead+')');
