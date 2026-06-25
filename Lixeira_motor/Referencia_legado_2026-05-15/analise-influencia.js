const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor] = l.split(',');
  return { num: parseInt(num), cor };
}).filter(r => !isNaN(r.num));

// Reverter para ordem cronológica (index 0 = mais antigo)
rows.reverse();

const total = rows.length;
const corLetra = (n) => n === 0 ? 'B' : [1,2,3,4,5,6,7].includes(n) ? 'V' : 'P';

console.log('='.repeat(65));
console.log('  ANALISE DE INFLUENCIA: CADA NUMERO E AS PROXIMAS 4 CASAS');
console.log('='.repeat(65) + '\n');

const influencia = {};

for (let num = 0; num <= 14; num++) {
  influencia[num] = {
    ocorrencias: 0,
    corProx4: [{ V: 0, P: 0, B: 0 }, { V: 0, P: 0, B: 0 }, { V: 0, P: 0, B: 0 }, { V: 0, P: 0, B: 0 }],
    dominanciaPreto: 0,
    dominanciaVerm: 0,
    equilibrio: 0,
    repetiuAlgum: 0,
    trouxeBranco: 0,
    sequenciaMesmaCor: 0,
    numMaisFreqPos: [{}, {}, {}, {}],
    totalPretos4: 0,
    totalVerm4: 0,
    totalBrancos4: 0,
  };
}

for (let i = 0; i < rows.length - 4; i++) {
  const num = rows[i].num;
  influencia[num].ocorrencias++;

  let pretos = 0, vermelhos = 0, brancos = 0;
  const nums4 = [];

  for (let j = 1; j <= 4; j++) {
    const prox = rows[i + j];
    nums4.push(prox.num);

    const c = corLetra(prox.num);
    influencia[num].corProx4[j - 1][c]++;

    if (c === 'P') pretos++;
    else if (c === 'V') vermelhos++;
    else brancos++;

    influencia[num].numMaisFreqPos[j - 1][prox.num] = (influencia[num].numMaisFreqPos[j - 1][prox.num] || 0) + 1;
  }

  influencia[num].totalPretos4 += pretos;
  influencia[num].totalVerm4 += vermelhos;
  influencia[num].totalBrancos4 += brancos;

  if (pretos > vermelhos) influencia[num].dominanciaPreto++;
  else if (vermelhos > pretos) influencia[num].dominanciaVerm++;
  else influencia[num].equilibrio++;

  if (brancos > 0) influencia[num].trouxeBranco++;

  const unicos = new Set(nums4);
  if (unicos.size < 4) influencia[num].repetiuAlgum++;

  let maxSeq = 1, seqAtual = 1;
  for (let k = 1; k < 4; k++) {
    if (corLetra(nums4[k]) === corLetra(nums4[k - 1]) && corLetra(nums4[k]) !== 'B') {
      seqAtual++;
      maxSeq = Math.max(maxSeq, seqAtual);
    } else {
      seqAtual = 1;
    }
  }
  if (maxSeq >= 3) influencia[num].sequenciaMesmaCor++;
}

// RELATÓRIO POR NÚMERO
for (let num = 0; num <= 14; num++) {
  const inf = influencia[num];
  if (inf.ocorrencias === 0) continue;
  const corNome = num === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(num) ? 'VERMELHO' : 'PRETO';

  console.log(`\n--- NUMERO ${num} (${corNome}) --- ${inf.ocorrencias} ocorrencias ---`);
  console.log(`  Preto dominou 4 casas:    ${((inf.dominanciaPreto / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Vermelho dominou 4 casas: ${((inf.dominanciaVerm / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Equilibrio:               ${((inf.equilibrio / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Trouxe branco nas 4:      ${((inf.trouxeBranco / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Seq 3+ mesma cor:         ${((inf.sequenciaMesmaCor / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Repetiu numero nas 4:     ${((inf.repetiuAlgum / inf.ocorrencias) * 100).toFixed(1)}%`);
  console.log(`  Media pretos por ciclo:   ${(inf.totalPretos4 / inf.ocorrencias).toFixed(2)} de 4`);
  console.log(`  Media vermelhos por ciclo: ${(inf.totalVerm4 / inf.ocorrencias).toFixed(2)} de 4`);

  console.log(`  Numero mais provavel por posicao:`);
  for (let p = 0; p < 4; p++) {
    const sorted = Object.entries(inf.numMaisFreqPos[p]).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3).map(([n, v]) => `${n}(${((v / inf.ocorrencias) * 100).toFixed(0)}%)`).join(', ');
    console.log(`    +${p + 1}: ${top3}`);
  }
}

// COMPARAÇÃO COM O 4
console.log('\n\n' + '='.repeat(65));
console.log('  NUMEROS COM COMPORTAMENTO SIMILAR AO 4');
console.log('='.repeat(65) + '\n');

const ref = influencia[4];
const refMetricas = {
  pp: ref.dominanciaPreto / ref.ocorrencias,
  vp: ref.dominanciaVerm / ref.ocorrencias,
  bp: ref.trouxeBranco / ref.ocorrencias,
  sp: ref.sequenciaMesmaCor / ref.ocorrencias,
  mp: ref.totalPretos4 / (ref.ocorrencias * 4),
  mv: ref.totalVerm4 / (ref.ocorrencias * 4),
};

console.log(`Perfil do 4:`);
console.log(`  Preto domina=${(refMetricas.pp*100).toFixed(1)}% | Verm domina=${(refMetricas.vp*100).toFixed(1)}% | Trouxe branco=${(refMetricas.bp*100).toFixed(1)}% | Seq3+=${(refMetricas.sp*100).toFixed(1)}% | %Preto nas 4=${(refMetricas.mp*100).toFixed(1)}% | %Verm nas 4=${(refMetricas.mv*100).toFixed(1)}%`);
console.log('');

const similaridade = [];
for (let num = 0; num <= 14; num++) {
  if (num === 4) continue;
  const inf = influencia[num];
  if (inf.ocorrencias < 10) continue;
  const m = {
    pp: inf.dominanciaPreto / inf.ocorrencias,
    vp: inf.dominanciaVerm / inf.ocorrencias,
    bp: inf.trouxeBranco / inf.ocorrencias,
    sp: inf.sequenciaMesmaCor / inf.ocorrencias,
    mp: inf.totalPretos4 / (inf.ocorrencias * 4),
    mv: inf.totalVerm4 / (inf.ocorrencias * 4),
  };

  const dist = Math.sqrt(
    (m.pp - refMetricas.pp) ** 2 +
    (m.vp - refMetricas.vp) ** 2 +
    (m.bp - refMetricas.bp) ** 2 +
    (m.sp - refMetricas.sp) ** 2 +
    (m.mp - refMetricas.mp) ** 2 +
    (m.mv - refMetricas.mv) ** 2
  );
  similaridade.push({ num, dist, ...m });
}

similaridade.sort((a, b) => a.dist - b.dist);
console.log('Ranking (menor distancia = mais parecido com o 4):\n');
similaridade.forEach((s, i) => {
  const corNome = s.num === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(s.num) ? 'VERM' : 'PRETO';
  const tag = s.dist < 0.08 ? ' <<<< MUITO SIMILAR!' : s.dist < 0.12 ? ' << Similar' : '';
  console.log(`  ${i + 1}. Num ${s.num} (${corNome}) Dist=${s.dist.toFixed(4)} | Preto=${(s.pp*100).toFixed(1)}% Verm=${(s.vp*100).toFixed(1)}% Branco=${(s.bp*100).toFixed(1)}% Seq=${(s.sp*100).toFixed(1)}% %P=${(s.mp*100).toFixed(1)}% %V=${(s.mv*100).toFixed(1)}%${tag}`);
});

// ANÁLISE EXTRA: números que mais "seguram" uma cor nas 4 casas
console.log('\n\n' + '='.repeat(65));
console.log('  NUMEROS QUE MAIS "SEGURAM" PRETO NAS 4 CASAS');
console.log('='.repeat(65) + '\n');

const rankPreto = [];
for (let num = 0; num <= 14; num++) {
  const inf = influencia[num];
  if (inf.ocorrencias < 10) continue;
  rankPreto.push({ num, pct: (inf.dominanciaPreto / inf.ocorrencias * 100) });
}
rankPreto.sort((a, b) => b.pct - a.pct);
rankPreto.forEach((r, i) => {
  const corNome = r.num === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(r.num) ? 'VERM' : 'PRETO';
  console.log(`  ${i + 1}. Num ${r.num} (${corNome}): ${r.pct.toFixed(1)}% das vezes preto dominou as 4 casas`);
});

console.log('\n' + '='.repeat(65));
console.log('  NUMEROS QUE MAIS "SEGURAM" VERMELHO NAS 4 CASAS');
console.log('='.repeat(65) + '\n');

const rankVerm = [];
for (let num = 0; num <= 14; num++) {
  const inf = influencia[num];
  if (inf.ocorrencias < 10) continue;
  rankVerm.push({ num, pct: (inf.dominanciaVerm / inf.ocorrencias * 100) });
}
rankVerm.sort((a, b) => b.pct - a.pct);
rankVerm.forEach((r, i) => {
  const corNome = r.num === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(r.num) ? 'VERM' : 'PRETO';
  console.log(`  ${i + 1}. Num ${r.num} (${corNome}): ${r.pct.toFixed(1)}% das vezes vermelho dominou as 4 casas`);
});

console.log('\n' + '='.repeat(65));
console.log('  NUMEROS QUE MAIS TRAZEM BRANCO NAS 4 CASAS');
console.log('='.repeat(65) + '\n');

const rankBranco = [];
for (let num = 0; num <= 14; num++) {
  const inf = influencia[num];
  if (inf.ocorrencias < 10) continue;
  rankBranco.push({ num, pct: (inf.trouxeBranco / inf.ocorrencias * 100) });
}
rankBranco.sort((a, b) => b.pct - a.pct);
rankBranco.forEach((r, i) => {
  const corNome = r.num === 0 ? 'BRANCO' : [1,2,3,4,5,6,7].includes(r.num) ? 'VERM' : 'PRETO';
  console.log(`  ${i + 1}. Num ${r.num} (${corNome}): ${r.pct.toFixed(1)}% das vezes trouxe branco em 4 casas`);
});
