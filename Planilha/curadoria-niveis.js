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
const totalBrancos = h.filter(n => n === 0).length;
const baseRate = totalBrancos / T;

console.log('═'.repeat(70));
console.log('  CURADORIA: DE 10% A 100% — QUAL FILTRO DÁ QUAL ACERTO?');
console.log(`  Base: ${T} rodadas | Brancos: ${totalBrancos} | Taxa base: ${(baseRate*100).toFixed(1)}%`);
console.log('═'.repeat(70));
console.log();
console.log('  COMO LER: Cada nível é um "filtro" mais apertado.');
console.log('  Filtro frouxo = muitos sinais, mas erra mais.');
console.log('  Filtro apertado = poucos sinais, mas acerta mais.');
console.log('  Pense como uma peneira: quanto mais fina, menos passa, mas o que');
console.log('  passa é mais puro.');
console.log();

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE CONDIÇÃO
// ═══════════════════════════════════════════════════════════════

function streakPreto(i) {
  let s = 0;
  for (let j = i - 1; j >= 0; j--) {
    if (h[j] >= 8 && h[j] <= 14) s++;
    else break;
  }
  return s;
}

function streakVermelho(i) {
  let s = 0;
  for (let j = i - 1; j >= 0; j--) {
    if (h[j] >= 1 && h[j] <= 7) s++;
    else break;
  }
  return s;
}

function gatilho810(i) {
  return i >= 1 && (h[i-1] === 8 || h[i-1] === 10);
}

function temNumNaJanela(i, num, janela) {
  for (let j = 1; j <= janela && i - j >= 0; j++) {
    if (h[i-j] === num) return true;
  }
  return false;
}

function parAnterior(i) {
  if (i < 2) return '';
  return `${h[i-2]},${h[i-1]}`;
}

// Pares HOT desta amostra (descobertos na análise)
const PARES_HOT_1K = new Set(['8,5','3,11','1,10','4,0','10,8']);
const PARES_VETO_1K = new Set(['5,1','10,0','12,12','12,5','7,8','8,11','2,7','11,5','12,6','6,14']);

// ═══════════════════════════════════════════════════════════════
// TESTAR CADA NÍVEL DE FILTRO
// ═══════════════════════════════════════════════════════════════

const niveis = [
  {
    nome: 'NÍVEL 1 — Sem filtro (base)',
    desc: 'Apostar em TODA rodada, sem critério nenhum.',
    cond: (i) => true,
    janela: 1
  },
  {
    nome: 'NÍVEL 2 — Streak ≥ 2 pretos',
    desc: 'Sinal: 2+ pretos seguidos antes. Peneira bem aberta.',
    cond: (i) => streakPreto(i) >= 2,
    janela: 1
  },
  {
    nome: 'NÍVEL 3 — Streak ≥ 3 pretos',
    desc: 'Mais apertado: 3+ pretos seguidos. A mola começa a comprimir.',
    cond: (i) => streakPreto(i) >= 3,
    janela: 3
  },
  {
    nome: 'NÍVEL 4 — Streak ≥ 4 pretos',
    desc: 'Mola bem comprimida. Menos sinais, mais chance.',
    cond: (i) => streakPreto(i) >= 4,
    janela: 5
  },
  {
    nome: 'NÍVEL 5 — Gatilho 8/10 sozinho',
    desc: 'O número 8 ou 10 acabou de sair. "Radar ligou".',
    cond: (i) => gatilho810(i),
    janela: 1
  },
  {
    nome: 'NÍVEL 6 — Streak ≥ 3 + Gatilho 8/10',
    desc: 'Combinação: 3+ pretos E o último é 8 ou 10. Duas confirmações.',
    cond: (i) => streakPreto(i) >= 3 && gatilho810(i),
    janela: 3
  },
  {
    nome: 'NÍVEL 7 — Streak ≥ 4 + Gatilho 8/10',
    desc: 'Mola forte + radar. Filtro apertado.',
    cond: (i) => streakPreto(i) >= 4 && gatilho810(i),
    janela: 5
  },
  {
    nome: 'NÍVEL 8 — Par HOT desta amostra',
    desc: 'Últimos 2 números formam um par "quente" (8,5 / 3,11 / 1,10 etc.)',
    cond: (i) => PARES_HOT_1K.has(parAnterior(i)),
    janela: 3
  },
  {
    nome: 'NÍVEL 9 — Streak ≥ 3 + Par HOT',
    desc: '3+ pretos + par quente. Duas evidências fortes juntas.',
    cond: (i) => streakPreto(i) >= 3 && PARES_HOT_1K.has(parAnterior(i)),
    janela: 5
  },
  {
    nome: 'NÍVEL 10 — Streak ≥ 5 pretos',
    desc: '5+ pretos seguidos. A mola está no limite, branco iminente.',
    cond: (i) => streakPreto(i) >= 5,
    janela: 5
  },
  {
    nome: 'NÍVEL 11 — Streak ≥ 4 + SEM veto',
    desc: '4+ pretos E o par atual NÃO está na lista de veto.',
    cond: (i) => streakPreto(i) >= 4 && !PARES_VETO_1K.has(parAnterior(i)),
    janela: 5
  },
  {
    nome: 'NÍVEL 12 — Streak ≥ 5 + Gatilho 8/10',
    desc: '5+ pretos + último é 8 ou 10. Máxima confiança possível.',
    cond: (i) => streakPreto(i) >= 5 && gatilho810(i),
    janela: 5
  },
  {
    nome: 'ANTI-SINAL — Streak ≥ 3 VERMELHO',
    desc: 'Quando NÃO apostar: 3+ vermelhos seguidos. Branco longe.',
    cond: (i) => streakVermelho(i) >= 3,
    janela: 1
  }
];

// ═══════════════════════════════════════════════════════════════
// EXECUTAR E MOSTRAR RESULTADOS
// ═══════════════════════════════════════════════════════════════

console.log('─'.repeat(70));

niveis.forEach((nv, idx) => {
  let sinais = 0, acertos = 0;
  
  for (let i = 5; i < T; i++) {
    if (nv.cond(i)) {
      sinais++;
      // Verificar se branco sai dentro da janela
      for (let j = 0; j < nv.janela && (i + j) < T; j++) {
        if (h[i + j] === 0) { acertos++; break; }
      }
    }
  }
  
  const taxa = sinais > 0 ? (acertos / sinais * 100) : 0;
  const lift = sinais > 0 ? taxa / (baseRate * 100 * nv.janela) : 0;
  
  // Barra visual
  const barLen = Math.round(taxa / 2);
  const bar = '█'.repeat(Math.min(barLen, 35));
  
  console.log(`\n  ${nv.nome}`);
  console.log(`  "${nv.desc}"`);
  console.log(`  Sinais: ${sinais} | Acertos: ${acertos} | Janela: ${nv.janela} casa(s)`);
  console.log(`  TAXA: ${taxa.toFixed(1)}%  ${bar}`);
  
  // Comparar com o que seria o acaso na mesma janela
  const acaso = baseRate * nv.janela * 100;
  const vantagem = taxa - acaso;
  if (vantagem > 0) {
    console.log(`  vs acaso (${acaso.toFixed(1)}%): +${vantagem.toFixed(1)}pp de vantagem ✓`);
  } else if (vantagem < -1) {
    console.log(`  vs acaso (${acaso.toFixed(1)}%): ${vantagem.toFixed(1)}pp PIOR que não fazer nada ✗`);
  } else {
    console.log(`  vs acaso (${acaso.toFixed(1)}%): empate, sem vantagem`);
  }
  console.log('  ' + '─'.repeat(66));
});

// ═══════════════════════════════════════════════════════════════
// RESUMO RANKING
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(70));
console.log('  RANKING FINAL — Melhor custo-benefício (taxa vs quantidade)');
console.log('═'.repeat(70));
console.log();
console.log('  Nível | Taxa   | Sinais | O que faz');
console.log('  ' + '─'.repeat(60));

const ranking = niveis.map((nv, idx) => {
  let sinais = 0, acertos = 0;
  for (let i = 5; i < T; i++) {
    if (nv.cond(i)) {
      sinais++;
      for (let j = 0; j < nv.janela && (i + j) < T; j++) {
        if (h[i + j] === 0) { acertos++; break; }
      }
    }
  }
  return { idx: idx + 1, nome: nv.nome.split('—')[1]?.trim() || nv.nome, taxa: sinais > 0 ? acertos/sinais*100 : 0, sinais, janela: nv.janela };
}).sort((a, b) => b.taxa - a.taxa);

ranking.forEach(r => {
  const mark = r.taxa >= 30 ? '🔥' : r.taxa >= 15 ? '✓' : r.taxa < 5 ? '✗' : ' ';
  console.log(`   ${String(r.idx).padStart(2)}  | ${r.taxa.toFixed(1).padStart(5)}% | ${String(r.sinais).padStart(5)}  | ${r.nome} (J=${r.janela}) ${mark}`);
});

console.log('\n' + '═'.repeat(70));
console.log('  LEGENDA:');
console.log('  🔥 = Altíssima taxa (>30%) — poucos sinais mas OURO');
console.log('  ✓  = Boa taxa (>15%) — vale operar');
console.log('  ✗  = Abaixo do acaso — NÃO apostar nessa condição');
console.log('  J  = Janela (quantas casas você tem pra acertar)');
console.log('═'.repeat(70));
