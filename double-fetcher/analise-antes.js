const XLSX = require('xlsx');
const wb = XLSX.readFile('./exports/blaze-double-2000-2026-06-04T01-16-22.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// idx 0 = mais recente, idx N = mais antigo
// "antes no tempo" do duplo = idx MAIOR que o duplo

const toMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const fmtH = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
};

console.log('=== ANÁLISE PADRÃO X — 2 NÚMEROS ANTES DO BRANCO DUPLO ===');
console.log(`Total linhas: ${data.length}`);
console.log(`Período: ${data[data.length-1].Horario} até ${data[0].Horario}\n`);

// 1. Encontrar brancos duplos
const duplos = [];
for (let i = 0; i < data.length - 1; i++) {
  if (data[i].Cor === 'Branco' && data[i + 1].Cor === 'Branco') {
    const jaContado = duplos.length > 0 && duplos[duplos.length - 1].idx1 === i;
    if (!jaContado) {
      duplos.push({
        idx1: i,      // segundo branco (mais recente)
        idx2: i + 1,  // primeiro branco (mais antigo no tempo)
        hora1: data[i].Horario,
        hora2: data[i + 1].Horario
      });
    }
  }
}

console.log(`BRANCOS DUPLOS encontrados: ${duplos.length}`);
console.log('========================================\n');

const tolerancia = 5;
let acertos = 0;
let totalTestados = 0;

duplos.forEach((d, di) => {
  // Pegar os 2 números imediatamente ANTES do duplo no tempo (idx > idx2)
  // Pular brancos se houver
  const antes = [];
  for (let k = d.idx2 + 1; k < data.length && antes.length < 2; k++) {
    if (data[k].Cor !== 'Branco') {
      antes.push(data[k]);
    }
  }

  if (antes.length < 2) return;

  const n1 = antes[0]; // 1º número antes do duplo
  const n2 = antes[1]; // 2º número antes do duplo

  // Horário do duplo (usar o mais recente)
  const minDuplo = toMin(d.hora1);

  // Próximo branco no futuro (idx menor que idx1)
  let proxBranco = null;
  for (let k = d.idx1 - 1; k >= 0; k--) {
    if (data[k].Cor === 'Branco') {
      proxBranco = { ...data[k], idx: k };
      break;
    }
  }

  if (!proxBranco) return;

  const minProx = toMin(proxBranco.Horario);
  const diffReal = minProx >= minDuplo ? minProx - minDuplo : (minProx + 1440) - minDuplo;

  totalTestados++;

  const c1 = n1.Cor === 'Preto' ? 'P' : n1.Cor === 'Vermelho' ? 'V' : 'B';
  const c2 = n2.Cor === 'Preto' ? 'P' : n2.Cor === 'Vermelho' ? 'V' : 'B';

  const soma = n1.Numero + n2.Numero;
  const mult = n1.Numero * n2.Numero;
  const diff = Math.abs(n1.Numero - n2.Numero);
  const erroSoma = Math.abs(diffReal - soma);
  const erroMult = Math.abs(diffReal - mult);
  const erroDiff = Math.abs(diffReal - diff);

  // Contexto
  const ctx = [];
  for (let k = d.idx2 + 4; k >= d.idx1 - 3; k--) {
    if (k >= 0 && k < data.length) {
      const r = data[k];
      const c = r.Cor === 'Preto' ? 'P' : r.Cor === 'Vermelho' ? 'V' : 'B';
      const marker = (k === d.idx1 || k === d.idx2) ? `[${r.Numero}${c}]` : `${r.Numero}${c}`;
      ctx.push(marker);
    }
  }

  console.log(`═══ DUPLO #${di + 1} ═══`);
  console.log(`  Horário: ${d.hora2} / ${d.hora1} (idx ${d.idx2}/${d.idx1})`);
  console.log(`  Contexto: ${ctx.join(' ')}`);
  console.log(`  2 números ANTES: ${n1.Numero}${c1} e ${n2.Numero}${c2}`);
  console.log(`  Próx branco REAL: ${proxBranco.Horario} (em ${diffReal} min)`);
  console.log(`  ---`);
  console.log(`  SOMA: ${n1.Numero}+${n2.Numero} = ${soma}min → prev ${fmtH(minDuplo + soma)} | erro: ${erroSoma}min ${erroSoma <= tolerancia ? '✅' : '❌'}`);
  console.log(`  MULT: ${n1.Numero}×${n2.Numero} = ${mult}min → prev ${fmtH(minDuplo + mult)} | erro: ${erroMult}min ${erroMult <= tolerancia ? '✅' : '❌'}`);
  console.log(`  DIFF: |${n1.Numero}-${n2.Numero}| = ${diff}min → prev ${fmtH(minDuplo + diff)} | erro: ${erroDiff}min ${erroDiff <= tolerancia ? '✅' : '❌'}`);

  const acertou = erroSoma <= tolerancia || erroMult <= tolerancia || erroDiff <= tolerancia;
  if (acertou) {
    acertos++;
    console.log(`  🎯 ACERTOU!`);
  } else {
    console.log(`  ❌ FALHOU`);
  }
  console.log('');
});

console.log(`╔══════════════════════════════════════════╗`);
console.log(`║  CURADORIA — 2 ANTES DO DUPLO           ║`);
console.log(`╠══════════════════════════════════════════╣`);
console.log(`║ Brancos duplos testados: ${totalTestados}              ║`);
console.log(`║ Acertos (±5min):        ${acertos}/${totalTestados} = ${(acertos/totalTestados*100).toFixed(1)}%  ║`);
console.log(`║ Falhas:                 ${totalTestados - acertos}/${totalTestados} = ${((totalTestados-acertos)/totalTestados*100).toFixed(1)}%  ║`);
console.log(`╚══════════════════════════════════════════╝`);
console.log(`\nMétodos: SOMA, MULTIPLICAÇÃO, DIFERENÇA dos 2 números imediatamente antes do duplo`);
