const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, dt, hr, h, m, s, ts: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse();
const T = rows.length;

// Ultima 1 hora = ultimas 120 rodadas
const startIdx = T - 120;
const inicio = rows[startIdx];
const fim = rows[T - 1];
console.log('=== SIMULACAO: ULTIMA 1 HORA ===');
console.log('De: ' + inicio.hr + ' (' + inicio.dt + ') ate ' + fim.hr + ' (' + fim.dt + ')');
console.log('Rodadas: 120\n');

const ctrl = {4:4, 6:4, 10:4, 14:4, 2:2, 9:2, 8:4};

function calcScore(i) {
  let score = 0;
  let dist = 999;
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

// Simular score >= 4
let ap4=0, ac4=0, s4=0;
const logAcertos = [];
const logTodas = [];

for (let i = startIdx; i < T; i++) {
  const { score, dist } = calcScore(i);
  const resultado = rows[i].num;
  const rodNum = i - startIdx + 1;
  
  if (score >= 4) {
    ap4++;
    if (resultado === 0) {
      ac4++; s4 += 13;
      logAcertos.push('  > Rod ' + rodNum + ' [' + rows[i].hr + '] Score=' + score + ' dist=' + dist + ' -> BRANCO! Saldo: +' + s4);
    } else {
      s4 -= 1;
    }
    logTodas.push({ rod: rodNum, hr: rows[i].hr, score, dist, resultado, saldo: s4 });
  }
}

console.log('--- SCORE >= 4 ---');
console.log('Apostas: ' + ap4 + '/120 (' + (ap4/120*100).toFixed(1) + '% das rodadas)');
console.log('Acertos: ' + ac4);
console.log('Taxa: ' + (ap4 > 0 ? (ac4/ap4*100).toFixed(1) : 0) + '%');
console.log('Lucro: ' + s4 + ' unidades (aposta=1, payout=14x)');
console.log('ROI: ' + (ap4 > 0 ? (s4/ap4*100).toFixed(1) : 0) + '%');
console.log('\nAcertos:');
logAcertos.forEach(l => console.log(l));

// Tambem score >= 3
let ap3=0, ac3=0, s3=0;
for (let i = startIdx; i < T; i++) {
  const { score } = calcScore(i);
  if (score >= 3) { ap3++; if(rows[i].num===0){ac3++;s3+=13;}else{s3-=1;} }
}

// Brancos totais
let brancos = 0;
for (let i = startIdx; i < T; i++) if (rows[i].num === 0) brancos++;

console.log('\n--- COMPARACAO ---');
console.log('Score>=3: ' + ap3 + ' apostas, ' + ac3 + ' acertos (' + (ap3>0?(ac3/ap3*100).toFixed(1):0) + '%), Lucro: ' + s3 + ', ROI: ' + (ap3>0?(s3/ap3*100).toFixed(1):0) + '%');
console.log('Score>=4: ' + ap4 + ' apostas, ' + ac4 + ' acertos (' + (ap4>0?(ac4/ap4*100).toFixed(1):0) + '%), Lucro: ' + s4 + ', ROI: ' + (ap4>0?(s4/ap4*100).toFixed(1):0) + '%');
console.log('\nBrancos na hora: ' + brancos + '/120 (' + (brancos/120*100).toFixed(1) + '%)');
console.log('Se apostasse TODAS: Lucro = ' + (brancos*14 - 120) + ' (ROI ' + ((brancos*14-120)/120*100).toFixed(1) + '%)');

// Todas as apostas detalhadas
console.log('\n--- TODAS AS ENTRADAS (score>=4) ---');
console.log(' #  | Hora     | Score | Dist | Resultado | Saldo');
logTodas.forEach((l, i) => {
  const res = l.resultado === 0 ? 'BRANCO!' : String(l.resultado).padStart(2);
  console.log(String(i+1).padStart(3) + ' | ' + l.hr + ' |   ' + l.score + '   |  ' + String(l.dist).padStart(3) + ' | ' + res.padStart(9) + ' | ' + l.saldo);
});
