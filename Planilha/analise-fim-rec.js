const XLSX = require('xlsx');
const path = require('path');

// Carregar AMBOS os datasets para ter mais amostras de REC
const fs = require('fs');

// Dataset 1: 1000 rodadas recentes (xlsx)
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (12).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
const dados1k = [];
for (let i = rows.length - 1; i >= 2; i--) {
  const row = rows[i];
  if (!row || row.length < 2) continue;
  const num = parseInt(row[0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados1k.push(num);
}

// Dataset 2: 10k rodadas (csv)
const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8').split('\n');
const dados10k = [];
for (let i = csvRaw.length - 1; i >= 2; i--) {
  const cols = csvRaw[i].split(',');
  if (cols.length < 4) continue;
  const num = parseInt(cols[0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados10k.push(num);
}

// Combinar: 10k + 1k = ~11k rodadas
const h = [...dados10k, ...dados1k];
const T = h.length;

console.log('═'.repeat(70));
console.log('  ANÁLISE PROFUNDA: O QUE AVISA O FIM DO REC?');
console.log(`  Dataset: ${T} rodadas (10k + 1k combinados)`);
console.log('═'.repeat(70));

// Encontrar todos os gaps > 20 (RECs e semi-RECs)
const brancoPos = [];
for (let i = 0; i < T; i++) { if (h[i] === 0) brancoPos.push(i); }

const gaps = [];
for (let i = 1; i < brancoPos.length; i++) {
  const tam = brancoPos[i] - brancoPos[i-1];
  if (tam > 20) {
    gaps.push({ inicio: brancoPos[i-1], fim: brancoPos[i], tam });
  }
}

console.log(`\n  Total de RECs (gap > 20): ${gaps.length}`);
console.log(`  Gaps: ${gaps.map(g=>g.tam).join(', ')}`);

// ══════════════════════════════════════════════════════════════
// TESTE 1: Qual NÚMERO aparece mais nos últimos 1-5 antes do branco sair?
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 1. NÚMERO IMEDIATAMENTE ANTES DO BRANCO (fim do REC):');
console.log('  "Qual número aparece como ÚLTIMO antes do branco encerrar o REC?"');
console.log('  ' + '─'.repeat(60));

const ultimoAntes = {};
const penultimoAntes = {};
const antepenultimoAntes = {};

gaps.forEach(g => {
  const ult = h[g.fim - 1];
  const pen = h[g.fim - 2];
  const ante = h[g.fim - 3];
  ultimoAntes[ult] = (ultimoAntes[ult] || 0) + 1;
  penultimoAntes[pen] = (penultimoAntes[pen] || 0) + 1;
  antepenultimoAntes[ante] = (antepenultimoAntes[ante] || 0) + 1;
});

console.log('\n  ÚLTIMO (h[fim-1]):');
const totalGaps = gaps.length;
const freqEsperada = totalGaps / 15; // se fosse uniforme
Object.entries(ultimoAntes).sort((a,b)=>b[1]-a[1]).forEach(([n,c]) => {
  const lift = c / freqEsperada;
  const mark = lift >= 1.5 ? ' ★★' : lift >= 1.2 ? ' ★' : '';
  console.log(`    ${String(n).padStart(2)}: ${c}x (lift ${lift.toFixed(2)}x)${mark}`);
});

console.log('\n  PENÚLTIMO (h[fim-2]):');
Object.entries(penultimoAntes).sort((a,b)=>b[1]-a[1]).forEach(([n,c]) => {
  const lift = c / freqEsperada;
  const mark = lift >= 1.5 ? ' ★★' : lift >= 1.2 ? ' ★' : '';
  console.log(`    ${String(n).padStart(2)}: ${c}x (lift ${lift.toFixed(2)}x)${mark}`);
});

// ══════════════════════════════════════════════════════════════
// TESTE 2: PARES específicos antes do fim do REC
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 2. PARES (pen,ult) que ENCERRAM o REC:');
console.log('  ' + '─'.repeat(60));

const paresFim = {};
gaps.forEach(g => {
  const par = `${h[g.fim-2]},${h[g.fim-1]}`;
  paresFim[par] = (paresFim[par] || 0) + 1;
});

const paresRepetidos = Object.entries(paresFim).filter(([,c]) => c >= 2).sort((a,b)=>b[1]-a[1]);
console.log('  Pares que aparecem 2+ vezes antes do branco sair do REC:');
paresRepetidos.forEach(([par, c]) => {
  console.log(`    ${par}: ${c}x`);
});

// ══════════════════════════════════════════════════════════════
// TESTE 3: COR dos últimos N números antes do branco
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 3. COR DOMINANTE antes do branco encerrar o REC:');
console.log('  ' + '─'.repeat(60));

let stats = { p3: 0, v3: 0, mix3: 0, p5: 0, v5: 0, mix5: 0 };
gaps.forEach(g => {
  const ult3 = h.slice(g.fim - 3, g.fim);
  const ult5 = h.slice(g.fim - 5, g.fim);
  
  const p3 = ult3.filter(n => n >= 8 && n <= 14).length;
  const v3 = ult3.filter(n => n >= 1 && n <= 7).length;
  if (p3 >= 2) stats.p3++; else if (v3 >= 2) stats.v3++; else stats.mix3++;
  
  const p5 = ult5.filter(n => n >= 8 && n <= 14).length;
  const v5 = ult5.filter(n => n >= 1 && n <= 7).length;
  if (p5 >= 3) stats.p5++; else if (v5 >= 3) stats.v5++; else stats.mix5++;
});

console.log(`  Últimos 3: ${stats.p3} mais preto (${(stats.p3/totalGaps*100).toFixed(0)}%) | ${stats.v3} mais verm (${(stats.v3/totalGaps*100).toFixed(0)}%) | ${stats.mix3} mix`);
console.log(`  Últimos 5: ${stats.p5} mais preto (${(stats.p5/totalGaps*100).toFixed(0)}%) | ${stats.v5} mais verm (${(stats.v5/totalGaps*100).toFixed(0)}%) | ${stats.mix5} mix`);

// ══════════════════════════════════════════════════════════════
// TESTE 4: MUDANÇA DE COR — verm→preto como sinal?
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 4. TRANSIÇÕES DE COR nos últimos 5 antes do branco:');
console.log('  ' + '─'.repeat(60));

let transVP = 0, transPV = 0, semTrans = 0;
gaps.forEach(g => {
  const ult5 = h.slice(g.fim - 5, g.fim);
  let teveVP = false, tevePV = false;
  for (let k = 1; k < ult5.length; k++) {
    const antV = ult5[k-1] >= 1 && ult5[k-1] <= 7;
    const antP = ult5[k-1] >= 8 && ult5[k-1] <= 14;
    const curP = ult5[k] >= 8 && ult5[k] <= 14;
    const curV = ult5[k] >= 1 && ult5[k] <= 7;
    if (antV && curP) teveVP = true;
    if (antP && curV) tevePV = true;
  }
  if (teveVP) transVP++;
  if (tevePV) transPV++;
  if (!teveVP && !tevePV) semTrans++;
});
console.log(`  Transição VERM→PRETO: ${transVP}/${totalGaps} (${(transVP/totalGaps*100).toFixed(0)}%)`);
console.log(`  Transição PRETO→VERM: ${transPV}/${totalGaps} (${(transPV/totalGaps*100).toFixed(0)}%)`);
console.log(`  Sem transição (mono-cor): ${semTrans}/${totalGaps} (${(semTrans/totalGaps*100).toFixed(0)}%)`);

// ══════════════════════════════════════════════════════════════
// TESTE 5: SOMA dos últimos 3 números antes do branco
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 5. SOMA dos últimos 3 antes do branco encerrar REC:');
console.log('  ' + '─'.repeat(60));

const somas = [];
gaps.forEach(g => {
  const ult3 = h.slice(g.fim - 3, g.fim);
  somas.push(ult3.reduce((a,b) => a+b, 0));
});
const somaMedia = somas.reduce((a,b)=>a+b,0) / somas.length;
const somasAltas = somas.filter(s => s >= 25).length;
const somasBaixas = somas.filter(s => s <= 15).length;
console.log(`  Soma média: ${somaMedia.toFixed(1)} (esperado ~21 se uniforme)`);
console.log(`  Soma >= 25 (últimos 3 altos): ${somasAltas}/${totalGaps} (${(somasAltas/totalGaps*100).toFixed(0)}%)`);
console.log(`  Soma <= 15 (últimos 3 baixos): ${somasBaixas}/${totalGaps} (${(somasBaixas/totalGaps*100).toFixed(0)}%)`);

// ══════════════════════════════════════════════════════════════
// TESTE 6: POSIÇÃO DENTRO DO REC — em que momento do gap o branco tende a vir?
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 6. PADRÃO TEMPORAL — quando DENTRO do REC o branco volta?');
console.log('  ' + '─'.repeat(60));
console.log('  "Dos RECs, em qual faixa de distância o branco saiu?"');

const faixas = { '21-25': 0, '26-30': 0, '31-35': 0, '36-40': 0, '41-50': 0, '51-70': 0, '71+': 0 };
gaps.forEach(g => {
  if (g.tam <= 25) faixas['21-25']++;
  else if (g.tam <= 30) faixas['26-30']++;
  else if (g.tam <= 35) faixas['31-35']++;
  else if (g.tam <= 40) faixas['36-40']++;
  else if (g.tam <= 50) faixas['41-50']++;
  else if (g.tam <= 70) faixas['51-70']++;
  else faixas['71+']++;
});
Object.entries(faixas).forEach(([f, c]) => {
  const bar = '█'.repeat(Math.round(c / totalGaps * 30));
  console.log(`  ${f.padEnd(6)}: ${String(c).padStart(3)} (${(c/totalGaps*100).toFixed(0)}%) ${bar}`);
});

// ══════════════════════════════════════════════════════════════
// TESTE 7: REPETIÇÃO DE NÚMERO antes do branco (dentro do REC)
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 7. REPETIÇÃO (mesmo número 2x seguido) nos últimos 5 antes do branco:');
console.log('  ' + '─'.repeat(60));

let temRep = 0;
const repsQuais = {};
gaps.forEach(g => {
  const ult5 = h.slice(g.fim - 5, g.fim);
  let achou = false;
  for (let k = 1; k < ult5.length; k++) {
    if (ult5[k] === ult5[k-1] && ult5[k] !== 0) {
      achou = true;
      repsQuais[ult5[k]] = (repsQuais[ult5[k]] || 0) + 1;
    }
  }
  if (achou) temRep++;
});
console.log(`  RECs com repetição nos últimos 5: ${temRep}/${totalGaps} (${(temRep/totalGaps*100).toFixed(0)}%)`);
if (Object.keys(repsQuais).length > 0) {
  console.log('  Números que repetiram:');
  Object.entries(repsQuais).sort((a,b)=>b[1]-a[1]).forEach(([n,c]) => {
    console.log(`    ${n}: ${c}x`);
  });
}

// ══════════════════════════════════════════════════════════════
// TESTE 8: BACKTEST — testar TODOS os possíveis indicadores de fim
// ══════════════════════════════════════════════════════════════
console.log('\n▓ 8. BACKTEST COMPLETO — qual condição dentro do REC prevê o branco?');
console.log('  (Testando cada condição quando dist >= 20, P(branco em 5 casas))');
console.log('  ' + '─'.repeat(60));

function bt(nome, cond) {
  let s = 0, a = 0;
  for (let i = 5; i < T - 5; i++) {
    let dist = 0;
    for (let j = i; j >= 0; j--) { if (h[j] === 0) { dist = i - j; break; } dist = i + 1; }
    if (dist < 20) continue;
    if (cond(i, dist)) {
      s++;
      for (let k = 1; k <= 5 && i+k < T; k++) { if (h[i+k] === 0) { a++; break; } }
    }
  }
  const taxa = s > 0 ? (a/s*100).toFixed(1) : '0.0';
  const mark = s > 0 && a/s > 0.45 ? ' ★★' : s > 0 && a/s > 0.35 ? ' ★' : '';
  console.log(`  ${nome.padEnd(45)} | ${String(a).padStart(3)}/${String(s).padStart(4)} = ${taxa.padStart(5)}%${mark}`);
  return { s, a };
}

// Base
bt('[BASE] Qualquer posição (dist>=20)', (i,d) => true);
console.log('  ' + '─'.repeat(60));

// Streaks
bt('Streak 3+ preto', (i,d) => { let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=3; });
bt('Streak 4+ preto', (i,d) => { let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=4; });
bt('Streak 5+ preto', (i,d) => { let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=5; });

// Gatilhos
bt('Último = 8', (i,d) => h[i] === 8);
bt('Último = 10', (i,d) => h[i] === 10);
bt('Último = 13', (i,d) => h[i] === 13);
bt('Último = 1', (i,d) => h[i] === 1);
bt('Último = 9', (i,d) => h[i] === 9);
bt('Último = 14', (i,d) => h[i] === 14);

// Repetições
bt('Repetição (ult = pen)', (i,d) => i>=1 && h[i]===h[i-1] && h[i]!==0);
bt('Repetição de PRETO (ult=pen, ambos preto)', (i,d) => i>=1 && h[i]===h[i-1] && h[i]>=8);

// Soma
bt('Soma últimos 3 >= 30', (i,d) => i>=2 && (h[i]+h[i-1]+h[i-2]) >= 30);
bt('Soma últimos 3 >= 25', (i,d) => i>=2 && (h[i]+h[i-1]+h[i-2]) >= 25);

// Distância específica
bt('Dist >= 25', (i,d) => d >= 25);
bt('Dist >= 30', (i,d) => d >= 30);
bt('Dist >= 35', (i,d) => d >= 35);
bt('Dist >= 40', (i,d) => d >= 40);

// Combinações
bt('Streak 3+ E dist >= 25', (i,d) => { let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=3 && d>=25; });
bt('Streak 4+ E dist >= 25', (i,d) => { let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=4 && d>=25; });
bt('(Último=8 OU 10) E streak 2+ preto', (i,d) => { if(h[i]!==8&&h[i]!==10) return false; let s=0; for(let j=i;j>=0;j--){if(h[j]>=8&&h[j]<=14)s++;else break;} return s>=2; });
bt('Repetição E dist >= 25', (i,d) => i>=1 && h[i]===h[i-1] && h[i]!==0 && d>=25);
bt('Último PRETO E penúltimo VERM (trans V→P)', (i,d) => i>=1 && h[i]>=8&&h[i]<=14 && h[i-1]>=1&&h[i-1]<=7);
bt('Transição V→P E dist >= 25', (i,d) => i>=1 && h[i]>=8&&h[i]<=14 && h[i-1]>=1&&h[i-1]<=7 && d>=25);

// Número 10 (mais presente nos dados como precursor)
bt('Num 10 nos últimos 3', (i,d) => i>=2 && (h[i]===10||h[i-1]===10||h[i-2]===10));
bt('Num 10 nos últimos 3 E dist>=25', (i,d) => i>=2 && (h[i]===10||h[i-1]===10||h[i-2]===10) && d>=25);

console.log('\n' + '═'.repeat(70));
console.log('  FIM — Encontre o padrão que AVISA o fim do REC');
console.log('═'.repeat(70));
