const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (12).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const dados = [];
for (let i = rows.length - 1; i >= 2; i--) {
  const row = rows[i];
  if (!row || row.length < 2) continue;
  const num = parseInt(row[0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}

const h = dados, T = h.length;

console.log('═'.repeat(70));
console.log('  ANÁLISE DE REC — Quando o branco some e quando volta');
console.log(`  ${T} rodadas | Brancos: ${h.filter(n=>n===0).length}`);
console.log('═'.repeat(70));

// 1. Encontrar todos os gaps
const brancoPositions = [];
for (let i = 0; i < T; i++) {
  if (h[i] === 0) brancoPositions.push(i);
}

const gaps = [];
for (let i = 1; i < brancoPositions.length; i++) {
  gaps.push({
    inicio: brancoPositions[i-1],
    fim: brancoPositions[i],
    tamanho: brancoPositions[i] - brancoPositions[i-1]
  });
}

// 2. Classificar gaps
const normais = gaps.filter(g => g.tamanho <= 15);
const longos = gaps.filter(g => g.tamanho > 15 && g.tamanho <= 30);
const recs = gaps.filter(g => g.tamanho > 30);

console.log(`\n▓ 1. DISTRIBUIÇÃO DE GAPS:`);
console.log(`  Normais (<=15): ${normais.length} (${(normais.length/gaps.length*100).toFixed(0)}%)`);
console.log(`  Longos (16-30): ${longos.length} (${(longos.length/gaps.length*100).toFixed(0)}%)`);
console.log(`  REC (>30): ${recs.length} (${(recs.length/gaps.length*100).toFixed(0)}%)`);

// 3. Detalhes de cada REC
console.log(`\n▓ 2. DETALHES DE CADA REC (gap > 30):`);
console.log('  ' + '─'.repeat(65));

recs.forEach((rec, idx) => {
  const seqDentro = h.slice(rec.inicio + 1, rec.fim);
  const antes = h.slice(Math.max(0, rec.inicio - 4), rec.inicio + 1);
  const finais5 = h.slice(rec.fim - 5, rec.fim);
  
  const pretosCount = seqDentro.filter(n => n >= 8 && n <= 14).length;
  const vermCount = seqDentro.filter(n => n >= 1 && n <= 7).length;
  
  let streakPretoFinal = 0;
  for (let j = rec.fim - 1; j > rec.inicio; j--) {
    if (h[j] >= 8 && h[j] <= 14) streakPretoFinal++;
    else break;
  }
  
  console.log(`\n  REC #${idx+1}: Gap de ${rec.tamanho} rodadas (pos ${rec.inicio} -> ${rec.fim})`);
  console.log(`  Antes: [${antes.join(',')}] | Pretos dentro: ${pretosCount}/${seqDentro.length}`);
  console.log(`  Ult 5 antes do branco: [${finais5.join(',')}] | Streak preto final: ${streakPretoFinal}`);
});

// 4. Threshold ideal para declarar REC
console.log(`\n▓ 3. THRESHOLD: A partir de qual distância declarar REC?`);
console.log('  ' + '─'.repeat(65));
console.log('  "Se já passaram X rodadas sem branco, qual a chance de vir em 5?"');

for (let threshold of [10, 12, 15, 18, 20, 25, 30, 35, 40]) {
  let situacoes = 0, brancoEm5 = 0, brancoEm10 = 0;
  
  for (let i = 0; i < T; i++) {
    let dist = 0;
    for (let j = i; j >= 0; j--) {
      if (h[j] === 0) { dist = i - j; break; }
      dist = i + 1;
    }
    
    if (dist === threshold) {
      situacoes++;
      for (let k = 1; k <= 5 && i+k < T; k++) {
        if (h[i+k] === 0) { brancoEm5++; break; }
      }
      for (let k = 1; k <= 10 && i+k < T; k++) {
        if (h[i+k] === 0) { brancoEm10++; break; }
      }
    }
  }
  
  const taxa5 = situacoes > 0 ? (brancoEm5/situacoes*100) : 0;
  const taxa10 = situacoes > 0 ? (brancoEm10/situacoes*100) : 0;
  const status = taxa5 < 25 ? '← SECO' : taxa5 > 40 ? '← QUENTE' : '';
  console.log(`  Dist=${String(threshold).padStart(2)}: N=${String(situacoes).padStart(3)} | P(branco em 5): ${taxa5.toFixed(0).padStart(3)}% | P(branco em 10): ${taxa10.toFixed(0).padStart(3)}% ${status}`);
}

// 5. Condições de saída do REC
console.log(`\n▓ 4. O QUE INDICA FIM DO REC? (gaps > 20)`);
console.log('  ' + '─'.repeat(65));

const recsExtended = gaps.filter(g => g.tamanho > 20);
let condFim = { streak3: 0, streak4: 0, gat810: 0, num1314: 0, total: recsExtended.length };

recsExtended.forEach(rec => {
  let sp = 0;
  for (let j = rec.fim - 1; j > rec.inicio; j--) {
    if (h[j] >= 8 && h[j] <= 14) sp++;
    else break;
  }
  if (sp >= 3) condFim.streak3++;
  if (sp >= 4) condFim.streak4++;
  if (h[rec.fim - 1] === 8 || h[rec.fim - 1] === 10) condFim.gat810++;
  const ult3 = h.slice(rec.fim - 3, rec.fim);
  if (ult3.includes(13) || ult3.includes(14)) condFim.num1314++;
});

console.log(`  De ${condFim.total} saídas de gap longo/REC:`);
console.log(`    Streak 3+ preto no fim: ${condFim.streak3} (${(condFim.streak3/condFim.total*100).toFixed(0)}%)`);
console.log(`    Streak 4+ preto no fim: ${condFim.streak4} (${(condFim.streak4/condFim.total*100).toFixed(0)}%)`);
console.log(`    8 ou 10 como último:    ${condFim.gat810} (${(condFim.gat810/condFim.total*100).toFixed(0)}%)`);
console.log(`    13/14 nos últimos 3:    ${condFim.num1314} (${(condFim.num1314/condFim.total*100).toFixed(0)}%)`);

// 6. Testar regras de saída com backtest
console.log(`\n▓ 5. BACKTEST: Qual regra de "fim do REC" funciona melhor?`);
console.log('  ' + '─'.repeat(65));

function testarRegraFimRec(nome, condicao) {
  let sinais = 0, acertos = 0;
  for (let i = 5; i < T - 5; i++) {
    let dist = 0;
    for (let j = i; j >= 0; j--) {
      if (h[j] === 0) { dist = i - j; break; }
      dist = i + 1;
    }
    if (dist < 20) continue; // só dentro de REC
    
    if (condicao(i, dist)) {
      sinais++;
      for (let k = 1; k <= 5 && i+k < T; k++) {
        if (h[i+k] === 0) { acertos++; break; }
      }
    }
  }
  const taxa = sinais > 0 ? (acertos/sinais*100) : 0;
  console.log(`  ${nome.padEnd(40)} | ${acertos}/${sinais} = ${taxa.toFixed(1)}%`);
  return { sinais, acertos, taxa };
}

// Regra A: streak 3+ preto dentro do REC
testarRegraFimRec('Streak 3+ preto (dist>=20)', (i, dist) => {
  let sp = 0;
  for (let j = i; j >= 0; j--) { if (h[j] >= 8 && h[j] <= 14) sp++; else break; }
  return sp >= 3;
});

// Regra B: streak 4+ preto
testarRegraFimRec('Streak 4+ preto (dist>=20)', (i, dist) => {
  let sp = 0;
  for (let j = i; j >= 0; j--) { if (h[j] >= 8 && h[j] <= 14) sp++; else break; }
  return sp >= 4;
});

// Regra C: gatilho 8/10 + dist>=25
testarRegraFimRec('Gatilho 8/10 + dist>=25', (i, dist) => {
  return dist >= 25 && (h[i] === 8 || h[i] === 10);
});

// Regra D: streak 3+ preto E dist>=25
testarRegraFimRec('Streak 3+ preto E dist>=25', (i, dist) => {
  let sp = 0;
  for (let j = i; j >= 0; j--) { if (h[j] >= 8 && h[j] <= 14) sp++; else break; }
  return sp >= 3 && dist >= 25;
});

// Regra E: streak 4+ preto OU (gat 8/10 E dist>=30)
testarRegraFimRec('Streak 4+ OU (gat810 E dist>=30)', (i, dist) => {
  let sp = 0;
  for (let j = i; j >= 0; j--) { if (h[j] >= 8 && h[j] <= 14) sp++; else break; }
  return sp >= 4 || ((h[i] === 8 || h[i] === 10) && dist >= 30);
});

// Regra F: qualquer coisa com dist >= 35 (urgência)
testarRegraFimRec('Dist >= 35 (qualquer)', (i, dist) => dist >= 35);

// Regra G: dist>=20 E (streak 3+ OU gatilho)
testarRegraFimRec('dist>=20 E (streak3 OU gat810)', (i, dist) => {
  let sp = 0;
  for (let j = i; j >= 0; j--) { if (h[j] >= 8 && h[j] <= 14) sp++; else break; }
  return sp >= 3 || (h[i] === 8 || h[i] === 10);
});

// 7. Anti-teste: dentro do REC sem condição (para ver a "base")
console.log('\n  [Referência] Apostar SEMPRE dentro do REC (dist>=20):');
testarRegraFimRec('Qualquer (dist>=20, base)', (i, dist) => true);

console.log('\n' + '═'.repeat(70));
console.log('  FIM');
console.log('═'.repeat(70));
