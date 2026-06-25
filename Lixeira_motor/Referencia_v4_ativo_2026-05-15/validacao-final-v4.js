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
console.log('  VALIDACAO FINAL — MODELO HIBRIDO V4');
console.log('  "Dist>=35 OU Par 11+12"');
console.log('='.repeat(70));
console.log('');

// ============ TESTE MONTE CARLO - VALIDAR SE NAO E ACASO ============
console.log('--- SIGNIFICANCIA ESTATISTICA ---');
// Nosso resultado: 116/1329 = 8.7%
// Se fosse random (6.58%), esperaríamos: 1329 * 0.0658 = ~87.5 acertos
// Teste binomial: P(X >= 116 | n=1329, p=0.0658)
const n = 1329, observed = 116, pBase = 0.0658;
const expected = n * pBase;
const stdDev = Math.sqrt(n * pBase * (1-pBase));
const zScore = (observed - expected) / stdDev;
console.log('  Observado: '+observed+' acertos em '+n+' apostas (8.7%)');
console.log('  Esperado (random): '+expected.toFixed(1)+' acertos (6.58%)');
console.log('  Desvio padrao: '+stdDev.toFixed(1));
console.log('  Z-score: '+zScore.toFixed(2));
console.log('  (Z > 2.0 = significativo, Z > 3.0 = muito significativo)');
console.log('');

// ============ PAR 11+12 ISOLADO - SIGNIFICANCIA ============
console.log('--- Par 11+12 isolado ---');
const n2 = 386, obs2 = 44;
const exp2 = n2 * pBase;
const std2 = Math.sqrt(n2 * pBase * (1-pBase));
const z2 = (obs2 - exp2) / std2;
console.log('  Observado: '+obs2+'/'+n2+' ('+p(obs2,n2)+'%)');
console.log('  Esperado: '+exp2.toFixed(1));
console.log('  Z-score: '+z2.toFixed(2));
console.log('');

// ============ SIMULACAO DE BANCA ============
console.log('--- SIMULACAO DE BANCA (unitaria) ---');
// Modelo: dist>=35 OU par 11+12
let banca = 100;
let maxBanca = 100, minBanca = 100;
let totalApostas = 0, totalAcertos = 0;
const bancaHist = [];

for (let i = 4; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  let last4 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) last4.push(rows[i-j].num);
  
  const bet = dist >= 35 || (last4.includes(11) && last4.includes(12));
  if (bet) {
    totalApostas++;
    if (rows[i].num === 0) {
      banca += 13; // ganho 13x
      totalAcertos++;
    } else {
      banca -= 1; // perde 1 unidade
    }
    if (banca > maxBanca) maxBanca = banca;
    if (banca < minBanca) minBanca = banca;
    bancaHist.push(banca);
  }
}

console.log('  Banca inicial: 100');
console.log('  Banca final: '+banca.toFixed(0));
console.log('  Banca maxima: '+maxBanca.toFixed(0));
console.log('  Banca minima: '+minBanca.toFixed(0));
console.log('  Total apostas: '+totalApostas);
console.log('  Total acertos: '+totalAcertos+' ('+p(totalAcertos,totalApostas)+'%)');
console.log('  Lucro: '+(banca-100).toFixed(0)+' unidades');
console.log('  Drawdown maximo da banca: '+(maxBanca-minBanca).toFixed(0)+' unidades');
console.log('');

// ============ CONSISTENCIA POR DIA ============
console.log('--- PERFORMANCE POR DIA ---');
const perDay = {};
for (let i = 4; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  let last4 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) last4.push(rows[i-j].num);
  const bet = dist >= 35 || (last4.includes(11) && last4.includes(12));
  if (bet) {
    const day = rows[i].dt || 'unknown';
    if (!perDay[day]) perDay[day] = {ap:0, ac:0};
    perDay[day].ap++;
    if (rows[i].num === 0) perDay[day].ac++;
  }
}
console.log('Dia         | Apostas | Acertos | Taxa  | ROI');
for (const [day, v] of Object.entries(perDay).sort()) {
  const lu = v.ac*13-(v.ap-v.ac);
  console.log('  '+day+' | '+String(v.ap).padStart(5)+'   | '+String(v.ac).padStart(5)+'   | '+p(v.ac,v.ap).padStart(5)+'% | '+(lu/v.ap*100).toFixed(1)+'%');
}

// ============ POR HORA (modelo hibrido) ============
console.log('\n--- POR HORA ---');
const perHour = {};
for (let i = 4; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  let last4 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) last4.push(rows[i-j].num);
  const bet = dist >= 35 || (last4.includes(11) && last4.includes(12));
  if (bet) {
    const h = rows[i].h;
    if (!perHour[h]) perHour[h] = {ap:0, ac:0};
    perHour[h].ap++;
    if (rows[i].num === 0) perHour[h].ac++;
  }
}
console.log('Hora | Apostas | Acertos | Taxa  | ROI');
for (const h of Object.keys(perHour).map(Number).sort((a,b)=>a-b)) {
  const v = perHour[h];
  const lu = v.ac*13-(v.ap-v.ac);
  console.log(String(h).padStart(3)+'h | '+String(v.ap).padStart(5)+'   | '+String(v.ac).padStart(5)+'   | '+p(v.ac,v.ap).padStart(5)+'% | '+(lu/v.ap*100).toFixed(1)+'%');
}

// ============ FREQUENCIA DE SINAIS ============
console.log('\n--- FREQUENCIA DE SINAIS (por hora jogada) ---');
const horasTotal = T / 120; // ~120 rodadas/hora
console.log('  Total horas nos dados: '+horasTotal.toFixed(1));
console.log('  Apostas/hora: '+(totalApostas/horasTotal).toFixed(1));
console.log('  Acertos/hora: '+(totalAcertos/horasTotal).toFixed(1));
console.log('  Lucro/hora: '+((banca-100)/horasTotal).toFixed(1)+' unidades');

// ============ TESTES ADICIONAIS PARA REFINAR ============
console.log('\n--- REFINAMENTOS ---');

// Testar: Dist>=35 + par 11+12 (ambos juntos)
let bothAp=0, bothAc=0;
for (let i = 4; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  let last4 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) last4.push(rows[i-j].num);
  if (dist >= 35 && last4.includes(11) && last4.includes(12)) { bothAp++; if(rows[i].num===0)bothAc++; }
}
console.log('  Dist>=35 E par 11+12: '+bothAc+'/'+bothAp+' ('+p(bothAc,bothAp)+'%)');

// Testar repetição do 1 como filtro extra
let rep1Ap=0, rep1Ac=0;
for (let i = 4; i < T; i++) {
  let last3 = [];
  for (let j = 1; j <= 3 && i-j >= 0; j++) last3.push(rows[i-j].num);
  if (last3.filter(x=>x===1).length >= 2) { rep1Ap++; if(rows[i].num===0)rep1Ac++; }
}
console.log('  Repeticao 1 (2x/3) sozinha: '+rep1Ac+'/'+rep1Ap+' ('+p(rep1Ac,rep1Ap)+'%)');

// Modelo completo V4: dist>=35 OU par 11+12 OU rep1
let fullAp=0, fullAc=0, fullLu=0, fullMaxD=0, fullCurD=0;
for (let i = 4; i < T; i++) {
  let dist = 999;
  for (let j = i-1; j >= 0; j--) { if (rows[j].num === 0) { dist = i-j; break; } }
  let last4 = [], last3 = [];
  for (let j = 1; j <= 4 && i-j >= 0; j++) { last4.push(rows[i-j].num); if(j<=3) last3.push(rows[i-j].num); }
  
  const bet = dist >= 35 || (last4.includes(11) && last4.includes(12)) || (last3.filter(x=>x===1).length >= 2);
  if (bet) {
    fullAp++;
    if (rows[i].num === 0) { fullAc++; fullLu += 13; fullCurD = 0; }
    else { fullLu -= 1; fullCurD++; if(fullCurD>fullMaxD) fullMaxD=fullCurD; }
  }
}
console.log('\n  MODELO COMPLETO (dist>=35 OU 11+12 OU rep1):');
console.log('  '+fullAc+'/'+fullAp+' ('+p(fullAc,fullAp)+'%), Lucro='+fullLu+', ROI='+(fullLu/fullAp*100).toFixed(1)+'%');
console.log('  Drawdown max: '+fullMaxD);
console.log('  Apostas/hora: '+(fullAp/horasTotal).toFixed(1));
