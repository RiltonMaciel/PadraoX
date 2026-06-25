const XLSX = require('xlsx');
const wb = XLSX.readFile('./exports/blaze-double-2000-2026-06-03T22-46-39.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Dados estão do mais recente pro mais antigo (idx 0 = mais recente)
// Últimas 4h: considerando que o mais recente é ~19:46 e queremos até ~15:46
// Vamos filtrar por horário

console.log('=== ANÁLISE PADRÃO X (TEMPO) ===');
console.log('Total linhas:', data.length);
console.log('Mais recente:', data[0].Horario, '| Mais antigo:', data[data.length-1].Horario);

// Encontrar brancos
const brancos = [];
for (let i = 0; i < data.length; i++) {
  if (data[i].Cor === 'Branco' || data[i].Numero === 0) {
    brancos.push({ ...data[i], idx: i });
  }
}

console.log('\nTotal brancos encontrados:', brancos.length);
console.log('\n============================');
console.log('BRANCOS COM VIZINHOS (2 mesma cor):');
console.log('============================\n');

// NOTA: dados ordenados do MAIS RECENTE (idx=0) ao MAIS ANTIGO (idx=1999)
// Então idx+1 = mais antigo (anterior no tempo), idx-1 = mais recente (posterior no tempo)
// brancos[0] = mais recente, brancos[N] = mais antigo
// "Próximo branco no futuro" de brancos[bi] = brancos[bi-1] (menor índice = mais recente)

const fmtH = (min) => {
  min = ((min % 1440) + 1440) % 1440; // normalizar 0-1439
  return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
};

const toMin = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

let acertosMult = 0, acertosSoma = 0, totalTestes = 0;
const tolerancia = 5; // minutos de tolerância

// Iterar do mais ANTIGO pro mais RECENTE (para prever futuro)
for (let bi = brancos.length - 1; bi >= 1; bi--) {
  const b = brancos[bi];
  const hora = b.Horario;
  const minB = toMin(hora);
  
  // Vizinhos na sequência do jogo (idx+1 = anterior, idx-1 = posterior)
  const vizinhos = [];
  for (let offset = -3; offset <= 3; offset++) {
    if (offset === 0) continue;
    const idx = b.idx + offset;
    if (idx >= 0 && idx < data.length && data[idx].Cor !== 'Branco') {
      vizinhos.push({ ...data[idx], offset, idx });
    }
  }
  
  const pretas = vizinhos.filter(v => v.Cor === 'Preto');
  const vermelhas = vizinhos.filter(v => v.Cor === 'Vermelho');
  
  // Pegar as 2 mais próximas de cada cor
  const pretasProx = pretas.sort((a,b) => Math.abs(a.offset) - Math.abs(b.offset)).slice(0, 2);
  const vermelhasProx = vermelhas.sort((a,b) => Math.abs(a.offset) - Math.abs(b.offset)).slice(0, 2);
  
  // Próximo branco REAL (no futuro = menor índice no array)
  const proxBranco = brancos[bi - 1];
  const minProx = toMin(proxBranco.Horario);
  // Se horário cruzou meia-noite
  const diffReal = minProx >= minB ? minProx - minB : (minProx + 1440) - minB;
  
  let acertouAlgo = false;
  const resultados = [];
  
  // Testar PRETAS
  if (pretasProx.length >= 2) {
    const n1 = pretasProx[0].Numero;
    const n2 = pretasProx[1].Numero;
    const mult = n1 * n2;
    const soma = n1 + n2;
    const erroMult = Math.abs(diffReal - mult);
    const erroSoma = Math.abs(diffReal - soma);
    
    if (erroMult <= tolerancia) { acertosMult++; acertouAlgo = true; }
    if (erroSoma <= tolerancia) { acertosSoma++; acertouAlgo = true; }
    
    resultados.push({
      cor: 'PRETAS', n1, n2, mult, soma, erroMult, erroSoma
    });
  }
  
  // Testar VERMELHAS
  if (vermelhasProx.length >= 2) {
    const n1 = vermelhasProx[0].Numero;
    const n2 = vermelhasProx[1].Numero;
    const mult = n1 * n2;
    const soma = n1 + n2;
    const erroMult = Math.abs(diffReal - mult);
    const erroSoma = Math.abs(diffReal - soma);
    
    if (erroMult <= tolerancia) { acertosMult++; acertouAlgo = true; }
    if (erroSoma <= tolerancia) { acertosSoma++; acertouAlgo = true; }
    
    resultados.push({
      cor: 'VERMELHAS', n1, n2, mult, soma, erroMult, erroSoma
    });
  }
  
  totalTestes++;
  
  // Mostrar apenas os que ACERTARAM ou os últimos 10
  if (acertouAlgo || bi <= 10) {
    console.log(`\n${acertouAlgo ? '✅' : '❌'} BRANCO às ${hora} → Próx branco REAL: ${proxBranco.Horario} (diff=${diffReal}min)`);
    
    const vizStr = [];
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) { vizStr.push(`[B${hora}]`); continue; }
      const idx = b.idx + offset;
      if (idx >= 0 && idx < data.length) {
        const r = data[idx];
        const c = r.Cor === 'Preto' ? 'P' : r.Cor === 'Vermelho' ? 'V' : 'B';
        vizStr.push(`${r.Numero}${c}`);
      }
    }
    console.log('  Seq: ' + vizStr.join(' | '));
    
    resultados.forEach(r => {
      console.log(`  ${r.cor}: ${r.n1}×${r.n2}=${r.mult}min(err${r.erroMult}) | ${r.n1}+${r.n2}=${r.soma}min(err${r.erroSoma})`);
      if (r.erroMult <= tolerancia) console.log(`    ✅ MULT acertou! ${hora}+${r.mult}min=${fmtH(minB+r.mult)} (real ${proxBranco.Horario})`);
      if (r.erroSoma <= tolerancia) console.log(`    ✅ SOMA acertou! ${hora}+${r.soma}min=${fmtH(minB+r.soma)} (real ${proxBranco.Horario})`);
    });
  }
}

// Contagem combinada
let acertouPeloMenosUm = 0;
let somaVermelha = 0, multVermelha = 0, somaPreta = 0, multPreta = 0;
let erros = [];

for (let bi = brancos.length - 1; bi >= 1; bi--) {
  const b = brancos[bi];
  const hora = b.Horario;
  const minB = toMin(hora);
  
  const vizinhos2 = [];
  for (let offset = -3; offset <= 3; offset++) {
    if (offset === 0) continue;
    const idx = b.idx + offset;
    if (idx >= 0 && idx < data.length && data[idx].Cor !== 'Branco') {
      vizinhos2.push({ ...data[idx], offset, idx });
    }
  }
  
  const pretas2 = vizinhos2.filter(v => v.Cor === 'Preto').sort((a,b) => Math.abs(a.offset) - Math.abs(b.offset)).slice(0, 2);
  const vermelhas2 = vizinhos2.filter(v => v.Cor === 'Vermelho').sort((a,b) => Math.abs(a.offset) - Math.abs(b.offset)).slice(0, 2);
  
  const proxBranco2 = brancos[bi - 1];
  const minProx2 = toMin(proxBranco2.Horario);
  const diffReal2 = minProx2 >= minB ? minProx2 - minB : (minProx2 + 1440) - minB;
  
  let acertou = false;
  
  if (pretas2.length >= 2) {
    const mult = pretas2[0].Numero * pretas2[1].Numero;
    const soma = pretas2[0].Numero + pretas2[1].Numero;
    if (Math.abs(diffReal2 - mult) <= tolerancia) { multPreta++; acertou = true; }
    if (Math.abs(diffReal2 - soma) <= tolerancia) { somaPreta++; acertou = true; }
  }
  if (vermelhas2.length >= 2) {
    const mult = vermelhas2[0].Numero * vermelhas2[1].Numero;
    const soma = vermelhas2[0].Numero + vermelhas2[1].Numero;
    if (Math.abs(diffReal2 - mult) <= tolerancia) { multVermelha++; acertou = true; }
    if (Math.abs(diffReal2 - soma) <= tolerancia) { somaVermelha++; acertou = true; }
  }
  
  if (acertou) acertouPeloMenosUm++;
  else erros.push({ hora, proxReal: proxBranco2.Horario, diff: diffReal2 });
}

console.log('\n\n═══════════════════════════════════════════');
console.log('         RESUMO FINAL DA VALIDAÇÃO');
console.log('═══════════════════════════════════════════');
console.log(`Total de brancos analisados: ${totalTestes}`);
console.log(`Tolerância: ±${tolerancia} minutos`);
console.log('');
console.log(`✅ Acertou PELO MENOS 1 método: ${acertouPeloMenosUm}/${totalTestes} = ${(acertouPeloMenosUm/totalTestes*100).toFixed(1)}%`);
console.log(`❌ Não acertou nenhum: ${totalTestes - acertouPeloMenosUm}/${totalTestes} = ${((totalTestes-acertouPeloMenosUm)/totalTestes*100).toFixed(1)}%`);
console.log('');
console.log('--- Detalhamento por método ---');
console.log(`SOMA VERMELHAS: ${somaVermelha} acertos (${(somaVermelha/totalTestes*100).toFixed(1)}%)`);
console.log(`MULT VERMELHAS: ${multVermelha} acertos (${(multVermelha/totalTestes*100).toFixed(1)}%)`);
console.log(`SOMA PRETAS:    ${somaPreta} acertos (${(somaPreta/totalTestes*100).toFixed(1)}%)`);
console.log(`MULT PRETAS:    ${multPreta} acertos (${(multPreta/totalTestes*100).toFixed(1)}%)`);
console.log('');
console.log('--- Brancos que FALHARAM ---');
erros.forEach(e => console.log(`  ${e.hora} → próx real ${e.proxReal} (diff=${e.diff}min)`));
