/**
 * VALIDAÇÃO DO "PADRÃO X" — Previsão temporal do branco
 * 
 * Teoria: quando branco sai no horário T, pega os 2 números ANTES,
 * multiplica ou soma → resultado em minutos → próximo branco em T + M min
 * 
 * Dados: tipminer-dados-blaze-double (13).xlsx (1000 rodadas ~8h)
 */

const XLSX = require('xlsx');

// Carregar dados
const wb = XLSX.readFile('tipminer-dados-blaze-double (13).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);

// Limpar (remover header tipminer.com)
const dados = raw.filter(r => typeof r['Número'] === 'number' && r['Horário']);

// Dados vêm do mais recente ao mais antigo → inverter para cronológico
dados.reverse();

console.log(`\n${'═'.repeat(70)}`);
console.log(`  VALIDAÇÃO "PADRÃO X" — Previsão Temporal do Branco`);
console.log(`  Dataset: ${dados.length} rodadas (${dados[0].Data} ${dados[0]['Horário']} → ${dados[dados.length-1].Data} ${dados[dados.length-1]['Horário']})`);
console.log(`${'═'.repeat(70)}\n`);

// Converter horário para minutos absolutos (suporte a múltiplos dias)
function horarioParaMinutos(data, horario) {
  const [h, m, s] = horario.split(':').map(Number);
  const dia = parseInt(data.split('/')[0]);
  const baseMin = h * 60 + m + s / 60;
  if (dia === 30) return baseMin + 1440;
  return baseMin;
}

// Encontrar todos os brancos
const brancos = [];
for (let i = 0; i < dados.length; i++) {
  if (dados[i]['Número'] === 0) {
    brancos.push({
      idx: i,
      data: dados[i].Data,
      horario: dados[i]['Horário'],
      minutos: horarioParaMinutos(dados[i].Data, dados[i]['Horário'])
    });
  }
}

console.log(`  Total de brancos: ${brancos.length}`);
console.log(`  Intervalo médio entre brancos: ${((brancos[brancos.length-1].minutos - brancos[0].minutos) / (brancos.length-1)).toFixed(1)} min\n`);

// === TESTE 1: Para cada branco, pegar os 2 números antes e prever o próximo ===
const TOLERANCIAS = [1, 2, 3, 5, 10];
let totalPares = 0;
const acertosMultProx = {}, acertosSomaProx = {};
const acertosMultQualquer = {}, acertosSomaQualquer = {};
TOLERANCIAS.forEach(t => { acertosMultProx[t] = 0; acertosSomaProx[t] = 0; acertosMultQualquer[t] = 0; acertosSomaQualquer[t] = 0; });

const horariosBrancos = brancos.map(b => b.minutos);
const exemplos = [];

function corDoNumero(n) {
  if (n === 0) return 'branco';
  if (n >= 1 && n <= 7) return 'V';
  return 'P';
}

for (let b = 0; b < brancos.length - 1; b++) {
  const branco = brancos[b];
  const proximoBranco = brancos[b + 1];
  
  if (branco.idx < 2) continue;
  
  const n1 = dados[branco.idx - 1]['Número']; // imediatamente antes
  const n2 = dados[branco.idx - 2]['Número']; // 2 antes
  
  if (n1 === 0 || n2 === 0) continue;
  
  const cor1 = corDoNumero(n1);
  const cor2 = corDoNumero(n2);
  const mesmaCor = (cor1 === cor2);
  
  const produto = n1 * n2;
  const soma = n1 + n2;
  const tempoReal = proximoBranco.minutos - branco.minutos;
  
  totalPares++;
  
  const erroMult = Math.abs(tempoReal - produto);
  const erroSoma = Math.abs(tempoReal - soma);
  
  for (const tol of TOLERANCIAS) {
    if (erroMult <= tol) acertosMultProx[tol]++;
    if (erroSoma <= tol) acertosSomaProx[tol]++;
    
    // Qualquer branco futuro
    const acMult = horariosBrancos.some(hb => hb > branco.minutos && Math.abs(hb - (branco.minutos + produto)) <= tol);
    const acSoma = horariosBrancos.some(hb => hb > branco.minutos && Math.abs(hb - (branco.minutos + soma)) <= tol);
    if (acMult) acertosMultQualquer[tol]++;
    if (acSoma) acertosSomaQualquer[tol]++;
  }
  
  exemplos.push({
    branco: branco.horario, n1, n2, cor1, cor2, mesmaCor,
    produto, soma, tempoReal: tempoReal.toFixed(1),
    erroMult: erroMult.toFixed(1), erroSoma: erroSoma.toFixed(1),
    proximoBranco: proximoBranco.horario
  });
}

// === BASELINE (chance de acertar por ACASO) ===
const duracaoTotal = horariosBrancos[horariosBrancos.length-1] - horariosBrancos[0];
const densidadeBrancos = brancos.length / duracaoTotal;
const baselinePorTol = {};
TOLERANCIAS.forEach(tol => {
  const janela = 2 * tol;
  const lambda = densidadeBrancos * janela;
  baselinePorTol[tol] = (1 - Math.exp(-lambda)) * 100;
});

// === IMPRIMIR ===
console.log(`▓ TESTE 1: N1×N2 ou N1+N2 prevê o PRÓXIMO branco?`);
console.log(`  Pares testados: ${totalPares}\n`);

console.log('  Tolerância │ MULT (×)  │ SOMA (+)  │ ACASO (baseline)');
console.log('  ───────────┼───────────┼───────────┼──────────────────');
for (const tol of TOLERANCIAS) {
  const pM = (acertosMultProx[tol] / totalPares * 100).toFixed(1);
  const pS = (acertosSomaProx[tol] / totalPares * 100).toFixed(1);
  const base = baselinePorTol[tol].toFixed(1);
  const liftM = (acertosMultProx[tol] / totalPares * 100 / baselinePorTol[tol]).toFixed(2);
  const liftS = (acertosSomaProx[tol] / totalPares * 100 / baselinePorTol[tol]).toFixed(2);
  console.log(`    ±${String(tol).padEnd(2)} min │ ${pM.padStart(5)}% (${liftM}x) │ ${pS.padStart(5)}% (${liftS}x) │ ${base}%`);
}

console.log(`\n▓ TESTE 2: Previsão acerta QUALQUER branco futuro?`);
console.log(`  (mais fácil — se prevê 120min no futuro, qualquer branco nessa janela conta)\n`);

console.log('  Tolerância │ MULT (×)  │ SOMA (+)  │ ACASO');
console.log('  ───────────┼───────────┼───────────┼──────');
for (const tol of TOLERANCIAS) {
  const pM = (acertosMultQualquer[tol] / totalPares * 100).toFixed(1);
  const pS = (acertosSomaQualquer[tol] / totalPares * 100).toFixed(1);
  const base = baselinePorTol[tol].toFixed(1);
  console.log(`    ±${String(tol).padEnd(2)} min │ ${pM.padStart(5)}%     │ ${pS.padStart(5)}%     │ ${base}%`);
}

// === DISTRIBUIÇÃO DE ERROS ===
console.log(`\n▓ DISTRIBUIÇÃO DO ERRO (melhor entre MULT e SOMA vs próximo branco):`);
const erros = exemplos.map(e => Math.min(parseFloat(e.erroMult), parseFloat(e.erroSoma)));
erros.sort((a, b) => a - b);

const faixas = [[0,1],[1,3],[3,5],[5,10],[10,20],[20,50],[50,200]];
faixas.forEach(([min, max]) => {
  const count = erros.filter(e => e >= min && e < max).length;
  const pct = (count / erros.length * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(pct / 2));
  console.log(`  ${String(min).padStart(3)}-${String(max).padStart(3)} min: ${String(count).padStart(3)} (${pct.padStart(5)}%) ${bar}`);
});

const mediaErro = erros.reduce((a,b)=>a+b,0) / erros.length;
const medianaErro = erros[Math.floor(erros.length/2)];
console.log(`\n  Erro médio: ${mediaErro.toFixed(1)} min | Mediana: ${medianaErro.toFixed(1)} min`);

// === EXEMPLOS ===
exemplos.sort((a, b) => Math.min(parseFloat(a.erroMult), parseFloat(a.erroSoma)) - Math.min(parseFloat(b.erroMult), parseFloat(b.erroSoma)));
console.log(`\n▓ TOP ACERTOS (erro menor):`);
exemplos.slice(0, 6).forEach(e => {
  const melhor = parseFloat(e.erroMult) < parseFloat(e.erroSoma) ? 'MULT' : 'SOMA';
  const val = melhor === 'MULT' ? e.produto : e.soma;
  console.log(`  Branco ${e.branco} → [${e.n2}${e.cor2},${e.n1}${e.cor1}] ${melhor}=${val}min | real=${e.tempoReal}min | erro=${Math.min(parseFloat(e.erroMult),parseFloat(e.erroSoma)).toFixed(1)}min → próx ${e.proximoBranco}`);
});

console.log(`\n▓ PIORES ERROS:`);
exemplos.slice(-5).forEach(e => {
  console.log(`  Branco ${e.branco} → [${e.n2},${e.n1}] MULT=${e.produto}min SOMA=${e.soma}min | real=${e.tempoReal}min | erros: ${e.erroMult}/${e.erroSoma}min`);
});

// === TESTE 3: Apenas quando mesma cor (regra original do áudio) ===
const exemplosMesmaCor = exemplos.filter(e => e.mesmaCor);
console.log(`\n▓ FILTRO "MESMA COR" (só quando ambos são preto ou ambos vermelho):`);
console.log(`  Pares mesma cor: ${exemplosMesmaCor.length}/${totalPares} (${(exemplosMesmaCor.length/totalPares*100).toFixed(0)}%)`);
if (exemplosMesmaCor.length > 0) {
  const errosMC = exemplosMesmaCor.map(e => Math.min(parseFloat(e.erroMult), parseFloat(e.erroSoma)));
  const mediaMC = errosMC.reduce((a,b)=>a+b,0) / errosMC.length;
  const acertos3MC = errosMC.filter(e => e <= 3).length;
  console.log(`  Erro médio: ${mediaMC.toFixed(1)} min | Acertos ±3min: ${acertos3MC}/${errosMC.length} (${(acertos3MC/errosMC.length*100).toFixed(1)}%)`);
}

// === VEREDICTO FINAL ===
console.log(`\n${'═'.repeat(70)}`);
const melhorTaxaMult = Math.max(...TOLERANCIAS.map(t => acertosMultProx[t] / totalPares * 100));
const melhorTaxaSoma = Math.max(...TOLERANCIAS.map(t => acertosSomaProx[t] / totalPares * 100));
const melhorBaseline = Math.max(...TOLERANCIAS.map(t => baselinePorTol[t]));
const melhorTaxa = Math.max(melhorTaxaMult, melhorTaxaSoma);
const lift = melhorTaxa / melhorBaseline;

console.log(`  ╔══════════════════════════════════════════════════════════╗`);
if (lift > 2) {
  console.log(`  ║  VEREDICTO: ✅ PADRÃO FUNCIONA (${lift.toFixed(1)}x melhor que acaso)   ║`);
  console.log(`  ║  Eficácia: ${Math.min(100, Math.round(lift * 25))}%                                        ║`);
} else if (lift > 1.3) {
  console.log(`  ║  VEREDICTO: ⚠️  SINAL FRACO (${lift.toFixed(2)}x vs acaso)              ║`);
  console.log(`  ║  Eficácia: ${Math.round(lift * 20)}%                                          ║`);
} else {
  console.log(`  ║  VEREDICTO: ❌ NÃO FUNCIONA (${lift.toFixed(2)}x = igual ao acaso)    ║`);
  console.log(`  ║  Eficácia: ${Math.round(lift * 10)}% (chute seria ${Math.round(melhorBaseline)}%)                       ║`);
}
console.log(`  ║                                                          ║`);
console.log(`  ║  Melhor taxa real: ${melhorTaxa.toFixed(1)}%                              ║`);
console.log(`  ║  Baseline (acaso): ${melhorBaseline.toFixed(1)}%                              ║`);
console.log(`  ║  Lift: ${lift.toFixed(2)}x                                            ║`);
console.log(`  ╚══════════════════════════════════════════════════════════╝`);
console.log(`${'═'.repeat(70)}\n`);
