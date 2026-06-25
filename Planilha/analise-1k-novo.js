const XLSX = require('xlsx');
const path = require('path');

// Carregar dados novos (1000 rodadas)
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (12).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Extrair números (ordem cronológica: mais antigo primeiro)
// Linha 0 = cabeçalho, linha 1 = "tipminer.com", dados a partir de linha 2
// Coluna A (index 0) = número | Arquivo vem do mais recente pro antigo → inverter
const dados = [];
for (let i = rows.length - 1; i >= 2; i--) {
  const row = rows[i];
  if (!row || row.length < 2) continue;
  const num = parseInt(row[0]); // coluna A = número
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}

const h = dados, T = h.length;
const totalBrancos = h.filter(n => n === 0).length;
const baseRate = totalBrancos / T;

console.log('═'.repeat(70));
console.log(`  ANÁLISE COMPLETA — 1000 RODADAS RECENTES`);
console.log(`  Total: ${T} rodadas | Brancos: ${totalBrancos} | Base: ${(baseRate*100).toFixed(2)}%`);
console.log('═'.repeat(70));

// ══════════════════════════════════════════════════════════════════
// 1. STREAKS DE COR → probabilidade do branco
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 1. STREAKS DE COR — sequências de PRETO/VERMELHO antes do branco');
console.log('  (Preto = 8-14, Vermelho = 1-7)\n');

function contarStreaks() {
  const resultados = {};
  for (let len = 3; len <= 10; len++) {
    resultados[`preto_${len}`] = { acertos: 0, total: 0 };
    resultados[`verm_${len}`] = { acertos: 0, total: 0 };
  }
  
  for (let i = 3; i < T - 1; i++) {
    // contar streak de preto até aqui
    let streakPreto = 0;
    for (let j = i; j >= 0; j--) {
      if (h[j] >= 8 && h[j] <= 14) streakPreto++;
      else break;
    }
    // contar streak de vermelho
    let streakVerm = 0;
    for (let j = i; j >= 0; j--) {
      if (h[j] >= 1 && h[j] <= 7) streakVerm++;
      else break;
    }
    
    for (let len = 3; len <= 10; len++) {
      if (streakPreto >= len) {
        resultados[`preto_${len}`].total++;
        if (h[i + 1] === 0) resultados[`preto_${len}`].acertos++;
      }
      if (streakVerm >= len) {
        resultados[`verm_${len}`].total++;
        if (h[i + 1] === 0) resultados[`verm_${len}`].acertos++;
      }
    }
  }
  return resultados;
}

const streaks = contarStreaks();
console.log('  Streak     | P(branco) | N   | vs base | Status');
console.log('  ' + '─'.repeat(55));
for (let len = 3; len <= 9; len++) {
  const sp = streaks[`preto_${len}`];
  const sv = streaks[`verm_${len}`];
  if (sp.total >= 5) {
    const rate = sp.total > 0 ? sp.acertos / sp.total : 0;
    const diff = (rate - baseRate) * 100;
    const status = diff > 2 ? '★ ELEVA!' : diff < -2 ? '↓ reduz' : '  normal';
    console.log(`  ${len}x PRETO | ${(rate*100).toFixed(1)}%     | ${String(sp.total).padStart(4)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp  | ${status}`);
  }
  if (sv.total >= 5) {
    const rate = sv.total > 0 ? sv.acertos / sv.total : 0;
    const diff = (rate - baseRate) * 100;
    const status = diff > 2 ? '★ ELEVA!' : diff < -2 ? '↓ reduz' : '  normal';
    console.log(`  ${len}x VERM. | ${(rate*100).toFixed(1)}%     | ${String(sv.total).padStart(4)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp  | ${status}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. PARES (últimos 2 números) → P(branco na próxima)
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 2. TOP PARES — últimos 2 números antes do branco');
console.log('  (Ordenados por taxa, mínimo N=5)\n');

const pares = {};
for (let i = 2; i < T; i++) {
  const par = `${h[i-2]},${h[i-1]}`;
  if (!pares[par]) pares[par] = { total: 0, acertos: 0 };
  pares[par].total++;
  if (h[i] === 0) pares[par].acertos++;
}

const paresArr = Object.entries(pares)
  .filter(([, v]) => v.total >= 5)
  .map(([k, v]) => ({ par: k, taxa: v.acertos / v.total, n: v.total, acertos: v.acertos }))
  .sort((a, b) => b.taxa - a.taxa);

console.log('  Par    | Taxa    | N  | Acertos | Z-score');
console.log('  ' + '─'.repeat(50));
paresArr.slice(0, 15).forEach(p => {
  const z = (p.taxa - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / p.n);
  const mark = z >= 1.96 ? ' ★' : '';
  console.log(`  ${p.par.padEnd(6)} | ${(p.taxa*100).toFixed(1)}%   | ${String(p.n).padStart(3)} | ${String(p.acertos).padStart(4)}    | ${z.toFixed(2)}${mark}`);
});

// Piores pares (veto)
console.log('\n  PIORES PARES (veto):');
console.log('  ' + '─'.repeat(50));
paresArr.filter(p => p.taxa === 0 && p.n >= 5).slice(0, 10).forEach(p => {
  console.log(`  ${p.par.padEnd(6)} | 0.0%   | ${String(p.n).padStart(3)} | 0       | VETO`);
});

// ══════════════════════════════════════════════════════════════════
// 3. CONDIÇÕES COMBINADAS (11+12, repetição, etc.)
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 3. CONDIÇÕES ESPECIAIS');
console.log('  ' + '─'.repeat(55));

// 11 + 12 nas últimas 4
let cond1 = { total: 0, acertos: 0 };
for (let i = 4; i < T; i++) {
  const janela = [h[i-4], h[i-3], h[i-2], h[i-1]];
  if (janela.includes(11) && janela.includes(12)) {
    cond1.total++;
    if (h[i] === 0) cond1.acertos++;
  }
}
const r1 = cond1.total > 0 ? cond1.acertos / cond1.total : 0;
const z1 = cond1.total > 0 ? (r1 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond1.total) : 0;
console.log(`  11+12 nas últimas 4: ${(r1*100).toFixed(1)}% (N=${cond1.total}, Z=${z1.toFixed(2)})`);

// Repetição (mesmo número 2x nas últimas 3)
let cond2 = { total: 0, acertos: 0 };
for (let i = 3; i < T; i++) {
  const janela = [h[i-3], h[i-2], h[i-1]];
  const temRep = janela.some((n, idx) => janela.indexOf(n) !== idx);
  if (temRep) {
    cond2.total++;
    if (h[i] === 0) cond2.acertos++;
  }
}
const r2 = cond2.total > 0 ? cond2.acertos / cond2.total : 0;
const z2 = cond2.total > 0 ? (r2 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond2.total) : 0;
console.log(`  Repetição (2x em 3): ${(r2*100).toFixed(1)}% (N=${cond2.total}, Z=${z2.toFixed(2)})`);

// Número alto (13 ou 14) nas últimas 2
let cond3 = { total: 0, acertos: 0 };
for (let i = 2; i < T; i++) {
  if (h[i-1] >= 13 || h[i-2] >= 13) {
    cond3.total++;
    if (h[i] === 0) cond3.acertos++;
  }
}
const r3 = cond3.total > 0 ? cond3.acertos / cond3.total : 0;
const z3 = cond3.total > 0 ? (r3 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond3.total) : 0;
console.log(`  Num 13/14 nas últimas 2: ${(r3*100).toFixed(1)}% (N=${cond3.total}, Z=${z3.toFixed(2)})`);

// Gatilho: 8 ou 10 imediatamente antes
let cond4 = { total: 0, acertos: 0 };
for (let i = 1; i < T; i++) {
  if (h[i-1] === 8 || h[i-1] === 10) {
    cond4.total++;
    if (h[i] === 0) cond4.acertos++;
  }
}
const r4 = cond4.total > 0 ? cond4.acertos / cond4.total : 0;
const z4 = cond4.total > 0 ? (r4 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond4.total) : 0;
console.log(`  Gatilho 8/10 (imediato): ${(r4*100).toFixed(1)}% (N=${cond4.total}, Z=${z4.toFixed(2)})`);

// Soma dos últimos 3 >= 30
let cond5 = { total: 0, acertos: 0 };
for (let i = 3; i < T; i++) {
  const soma = h[i-1] + h[i-2] + h[i-3];
  if (soma >= 30) {
    cond5.total++;
    if (h[i] === 0) cond5.acertos++;
  }
}
const r5 = cond5.total > 0 ? cond5.acertos / cond5.total : 0;
const z5 = cond5.total > 0 ? (r5 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond5.total) : 0;
console.log(`  Soma últimos 3 >= 30: ${(r5*100).toFixed(1)}% (N=${cond5.total}, Z=${z5.toFixed(2)})`);

// 9 na janela de 3
let cond6 = { total: 0, acertos: 0 };
for (let i = 3; i < T; i++) {
  if (h[i-1] === 9 || h[i-2] === 9 || h[i-3] === 9) {
    cond6.total++;
    if (h[i] === 0) cond6.acertos++;
  }
}
const r6 = cond6.total > 0 ? cond6.acertos / cond6.total : 0;
const z6 = cond6.total > 0 ? (r6 - baseRate) / Math.sqrt(baseRate * (1 - baseRate) / cond6.total) : 0;
console.log(`  Num 9 na janela de 3: ${(r6*100).toFixed(1)}% (N=${cond6.total}, Z=${z6.toFixed(2)})`);

// ══════════════════════════════════════════════════════════════════
// 4. DISTRIBUIÇÃO DE GAPS (distância entre brancos)
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 4. GAPS ENTRE BRANCOS — ritmo do branco neste período');
const gaps = [];
let lastBranco = -1;
for (let i = 0; i < T; i++) {
  if (h[i] === 0) {
    if (lastBranco >= 0) gaps.push(i - lastBranco);
    lastBranco = i;
  }
}
const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const maxGap = Math.max(...gaps);
const minGap = Math.min(...gaps);
const medianGap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];

console.log(`  Gaps: ${gaps.length} intervalos entre brancos`);
console.log(`  Média: ${avgGap.toFixed(1)} rodadas | Mediana: ${medianGap}`);
console.log(`  Menor: ${minGap} | Maior: ${maxGap}`);

// Distribuição por faixas
const faixas = { '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21-30': 0, '31+': 0 };
gaps.forEach(g => {
  if (g <= 5) faixas['1-5']++;
  else if (g <= 10) faixas['6-10']++;
  else if (g <= 15) faixas['11-15']++;
  else if (g <= 20) faixas['16-20']++;
  else if (g <= 30) faixas['21-30']++;
  else faixas['31+']++;
});
console.log('\n  Faixa   | Qtd | %');
console.log('  ' + '─'.repeat(30));
Object.entries(faixas).forEach(([f, n]) => {
  console.log(`  ${f.padEnd(7)} | ${String(n).padStart(3)} | ${(n/gaps.length*100).toFixed(1)}%`);
});

// ══════════════════════════════════════════════════════════════════
// 5. COMPARAR COM BASE 10K — o que MUDOU?
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 5. COMPARAÇÃO COM BASE 10K — o que mudou nesse período?');
console.log('  ' + '─'.repeat(55));

// Frequência de cada número
console.log('\n  Num | Freq 1k | Freq esperada (6.67%) | Desvio');
console.log('  ' + '─'.repeat(50));
for (let n = 0; n <= 14; n++) {
  const freq = h.filter(x => x === n).length;
  const pct = freq / T * 100;
  const expected = n === 0 ? baseRate * 100 : (100 - baseRate * 100) / 14;
  const diff = pct - expected;
  const mark = Math.abs(diff) > 1.5 ? (diff > 0 ? '↑' : '↓') : ' ';
  console.log(`   ${String(n).padStart(2)} | ${pct.toFixed(1)}%   | ${expected.toFixed(1)}%              | ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp ${mark}`);
}

// ══════════════════════════════════════════════════════════════════
// 6. JANELA IDEAL — qual o melhor J nessas 1k rodadas?
// ══════════════════════════════════════════════════════════════════
console.log('\n▓ 6. JANELA IDEAL — casa 1 a 10 após sinal');

// Simular sinal simples: 5+ pretos seguidos
function testarJanela() {
  console.log('  (Sinal = 5+ PRETOS seguidos)\n');
  console.log('  Casa | Acertos | Sinais | Taxa   | vs base');
  console.log('  ' + '─'.repeat(45));
  
  for (let j = 1; j <= 10; j++) {
    let sinais = 0, acertos = 0;
    for (let i = 5; i < T - j; i++) {
      // verificar se tem 5+ pretos seguidos terminando em i-1
      let streak = 0;
      for (let k = i - 1; k >= 0; k--) {
        if (h[k] >= 8 && h[k] <= 14) streak++;
        else break;
      }
      if (streak >= 5) {
        sinais++;
        // verificar se branco sai dentro da casa j
        if (h[i + j - 1] === 0) acertos++;
      }
    }
    if (sinais > 0) {
      const taxa = acertos / sinais;
      const diff = (taxa - baseRate) * 100;
      console.log(`    ${String(j).padStart(2)} |   ${String(acertos).padStart(3)}   |  ${String(sinais).padStart(4)}  | ${(taxa*100).toFixed(1)}%  | ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`);
    }
  }
}
testarJanela();

console.log('\n' + '═'.repeat(70));
console.log('  FIM — Dados puros das últimas ~1000 rodadas.');
console.log('═'.repeat(70));
