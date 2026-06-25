const XLSX = require('xlsx');
const wb = XLSX.readFile('./exports/blaze-double-2000-2026-06-04T01-16-22.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Dados: idx 0 = mais recente, idx N = mais antigo
// idx+1 = anterior no tempo, idx-1 = posterior no tempo

const toMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const fmtH = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
};

console.log('=== ANÁLISE PADRÃO X — BRANCO DUPLO ===');
console.log(`Total linhas: ${data.length}`);
console.log(`Período: ${data[data.length-1].Horario} até ${data[0].Horario}\n`);

// 1. Encontrar TODOS os brancos duplos (2 consecutivos)
// Como idx 0 = mais recente, dois brancos consecutivos = data[i] e data[i+1] ambos Branco
// Mas no tempo: data[i+1] veio ANTES de data[i]
const duplos = [];
for (let i = 0; i < data.length - 1; i++) {
  if (data[i].Cor === 'Branco' && data[i + 1].Cor === 'Branco') {
    // data[i+1] = primeiro branco (mais antigo), data[i] = segundo branco (mais recente)
    // Evitar contar triplos como dois duplos separados
    const jaContado = duplos.length > 0 && duplos[duplos.length - 1].idx1 === i;
    if (!jaContado) {
      duplos.push({
        idx1: i,      // segundo branco (mais recente)
        idx2: i + 1,  // primeiro branco (mais antigo)
        hora1: data[i].Horario,     // hora do segundo (mais recente)
        hora2: data[i + 1].Horario  // hora do primeiro (mais antigo)
      });
    }
  }
}

console.log(`BRANCOS DUPLOS encontrados: ${duplos.length}`);
console.log('========================================\n');

// 2. Para cada duplo, encontrar vizinhos da mesma cor e calcular previsão
// O "próximo branco" no futuro = procurar em idx MENOR (mais recente) que o duplo
// Vizinhos para cálculo: números ao redor do duplo (antes e depois)

const tolerancia = 5;
let acertos = 0;
let totalTestados = 0;

duplos.forEach((d, di) => {
  // O duplo ocupa idx1 e idx2
  // Vizinhos ANTES do duplo (mais antigos, idx > idx2): data[idx2+1], data[idx2+2], data[idx2+3]
  // Vizinhos DEPOIS do duplo (mais recentes, idx < idx1): data[idx1-1], data[idx1-2], data[idx1-3]
  
  const vizinhos = [];
  // Anteriores ao duplo (vieram antes no tempo)
  for (let k = 1; k <= 4; k++) {
    const idx = d.idx2 + k;
    if (idx < data.length && data[idx].Cor !== 'Branco') {
      vizinhos.push({ ...data[idx], posicao: 'antes', dist: k });
    }
  }
  // Posteriores ao duplo (vieram depois no tempo)
  for (let k = 1; k <= 4; k++) {
    const idx = d.idx1 - k;
    if (idx >= 0 && data[idx].Cor !== 'Branco') {
      vizinhos.push({ ...data[idx], posicao: 'depois', dist: k });
    }
  }

  const vermelhas = vizinhos.filter(v => v.Cor === 'Vermelho').sort((a, b) => a.dist - b.dist);
  const pretas = vizinhos.filter(v => v.Cor === 'Preto').sort((a, b) => a.dist - b.dist);

  // Horário do duplo (usar o mais recente - hora1)
  const minDuplo = toMin(d.hora1);

  // Próximo branco no futuro (idx menor que idx1, pulando o próprio duplo)
  let proxBranco = null;
  for (let k = d.idx1 - 1; k >= 0; k--) {
    if (data[k].Cor === 'Branco') {
      proxBranco = { ...data[k], idx: k };
      break;
    }
  }

  if (!proxBranco) return; // sem próximo branco para comparar

  const minProx = toMin(proxBranco.Horario);
  const diffReal = minProx >= minDuplo ? minProx - minDuplo : (minProx + 1440) - minDuplo;

  totalTestados++;

  console.log(`═══ DUPLO #${di + 1} ═══`);
  console.log(`  Horário: ${d.hora2} / ${d.hora1} (idx ${d.idx2}/${d.idx1})`);
  
  // Mostrar contexto
  const ctx = [];
  for (let k = d.idx2 + 3; k >= d.idx1 - 3; k--) {
    if (k >= 0 && k < data.length) {
      const r = data[k];
      const c = r.Cor === 'Preto' ? 'P' : r.Cor === 'Vermelho' ? 'V' : 'B';
      const marker = (k === d.idx1 || k === d.idx2) ? `[${r.Numero}${c}]` : `${r.Numero}${c}`;
      ctx.push(marker);
    }
  }
  console.log(`  Contexto: ${ctx.join(' ')}`);
  console.log(`  Próx branco REAL: ${proxBranco.Horario} (em ${diffReal} min)`);

  let acertouAlgo = false;

  // Testar VERMELHAS (2 mais próximas)
  if (vermelhas.length >= 2) {
    const v1 = vermelhas[0], v2 = vermelhas[1];
    const soma = v1.Numero + v2.Numero;
    const mult = v1.Numero * v2.Numero;
    const erroSoma = Math.abs(diffReal - soma);
    const erroMult = Math.abs(diffReal - mult);

    console.log(`  VERMELHAS: ${v1.Numero}(${v1.posicao}) e ${v2.Numero}(${v2.posicao})`);
    console.log(`    Soma: ${v1.Numero}+${v2.Numero}=${soma}min → prev ${fmtH(minDuplo + soma)} | erro: ${erroSoma}min`);
    console.log(`    Mult: ${v1.Numero}×${v2.Numero}=${mult}min → prev ${fmtH(minDuplo + mult)} | erro: ${erroMult}min`);
    
    if (erroSoma <= tolerancia) { console.log(`    ✅ SOMA ACERTOU!`); acertouAlgo = true; }
    if (erroMult <= tolerancia) { console.log(`    ✅ MULT ACERTOU!`); acertouAlgo = true; }
  }

  // Testar PRETAS (2 mais próximas)
  if (pretas.length >= 2) {
    const p1 = pretas[0], p2 = pretas[1];
    const soma = p1.Numero + p2.Numero;
    const mult = p1.Numero * p2.Numero;
    const erroSoma = Math.abs(diffReal - soma);
    const erroMult = Math.abs(diffReal - mult);

    console.log(`  PRETAS: ${p1.Numero}(${p1.posicao}) e ${p2.Numero}(${p2.posicao})`);
    console.log(`    Soma: ${p1.Numero}+${p2.Numero}=${soma}min → prev ${fmtH(minDuplo + soma)} | erro: ${erroSoma}min`);
    console.log(`    Mult: ${p1.Numero}×${p2.Numero}=${mult}min → prev ${fmtH(minDuplo + mult)} | erro: ${erroMult}min`);
    
    if (erroSoma <= tolerancia) { console.log(`    ✅ SOMA ACERTOU!`); acertouAlgo = true; }
    if (erroMult <= tolerancia) { console.log(`    ✅ MULT ACERTOU!`); acertouAlgo = true; }
  }

  // Testar TODAS as combinações possíveis (qualquer par de mesma cor)
  let melhorErro = Infinity;
  let melhorMetodo = '';
  
  // Todas as combinações de vermelhas
  for (let a = 0; a < vermelhas.length; a++) {
    for (let b = a + 1; b < vermelhas.length; b++) {
      const soma = vermelhas[a].Numero + vermelhas[b].Numero;
      const mult = vermelhas[a].Numero * vermelhas[b].Numero;
      if (Math.abs(diffReal - soma) < melhorErro) {
        melhorErro = Math.abs(diffReal - soma);
        melhorMetodo = `V${vermelhas[a].Numero}+V${vermelhas[b].Numero}=${soma}`;
      }
      if (Math.abs(diffReal - mult) < melhorErro) {
        melhorErro = Math.abs(diffReal - mult);
        melhorMetodo = `V${vermelhas[a].Numero}×V${vermelhas[b].Numero}=${mult}`;
      }
    }
  }
  // Todas as combinações de pretas
  for (let a = 0; a < pretas.length; a++) {
    for (let b = a + 1; b < pretas.length; b++) {
      const soma = pretas[a].Numero + pretas[b].Numero;
      const mult = pretas[a].Numero * pretas[b].Numero;
      if (Math.abs(diffReal - soma) < melhorErro) {
        melhorErro = Math.abs(diffReal - soma);
        melhorMetodo = `P${pretas[a].Numero}+P${pretas[b].Numero}=${soma}`;
      }
      if (Math.abs(diffReal - mult) < melhorErro) {
        melhorErro = Math.abs(diffReal - mult);
        melhorMetodo = `P${pretas[a].Numero}×P${pretas[b].Numero}=${mult}`;
      }
    }
  }

  if (melhorErro <= tolerancia) acertouAlgo = true;
  
  console.log(`  🎯 MELHOR match: ${melhorMetodo} (erro ${melhorErro}min)`);
  console.log(`  ${acertouAlgo ? '✅ ACERTOU' : '❌ FALHOU'}`);
  console.log('');

  if (acertouAlgo) acertos++;
});

console.log('\n╔══════════════════════════════════════════╗');
console.log('║     CURADORIA — RESUMO FINAL            ║');
console.log('╠══════════════════════════════════════════╣');
console.log(`║ Brancos duplos no histórico: ${duplos.length.toString().padEnd(12)}║`);
console.log(`║ Testados (com próx branco): ${totalTestados.toString().padEnd(13)}║`);
console.log(`║ Acertos (±${tolerancia}min):            ${acertos}/${totalTestados} = ${(acertos/totalTestados*100).toFixed(1)}%  ║`);
console.log(`║ Falhas:                      ${(totalTestados-acertos)}/${totalTestados} = ${((totalTestados-acertos)/totalTestados*100).toFixed(1)}%  ║`);
console.log('╚══════════════════════════════════════════╝');
console.log(`\nObs: Tolerância = ±${tolerancia} minutos`);
console.log('Métodos testados: SOMA e MULTIPLICAÇÃO de 2 números da mesma cor vizinhos ao duplo');
