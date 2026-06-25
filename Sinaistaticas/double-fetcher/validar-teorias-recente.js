const XLSX = require('xlsx');
const wb = XLSX.readFile('./exports/blaze-double-200-2026-06-05T15-00-31.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// data[0] = mais recente, data[N] = mais antigo
// data[i+1] = veio ANTES no tempo de data[i]

const toMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

console.log('=== VALIDAÇÃO DAS TEORIAS — DADOS 05/06/2026 ===');
console.log(`Total linhas: ${data.length}`);
console.log(`Período: ${data[data.length-1].Horario} até ${data[0].Horario}\n`);

// Encontrar todos os brancos
const brancos = [];
for (let i = 0; i < data.length; i++) {
  if (data[i].Cor === 'Branco') brancos.push(i);
}
console.log(`Total brancos: ${brancos.length}\n`);

// Para cada branco, testar as teorias
// Lembrar: idx+1 = antes no tempo, idx-1 = depois no tempo
let t1Acertos = 0, t1Total = 0;
let t2Acertos = 0, t2Total = 0;
let t3Acertos = 0, t3Total = 0;
let crossAcertos = 0, crossTotal = 0; // H1: V+P cruzado

const resultados = [];

for (let bi = 0; bi < brancos.length; bi++) {
  const bIdx = brancos[bi];
  const bHora = data[bIdx].Horario;
  if (!bHora || bHora === '--:--') continue;
  const bMin = toMin(bHora);

  // Próximo branco (no futuro = idx menor)
  let proxBrancoIdx = -1;
  for (let k = bIdx - 1; k >= 0; k--) {
    if (data[k].Cor === 'Branco') { proxBrancoIdx = k; break; }
  }
  if (proxBrancoIdx < 0) continue; // sem próximo branco
  
  const proxHora = data[proxBrancoIdx].Horario;
  if (!proxHora || proxHora === '--:--') continue;
  const proxMin = toMin(proxHora);
  const realMin = proxMin >= bMin ? proxMin - bMin : (proxMin + 1440) - bMin;
  if (realMin > 60) continue; // ignorar gaps > 60min (provavelmente virada de dia)

  // Vizinhos (antes no tempo = idx maior)
  const vizAntes = [];
  for (let k = bIdx + 1; k < Math.min(data.length, bIdx + 7) && vizAntes.length < 4; k++) {
    if (data[k].Cor !== 'Branco') vizAntes.push({ num: data[k].Numero, cor: data[k].Cor });
  }
  // Vizinhos depois no tempo = idx menor
  const vizDepois = [];
  for (let k = bIdx - 1; k >= Math.max(0, bIdx - 6) && vizDepois.length < 4; k--) {
    if (data[k].Cor !== 'Branco') vizDepois.push({ num: data[k].Numero, cor: data[k].Cor });
  }

  const todosViz = [...vizAntes, ...vizDepois];
  const vermelhos = todosViz.filter(v => v.cor === 'Vermelho');
  const pretos = todosViz.filter(v => v.cor === 'Preto');

  // 2 números antes (no tempo = idx maior)
  const doisAntes = [];
  for (let k = bIdx + 1; k < data.length && doisAntes.length < 2; k++) {
    if (data[k].Cor !== 'Branco') doisAntes.push(data[k].Numero);
  }

  const resultado = { hora: bHora, realMin, proxHora, teorias: [] };

  // TEORIA 1: Soma dos 2 vermelhos mais próximos
  if (vermelhos.length >= 2) {
    const soma = vermelhos[0].num + vermelhos[1].num;
    const acertou = Math.abs(realMin - soma) <= 5;
    t1Total++;
    if (acertou) t1Acertos++;
    resultado.teorias.push({ nome: 'T1_SOMA', prev: soma, acertou });
  }

  // TEORIA 2: |N1 - N2| dos 2 antes
  if (doisAntes.length >= 2) {
    const diff = Math.abs(doisAntes[0] - doisAntes[1]);
    if (diff > 0) {
      const acertou = Math.abs(realMin - diff) <= 5;
      t2Total++;
      if (acertou) t2Acertos++;
      resultado.teorias.push({ nome: 'T2_DIFF', prev: diff, acertou });
    }
  }

  // TEORIA 3: Soma dos 2 pretos mais próximos
  if (pretos.length >= 2) {
    const soma = pretos[0].num + pretos[1].num;
    const acertou = Math.abs(realMin - soma) <= 5;
    t3Total++;
    if (acertou) t3Acertos++;
    resultado.teorias.push({ nome: 'T3_PRETOS', prev: soma, acertou });
  }

  // HIPÓTESE NOVA H1: V1 + P1 (cruzado)
  if (vermelhos.length >= 1 && pretos.length >= 1) {
    const cross = vermelhos[0].num + pretos[0].num;
    const acertou = Math.abs(realMin - cross) <= 5;
    crossTotal++;
    if (acertou) crossAcertos++;
    resultado.teorias.push({ nome: 'H1_CROSS', prev: cross, acertou });
  }

  resultados.push(resultado);
}

// Resumo
console.log('══════════════════════════════════════════');
console.log('        RESULTADOS (±5min tolerância)');
console.log('══════════════════════════════════════════');
console.log(`T1 (soma vermelhos):  ${t1Acertos}/${t1Total} = ${t1Total > 0 ? ((t1Acertos/t1Total)*100).toFixed(1) : 0}%`);
console.log(`T2 (diff 2 antes):    ${t2Acertos}/${t2Total} = ${t2Total > 0 ? ((t2Acertos/t2Total)*100).toFixed(1) : 0}%`);
console.log(`T3 (soma pretos):     ${t3Acertos}/${t3Total} = ${t3Total > 0 ? ((t3Acertos/t3Total)*100).toFixed(1) : 0}%`);
console.log(`H1 (V+P cruzado):     ${crossAcertos}/${crossTotal} = ${crossTotal > 0 ? ((crossAcertos/crossTotal)*100).toFixed(1) : 0}%`);
console.log('');

// Pelo menos uma acertou?
let algumaAcertou = 0;
for (const r of resultados) {
  if (r.teorias.some(t => t.acertou)) algumaAcertou++;
}
console.log(`Pelo menos 1 teoria acertou: ${algumaAcertou}/${resultados.length} = ${resultados.length > 0 ? ((algumaAcertou/resultados.length)*100).toFixed(1) : 0}%`);

// Mostrar detalhes dos primeiros 15
console.log('\n══════════════════════════════════════════');
console.log('        DETALHES (15 primeiros)');
console.log('══════════════════════════════════════════');
resultados.slice(0, 15).forEach(r => {
  const status = r.teorias.some(t => t.acertou) ? '✅' : '❌';
  const detalhes = r.teorias.map(t => `${t.nome}=${t.prev}min${t.acertou ? '✓' : ''}`).join(' | ');
  console.log(`${status} Branco ${r.hora} → próximo ${r.proxHora} (real=${r.realMin}min) | ${detalhes}`);
});
