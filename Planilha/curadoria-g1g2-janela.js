/**
 * CURADORIA PROFUNDA: G1 vs G2 + JANELA ÓTIMA
 * Dataset: dados-novos.csv — 10.000 rodadas com timestamps
 */
const fs = require('fs');
const path = require('path');

// === CARREGAR CSV ===
const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8').split('\n');

const dados = [];
for (let i = csvRaw.length - 1; i >= 2; i--) {
  const cols = csvRaw[i].split(',');
  if (cols.length < 4) continue;
  const num = parseInt(cols[0]);
  if (isNaN(num) || num < 0 || num > 14) continue;
  const horario = cols[3].trim();
  const parts = horario.split(':');
  const seg = parseInt(parts[2]);
  const grupo = seg < 15 ? 'G1' : 'G2';
  dados.push({ num, hora: parseInt(parts[0]), min: parseInt(parts[1]), seg, grupo, data: cols[2].trim() });
}

const T = dados.length, h = dados.map(d => d.num);
const baseRate = h.filter(n => n === 0).length / T;

console.log('═'.repeat(80));
console.log('  CURADORIA: G1 vs G2 + JANELA ÓTIMA | N=' + T + ' | base=' + (baseRate*100).toFixed(2) + '%');
console.log('═'.repeat(80));

// === MOTOR V10 ===
const PARES_HOT = {'13,0':2.5,'13,10':2.3,'9,1':2.2,'8,3':2.0,'14,7':2.0,'4,5':1.8,'1,3':1.7,'5,11':1.7,'6,9':1.5};
const PARES_VETO = new Set(['7,14','11,13','14,3','9,11','4,8','5,5','2,2']);
const GATILHO = {8:0.2, 10:0.2};

function boostV4(hist, idx) {
  let bonus = 0;
  if (idx >= 3) {
    const l4 = [hist[idx],hist[idx-1],hist[idx-2],hist[idx-3]];
    if (l4.includes(11) && l4.includes(12)) bonus += 2.0;
  }
  let dist = 0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){dist=idx-i;break;}dist=idx-i+1;}
  if (dist>=50) bonus+=2.0; else if(dist>=40) bonus+=1.5; else if(dist>=35) bonus+=1.0;
  if (idx >= 2) {
    const l3 = [hist[idx],hist[idx-1],hist[idx-2]];
    if (l3.filter(x=>x===1).length >= 2) bonus += 1.0;
  }
  return bonus;
}

function scoreV10(hist, idx) {
  if (idx < 1) return 0;
  const pen = hist[idx-1], ult = hist[idx], par = pen+','+ult;
  if (PARES_VETO.has(par)) return -1;
  let s = 0;
  if (PARES_HOT[par]) s = PARES_HOT[par];
  if (GATILHO[ult] !== undefined) s += s < 1 ? GATILHO[ult] : GATILHO[ult]*0.3;
  let st = 0, d = 0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){d=idx-i;break;}d=idx-i+1;}
  if (PARES_HOT[par]) st++;
  if (GATILHO[ult]!==undefined) st++;
  if (d>=20) st++;
  if (ult===pen && !PARES_VETO.has(par)) st++;
  if (st>=3) s+=0.5; else if(st>=2 && PARES_HOT[par]) s+=0.3;
  s += boostV4(hist, idx);
  return Math.round(s*100)/100;
}

// ═══════════════════════════════════════════════════════════════
// PARTE 1: G1 vs G2
// ═══════════════════════════════════════════════════════════════
console.log('\n\n' + '▓'.repeat(80));
console.log('  PARTE 1: G1 vs G2 — PRIMEIRO vs SEGUNDO RESULTADO DO MINUTO');
console.log('▓'.repeat(80));

const g1 = dados.filter(d => d.grupo === 'G1');
const g2 = dados.filter(d => d.grupo === 'G2');
const g1B = g1.filter(d => d.num === 0).length;
const g2B = g2.filter(d => d.num === 0).length;

console.log('\n  1.1 FREQUÊNCIA DO BRANCO POR GRUPO');
console.log('  ' + '─'.repeat(60));
console.log(`  G1 (seg 00-06): ${g1B}/${g1.length} = ${(g1B/g1.length*100).toFixed(2)}%`);
console.log(`  G2 (seg 27-36): ${g2B}/${g2.length} = ${(g2B/g2.length*100).toFixed(2)}%`);
console.log(`  Total:          ${g1B+g2B}/${T} = ${(baseRate*100).toFixed(2)}%`);

const pPool = (g1B+g2B)/(g1.length+g2.length);
const seP = Math.sqrt(pPool*(1-pPool)*(1/g1.length+1/g2.length));
const zG = (g1B/g1.length - g2B/g2.length) / seP;
console.log(`\n  TESTE Z: ${zG.toFixed(3)} → ${Math.abs(zG) >= 1.96 ? '⚠️ SIGNIFICATIVO (p<0.05)' : '✓ NÃO significativo — G1 e G2 são IGUAIS'}`);

// Por dia
console.log('\n  1.2 ESTABILIDADE POR DIA');
console.log('  ' + '─'.repeat(60));
const dias = [...new Set(dados.map(d => d.data))];
for (const dia of dias) {
  const d1 = dados.filter(d => d.grupo==='G1' && d.data===dia);
  const d2 = dados.filter(d => d.grupo==='G2' && d.data===dia);
  const t1 = d1.filter(x=>x.num===0).length/d1.length;
  const t2 = d2.filter(x=>x.num===0).length/d2.length;
  const melhor = Math.abs(t1-t2) < 0.015 ? '≈' : t1 > t2 ? 'G1' : 'G2';
  console.log(`  ${dia} | G1: ${(t1*100).toFixed(1)}% (N=${d1.length}) | G2: ${(t2*100).toFixed(1)}% (N=${d2.length}) | ${melhor}`);
}

// Por hora
console.log('\n  1.3 TAXA POR HORA DO DIA — G1 vs G2');
console.log('  ' + '─'.repeat(60));
console.log('  Hora | G1 taxa (N)     | G2 taxa (N)     | Melhor');
for (let hr = 0; hr < 24; hr++) {
  const g1h = dados.filter(d => d.grupo==='G1' && d.hora===hr);
  const g2h = dados.filter(d => d.grupo==='G2' && d.hora===hr);
  if (g1h.length < 20 || g2h.length < 20) continue;
  const t1 = g1h.filter(d=>d.num===0).length/g1h.length;
  const t2 = g2h.filter(d=>d.num===0).length/g2h.length;
  const melhor = Math.abs(t1-t2) < 0.02 ? '≈' : t1 > t2 ? 'G1' : 'G2';
  console.log(`  ${String(hr).padStart(2)}h  | ${(t1*100).toFixed(1)}% (${g1h.length})`.padEnd(25) + `| ${(t2*100).toFixed(1)}% (${g2h.length})`.padEnd(22) + `| ${melhor}`);
}

// Correlação cruzada
console.log('\n  1.4 CORRELAÇÃO: branco no G1 afeta o G2 seguinte?');
console.log('  ' + '─'.repeat(60));
let bG1segG2 = {t:0,b:0}, nG1segG2 = {t:0,b:0}, bG2segG1 = {t:0,b:0}, nG2segG1 = {t:0,b:0};
for (let i = 0; i < dados.length - 1; i++) {
  if (dados[i].grupo === 'G1' && dados[i+1].grupo === 'G2') {
    if (dados[i].num === 0) { bG1segG2.t++; if(dados[i+1].num===0) bG1segG2.b++; }
    else { nG1segG2.t++; if(dados[i+1].num===0) nG1segG2.b++; }
  }
  if (dados[i].grupo === 'G2' && dados[i+1].grupo === 'G1') {
    if (dados[i].num === 0) { bG2segG1.t++; if(dados[i+1].num===0) bG2segG1.b++; }
    else { nG2segG1.t++; if(dados[i+1].num===0) nG2segG1.b++; }
  }
}
console.log(`  Branco G1 → P(branco G2): ${bG1segG2.t>0?(bG1segG2.b/bG1segG2.t*100).toFixed(1):'?'}% (N=${bG1segG2.t})`);
console.log(`  Normal G1 → P(branco G2): ${(nG1segG2.b/nG1segG2.t*100).toFixed(1)}% (N=${nG1segG2.t})`);
console.log(`  Branco G2 → P(branco G1): ${bG2segG1.t>0?(bG2segG1.b/bG2segG1.t*100).toFixed(1):'?'}% (N=${bG2segG1.t})`);
console.log(`  Normal G2 → P(branco G1): ${(nG2segG1.b/nG2segG1.t*100).toFixed(1)}% (N=${nG2segG1.t})`);
console.log(`  Base rate: ${(baseRate*100).toFixed(1)}%`);

// Motor separado por grupo
console.log('\n  1.5 MOTOR V10 — PERFORMANCE SEPARADA POR GRUPO');
console.log('  ' + '─'.repeat(60));
for (const j of [5, 7, 10, 15]) {
  let stats = {G1:{ac:0,err:0}, G2:{ac:0,err:0}};
  let sinal = null;
  for (let i = 100; i < h.length; i++) {
    if (sinal) {
      sinal.r++;
      if (h[i]===0) { stats[sinal.g].ac++; sinal=null; }
      else if (sinal.r>=j) { stats[sinal.g].err++; sinal=null; }
    } else {
      const sc = scoreV10(h, i-1);
      if (sc > 0) { sinal = {r:0, g: dados[i].grupo}; }
    }
  }
  const t1 = stats.G1.ac/(stats.G1.ac+stats.G1.err||1);
  const t2 = stats.G2.ac/(stats.G2.ac+stats.G2.err||1);
  console.log(`  J=${String(j).padStart(2)}: G1=${(t1*100).toFixed(1)}% (${stats.G1.ac+stats.G1.err}) | G2=${(t2*100).toFixed(1)}% (${stats.G2.ac+stats.G2.err}) | Diff=${((t1-t2)*100).toFixed(1)}pp`);
}

// Pares por grupo
console.log('\n  1.6 PARES HOT — TAXA POR GRUPO (J=10, olhando frente)');
console.log('  ' + '─'.repeat(60));
console.log('  Par     | G1 taxa (N)    | G2 taxa (N)    | Diff');
for (const par of Object.keys(PARES_HOT)) {
  let g1S={ent:0,ac:0}, g2S={ent:0,ac:0};
  for (let i = 101; i < h.length - 10; i++) {
    const p = h[i-2]+','+h[i-1];
    if (p !== par) continue;
    const g = dados[i].grupo;
    const tgt = g==='G1'?g1S:g2S;
    tgt.ent++;
    for (let j=i;j<Math.min(i+10,h.length);j++){if(h[j]===0){tgt.ac++;break;}}
  }
  const t1 = g1S.ent>0?(g1S.ac/g1S.ent*100).toFixed(1):'N/A';
  const t2 = g2S.ent>0?(g2S.ac/g2S.ent*100).toFixed(1):'N/A';
  console.log(`  ${par.padEnd(6)} | ${t1}% (${g1S.ent})`.padEnd(27) + `| ${t2}% (${g2S.ent})`.padEnd(22) + `| ${g1S.ent>3&&g2S.ent>3?((g1S.ac/g1S.ent-g2S.ac/g2S.ent)*100).toFixed(1)+'pp':'?'}`);
}

// ═══════════════════════════════════════════════════════════════
// PARTE 2: JANELA ÓTIMA
// ═══════════════════════════════════════════════════════════════
console.log('\n\n' + '▓'.repeat(80));
console.log('  PARTE 2: JANELA ÓTIMA — EM QUAL CASA O BRANCO REALMENTE CAI?');
console.log('▓'.repeat(80));

// 2.1 Distribuição de casas
console.log('\n  2.1 DISTRIBUIÇÃO: casa onde o branco cai após sinal V10');
console.log('  ' + '─'.repeat(60));

let casas = new Array(21).fill(0), totalS = 0, nuncaAcertou = 0;
for (let i = 100; i < h.length - 20; i++) {
  const sc = scoreV10(h, i-1);
  if (sc <= 0) continue;
  totalS++;
  let ok = false;
  for (let c = 0; c < 20; c++) { if (h[i+c]===0) { casas[c+1]++; ok=true; break; } }
  if (!ok) nuncaAcertou++;
}

console.log(`  Total sinais: ${totalS} | Nunca acertou em 20: ${nuncaAcertou} (${(nuncaAcertou/totalS*100).toFixed(1)}%)\n`);
console.log('  Casa | Acertos | % total | Acumul% | Barra visual');
let acum = 0;
for (let c = 1; c <= 20; c++) {
  acum += casas[c];
  const pct = (casas[c]/totalS*100).toFixed(1);
  const ac = (acum/totalS*100).toFixed(1);
  console.log(`   ${String(c).padStart(2)}  |  ${String(casas[c]).padStart(4)}  | ${pct.padStart(5)}% | ${ac.padStart(5)}% | ${'█'.repeat(Math.round(casas[c]/totalS*80))}`);
}

// 2.2 Winrate por janela
console.log('\n  2.2 WINRATE POR TAMANHO DE JANELA (sistema atual = espera J rodadas)');
console.log('  ' + '─'.repeat(60));
console.log('  J  | Winrate | Baseline | Edge   | Max Loss | Entradas');
for (let j = 1; j <= 20; j++) {
  let ac=0, err=0, streak=0, maxS=0, ent=0, sinal=null;
  for (let i = 100; i < h.length; i++) {
    if (sinal) { sinal.r++; if(h[i]===0){ac++;streak=0;sinal=null;} else if(sinal.r>=j){err++;streak++;maxS=Math.max(maxS,streak);sinal=null;} }
    else { if(scoreV10(h,i-1)>0){sinal={r:0};ent++;} }
  }
  const wr = ac/(ac+err), bl = 1-Math.pow(1-baseRate,j);
  const edge = wr - bl;
  const marker = edge > 0.02 ? ' ← EDGE!' : edge > 0 ? ' ✓' : '';
  console.log(`  ${String(j).padStart(2)} | ${(wr*100).toFixed(1)}%   |  ${(bl*100).toFixed(1)}%   | ${(edge*100).toFixed(1)}pp  |    ${maxS}     | ${ent}${marker}`);
}

// 2.3 Contribuição marginal
console.log('\n  2.3 CONTRIBUIÇÃO MARGINAL DE CADA CASA');
console.log('  ' + '─'.repeat(60));
console.log('  "A casa X ainda ajuda ou só dilui?"');
console.log('  Casa | P(branco|vivo) | Base rate | Edge marg | Status');
for (let c = 1; c <= 15; c++) {
  let vivos = totalS;
  for (let k = 1; k < c; k++) vivos -= casas[k];
  const pC = vivos > 0 ? casas[c]/vivos : 0;
  const edge = pC - baseRate;
  const status = edge > 0.015 ? '✓ AJUDA' : edge > -0.005 ? '~ NEUTRO' : '✗ DILUI';
  console.log(`   ${String(c).padStart(2)}  |    ${(pC*100).toFixed(2)}%     |  ${(baseRate*100).toFixed(2)}%  | ${(edge*100).toFixed(2)}pp  | ${status}`);
}

// 2.4 EV financeiro por janela (aposta 1u por rodada até acertar ou J)
console.log('\n  2.4 EV FINANCEIRO: aposta 1u/rodada, branco paga 14x');
console.log('  ' + '─'.repeat(60));
console.log('  J  | Lucro | ROI%   | Lucro/sinal | Drawdown max');
for (let j of [1,2,3,4,5,6,7,8,9,10,12,14]) {
  let lucro = 0, apostado = 0, sinais = 0, dd = 0, maxDD = 0, banca = 0;
  for (let i = 100; i < h.length - j; i++) {
    const sc = scoreV10(h, i-1);
    if (sc <= 0) continue;
    sinais++;
    let acertou = 0;
    for (let c = 0; c < j; c++) { if (h[i+c]===0) { acertou=c+1; break; } }
    if (acertou) { const ganho = 14 - acertou; lucro += ganho; apostado += acertou; banca += ganho; }
    else { lucro -= j; apostado += j; banca -= j; }
    if (banca < dd) { dd = banca; maxDD = Math.abs(dd); }
  }
  console.log(`  ${String(j).padStart(2)} | ${lucro>=0?'+':''}${String(lucro).padStart(5)}u | ${(lucro/apostado*100).toFixed(1)}% | ${(lucro/sinais).toFixed(2)}u      | -${maxDD}u`);
}

// 2.5 Análise por nível × casa
console.log('\n  2.5 DISTRIBUIÇÃO POR NÍVEL: em qual casa cada nível acerta?');
console.log('  ' + '─'.repeat(60));

for (const [nvLabel, nvMin, nvMax] of [['FORTE',2,99],['MEDIO',1.3,1.99],['FRACO',0.01,1.29]]) {
  let nCasas = new Array(16).fill(0), nTotal = 0, nMiss = 0;
  for (let i = 100; i < h.length - 15; i++) {
    const sc = scoreV10(h, i-1);
    if (sc < nvMin || sc > nvMax) continue;
    nTotal++;
    let ok = false;
    for (let c = 0; c < 15; c++) { if (h[i+c]===0) { nCasas[c+1]++; ok=true; break; } }
    if (!ok) nMiss++;
  }
  if (nTotal === 0) continue;
  console.log(`\n  ${nvLabel} (N=${nTotal}, miss=${nMiss}):`);
  console.log('  Casa | Nesta | Acum%  | Barra');
  let a = 0;
  for (let c = 1; c <= 12; c++) {
    a += nCasas[c];
    console.log(`   ${String(c).padStart(2)}  | ${String(nCasas[c]).padStart(4)}  | ${(a/nTotal*100).toFixed(1)}% | ${'█'.repeat(Math.round(nCasas[c]/nTotal*60))}`);
  }
}

// 2.6 Edge por faixa
console.log('\n\n  2.6 EDGE POR FAIXA DE CASAS');
console.log('  ' + '─'.repeat(60));
for (const [a,b] of [[1,2],[3,4],[5,6],[7,8],[9,10],[11,14]]) {
  let f = 0, vivos = totalS;
  for (let k = 1; k < a; k++) vivos -= casas[k];
  for (let c = a; c <= b; c++) f += casas[c];
  const pF = f/vivos, pT = 1-Math.pow(1-baseRate, b-a+1);
  const edge = pF - pT;
  const status = edge > 0.01 ? '✓ EDGE REAL' : edge > -0.01 ? '~ NEUTRO' : '✗ SEM EDGE';
  console.log(`  Casas ${a}-${b}: ${f}/${vivos} vivos = ${(pF*100).toFixed(1)}% vs teórico ${(pT*100).toFixed(1)}% → edge ${(edge*100).toFixed(1)}pp ${status}`);
}

// ═══════════════════════════════════════════════════════════════
// PARTE 3: CRUZAMENTO G1/G2 × JANELA
// ═══════════════════════════════════════════════════════════════
console.log('\n\n' + '▓'.repeat(80));
console.log('  PARTE 3: CRUZAMENTO G1/G2 × JANELA');
console.log('▓'.repeat(80));

console.log('\n  3.1 Distribuição de casas — G1 vs G2 separados');
console.log('  ' + '─'.repeat(60));

let casasG1 = new Array(11).fill(0), casasG2 = new Array(11).fill(0), tG1 = 0, tG2 = 0;
for (let i = 100; i < h.length - 10; i++) {
  const sc = scoreV10(h, i-1);
  if (sc <= 0) continue;
  const g = dados[i].grupo;
  if (g === 'G1') tG1++; else tG2++;
  for (let c = 0; c < 10; c++) {
    if (h[i+c] === 0) {
      if (g === 'G1') casasG1[c+1]++; else casasG2[c+1]++;
      break;
    }
  }
}

console.log('  Casa | G1 %    | G2 %    | Diff');
let aG1 = 0, aG2 = 0;
for (let c = 1; c <= 10; c++) {
  aG1 += casasG1[c]; aG2 += casasG2[c];
  const p1 = (aG1/tG1*100).toFixed(1), p2 = (aG2/tG2*100).toFixed(1);
  console.log(`   ${String(c).padStart(2)}  | ${p1.padStart(5)}% | ${p2.padStart(5)}% | ${((aG1/tG1-aG2/tG2)*100).toFixed(1)}pp`);
}
console.log(`  Total sinais: G1=${tG1}, G2=${tG2}`);

// 3.2 Janela ótima por grupo
console.log('\n  3.2 JANELA ÓTIMA POR GRUPO');
console.log('  ' + '─'.repeat(60));
console.log('  J  | G1 win% | G2 win% | G1 edge | G2 edge');
for (let j of [3,5,7,10,15]) {
  let s = {G1:{ac:0,err:0},G2:{ac:0,err:0}}, sinal=null;
  for (let i = 100; i < h.length; i++) {
    if (sinal) { sinal.r++; if(h[i]===0){s[sinal.g].ac++;sinal=null;} else if(sinal.r>=j){s[sinal.g].err++;sinal=null;} }
    else { if(scoreV10(h,i-1)>0) sinal={r:0,g:dados[i].grupo}; }
  }
  const bl = 1-Math.pow(1-baseRate,j);
  const w1 = s.G1.ac/(s.G1.ac+s.G1.err||1), w2 = s.G2.ac/(s.G2.ac+s.G2.err||1);
  console.log(`  ${String(j).padStart(2)} | ${(w1*100).toFixed(1)}%   | ${(w2*100).toFixed(1)}%   | ${((w1-bl)*100).toFixed(1)}pp   | ${((w2-bl)*100).toFixed(1)}pp`);
}

// ═══════════════════════════════════════════════════════════════
// CONCLUSÃO
// ═══════════════════════════════════════════════════════════════
console.log('\n\n' + '═'.repeat(80));
console.log('  RESUMO TEÓRICO');
console.log('═'.repeat(80));
console.log(`
  BASE RATES TEÓRICOS (p = ${(baseRate*100).toFixed(2)}%, IID):
  J=1:  ${((1-Math.pow(1-baseRate,1))*100).toFixed(1)}%
  J=2:  ${((1-Math.pow(1-baseRate,2))*100).toFixed(1)}%
  J=3:  ${((1-Math.pow(1-baseRate,3))*100).toFixed(1)}%
  J=5:  ${((1-Math.pow(1-baseRate,5))*100).toFixed(1)}%
  J=7:  ${((1-Math.pow(1-baseRate,7))*100).toFixed(1)}%
  J=10: ${((1-Math.pow(1-baseRate,10))*100).toFixed(1)}%
  J=14: ${((1-Math.pow(1-baseRate,14))*100).toFixed(1)}%  ← break-even (14x paga 14u)
  J=15: ${((1-Math.pow(1-baseRate,15))*100).toFixed(1)}%
  J=20: ${((1-Math.pow(1-baseRate,20))*100).toFixed(1)}%

  CONCLUSÃO EV (1u/rodada, paga 14x):
  - Casa 14 = break-even teórico (lucro 14-14=0)
  - Casas 1-13: cada uma ADICIONA EV positivo
  - Casas 15+: cada uma SUBTRAI EV
  - Se o motor tem edge REAL (taxa > base), as primeiras casas são as mais valiosas
`);
console.log('═'.repeat(80) + '\n');
