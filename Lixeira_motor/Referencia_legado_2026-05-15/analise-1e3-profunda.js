const fs = require('fs');
const data = fs.readFileSync('tipminer-dados-blaze-double.csv', 'utf-8').split('\n').filter(l => l.trim());
const rows = data.slice(2).map(l => {
  const [num, cor, dt, hr] = l.split(',');
  const [h, m, s] = (hr || '').split(':').map(Number);
  return { num: parseInt(num), cor, h, m, s, ts: h * 3600 + m * 60 + s };
}).filter(r => !isNaN(r.num) && !isNaN(r.ts));
rows.reverse();
const T = rows.length;
const p = (v, t) => t > 0 ? (v / t * 100).toFixed(1) : '0';

function brancoEm(i, casas) {
  for (let j = 1; j <= casas && i + j < T; j++) if (rows[i + j].num === 0) return j;
  return 0;
}

for (const ALVO of [1, 3]) {
  console.log('\n' + '='.repeat(70));
  console.log('  INVESTIGACAO PROFUNDA: NUMERO ' + ALVO);
  console.log('='.repeat(70) + '\n');

  const totalAlvo = rows.filter(r => r.num === ALVO).length;

  // TESTE 1: Controlador?
  console.log('>> TESTE 1: Age como controlador? (traz branco em 1-6 casas)');
  const bPorDist = {};
  for (let i = 0; i < T; i++) {
    if (rows[i].num === ALVO) {
      const d = brancoEm(i, 6);
      if (d > 0) bPorDist[d] = (bPorDist[d] || 0) + 1;
    }
  }
  const bTotal6 = Object.values(bPorDist).reduce((a, b) => a + b, 0);
  console.log('  Branco em <=6 casas apos '+ALVO+': ' + bTotal6 + '/' + totalAlvo + ' (' + p(bTotal6, totalAlvo) + '%)');
  for (let d = 1; d <= 6; d++) console.log('    +' + d + ': ' + (bPorDist[d] || 0) + ' (' + p(bPorDist[d] || 0, totalAlvo) + '%)');

  // TESTE 2: Bloqueador?
  console.log('\n>> TESTE 2: Bloqueia o branco?');
  let sem20 = 0;
  for (let i = 0; i < T; i++) {
    if (rows[i].num === ALVO) {
      let temB = false;
      for (let j = 1; j <= 20 && i + j < T; j++) if (rows[i + j].num === 0) { temB = true; break; }
      if (!temB) sem20++;
    }
  }
  console.log('  Sem branco em 20 casas apos '+ALVO+': ' + sem20 + '/' + totalAlvo + ' (' + p(sem20, totalAlvo) + '%)');
  let semB20All = 0;
  for (let i = 0; i < T; i++) { let t2 = false; for (let j = 1; j <= 20 && i + j < T; j++) if (rows[i + j].num === 0) { t2 = true; break; } if (!t2) semB20All++; }
  console.log('  Baseline (qualquer posicao): ' + p(semB20All, T) + '%');

  // TESTE 3: Repetidor?
  console.log('\n>> TESTE 3: Forma padroes com ele mesmo?');
  let rep1 = 0, rep2 = 0, rep3 = 0;
  for (let i = 0; i < T - 3; i++) {
    if (rows[i].num === ALVO) {
      if (rows[i + 1].num === ALVO) rep1++;
      if (rows[i + 2].num === ALVO) rep2++;
      if (rows[i + 3].num === ALVO) rep3++;
    }
  }
  console.log('  +1: ' + rep1 + ' (' + p(rep1, totalAlvo) + '%) | +2: ' + rep2 + ' (' + p(rep2, totalAlvo) + '%) | +3: ' + rep3 + ' (' + p(rep3, totalAlvo) + '%) — esperado: ~' + p(totalAlvo, T) + '%');

  // TESTE 4: Influencia cor?
  console.log('\n>> TESTE 4: Influencia a COR depois?');
  for (let w of [2, 4, 6]) {
    let v = 0, pr = 0, wt = 0, n = 0;
    for (let i = 0; i < T; i++) {
      if (rows[i].num === ALVO) {
        for (let j = 1; j <= w && i + j < T; j++) {
          n++; const c = rows[i + j].num;
          if (c === 0) wt++; else if (c >= 1 && c <= 7) v++; else pr++;
        }
      }
    }
    console.log('  +' + w + ': V=' + p(v, n) + '% P=' + p(pr, n) + '% B=' + p(wt, n) + '%');
  }
  console.log('  Normal: V~46.7% P~46.7% B~6.7%');

  // TESTE 5: Modifica controladores?
  console.log('\n>> TESTE 5: Amplifica ou neutraliza controladores?');
  for (const ctrl of [4, 6, 10, 14]) {
    let cSolo = 0, cSoloB = 0, cComA = 0, cComAB = 0;
    for (let i = 0; i < T - 4; i++) {
      if (rows[i].num === ctrl) {
        let temAlvo = false, temB = false;
        for (let j = 1; j <= 4 && i + j < T; j++) { if (rows[i + j].num === ALVO) temAlvo = true; if (rows[i + j].num === 0) temB = true; }
        if (temAlvo) { cComA++; if (temB) cComAB++; } else { cSolo++; if (temB) cSoloB++; }
      }
    }
    console.log('  ' + ctrl + ' sem ' + ALVO + ': branco=' + p(cSoloB, cSolo) + '% (n=' + cSolo + ') | com ' + ALVO + ': branco=' + p(cComAB, cComA) + '% (n=' + cComA + ') | diff=' + (cComA > 0 && cSolo > 0 ? (cComAB/cComA*100 - cSoloB/cSolo*100).toFixed(1) : '?') + '%');
  }

  // TESTE 6: Aparece depois do branco?
  console.log('\n>> TESTE 6: Reacao ao branco — aparece MAIS ou MENOS apos ele?');
  let aposB = 0, aposBN = 0;
  for (let i = 0; i < T; i++) {
    if (rows[i].num === 0) { for (let j = 1; j <= 5 && i + j < T; j++) { aposBN++; if (rows[i + j].num === ALVO) aposB++; } }
  }
  console.log('  Nas 5 apos branco: ' + p(aposB, aposBN) + '% (esperado: ' + p(totalAlvo, T) + '%)');

  // TESTE 7: Relação com 11/12
  console.log('\n>> TESTE 7: Relacao com fake whites (11, 12)?');
  for (const fw of [11, 12]) {
    let antes = 0, depois = 0;
    const fwT = rows.filter(r => r.num === fw).length;
    for (let i = 0; i < T; i++) {
      if (rows[i].num === fw) {
        for (let j = 1; j <= 3 && i - j >= 0; j++) if (rows[i - j].num === ALVO) antes++;
        for (let j = 1; j <= 3 && i + j < T; j++) if (rows[i + j].num === ALVO) depois++;
      }
    }
    console.log('  ' + ALVO + ' nas 3 antes do ' + fw + ': ' + p(antes, fwT) + '% | 3 depois: ' + p(depois, fwT) + '% — esperado: ~' + p(totalAlvo * 3, T) + '%');
  }

  // TESTE 8: Distancia media ate branco
  console.log('\n>> TESTE 8: Distancia media ate proximo branco');
  let distT = 0, distN = 0;
  for (let i = 0; i < T; i++) {
    if (rows[i].num === ALVO) { for (let j = 1; j < T - i; j++) { if (rows[i + j].num === 0) { distT += j; distN++; break; } } }
  }
  let distA = 0, distAN = 0;
  for (let i = 0; i < T; i++) { for (let j = 1; j < T - i; j++) { if (rows[i + j].num === 0) { distA += j; distAN++; break; } } }
  console.log('  Media apos ' + ALVO + ': ' + (distT / distN).toFixed(1) + ' | Media geral: ' + (distA / distAN).toFixed(1));

  // TESTE 9: Por hora
  console.log('\n>> TESTE 9: Concentracao por hora');
  const porH = {};
  rows.forEach(r => { if (!porH[r.h]) porH[r.h] = { t: 0, a: 0 }; porH[r.h].t++; if (r.num === ALVO) porH[r.h].a++; });
  for (const h of Object.keys(porH).map(Number).sort((a, b) => a - b)) console.log('  ' + h + 'h: ' + p(porH[h].a, porH[h].t) + '% (' + porH[h].a + ')');

  // TESTE 10: Precede mudança de cor?
  console.log('\n>> TESTE 10: Marca mudanca de cor?');
  let mudaCor = 0, nM = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === ALVO && rows[i + 1].num !== 0) {
      nM++;
      const c1 = ALVO <= 7 ? 'V' : 'P'; const c2 = rows[i + 1].num <= 7 ? 'V' : 'P';
      if (c1 !== c2) mudaCor++;
    }
  }
  let mudaAll = 0, nAll = 0;
  for (let i = 0; i < T - 1; i++) { if (rows[i].num !== 0 && rows[i + 1].num !== 0) { nAll++; if ((rows[i].num <= 7 ? 'V' : 'P') !== (rows[i + 1].num <= 7 ? 'V' : 'P')) mudaAll++; } }
  console.log('  Muda cor apos ' + ALVO + ': ' + p(mudaCor, nM) + '% | Baseline: ' + p(mudaAll, nAll) + '%');

  // TESTE 11: Clusters?
  console.log('\n>> TESTE 11: Padrao de aparicao (clusters vs espalhado)');
  const pos = []; rows.forEach((r, i) => { if (r.num === ALVO) pos.push(i); });
  const diffs = []; for (let i = 1; i < pos.length; i++) diffs.push(pos[i] - pos[i - 1]);
  const clusters = diffs.filter(d => d <= 5).length;
  const isolados = diffs.filter(d => d >= 25).length;
  console.log('  Dist media: ' + (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1));
  console.log('  Clusters(<=5): ' + clusters + ' (' + p(clusters, diffs.length) + '%) | Isolados(>=25): ' + isolados + ' (' + p(isolados, diffs.length) + '%)');

  // TESTE 12: Quem vem antes do ALVO
  console.log('\n>> TESTE 12: Quem "chama" o ' + ALVO + '?');
  const antA = {};
  for (let i = 1; i < T; i++) { if (rows[i].num === ALVO) { antA[rows[i - 1].num] = (antA[rows[i - 1].num] || 0) + 1; } }
  Object.entries(antA).sort((a, b) => b[1] - a[1]).slice(0, 7).forEach(([n, v]) => console.log('  ' + n + ': ' + v + 'x (' + p(v, totalAlvo) + '%)'));

  // TESTE 13: ALVO seguido de interferente
  console.log('\n>> TESTE 13: '+ALVO+' seguido de interferente — muda algo?');
  for (const interf of [5, 7, 13]) {
    let ct = 0, cb = 0;
    for (let i = 0; i < T - 5; i++) {
      if (rows[i].num === ALVO && rows[i + 1].num === interf) {
        ct++;
        for (let j = 2; j <= 5; j++) if (rows[i + j].num === 0) { cb++; break; }
      }
    }
    console.log('  ' + ALVO + '->' + interf + ': ' + ct + 'x | branco em +2~+5: ' + cb + ' (' + p(cb, ct) + '%)');
  }

  // TESTE 14: G1 vs G2
  console.log('\n>> TESTE 14: G1 vs G2');
  const porMin = {};
  for (const r of rows) { const k = r.h + ':' + String(r.m).padStart(2, '0'); if (!porMin[k]) porMin[k] = []; porMin[k].push(r); }
  let g1 = 0, g2 = 0;
  for (const [, jogs] of Object.entries(porMin)) {
    const sorted = jogs.sort((a, b) => a.s - b.s);
    if (sorted[0] && sorted[0].num === ALVO) g1++;
    if (sorted[1] && sorted[1].num === ALVO) g2++;
  }
  console.log('  G1: ' + g1 + ' | G2: ' + g2);

  // TESTE 15: Relação com gap atual
  console.log('\n>> TESTE 15: ' + ALVO + ' aparece mais em gaps grandes?');
  const gB = { '1-5': [0,0], '6-10': [0,0], '11-20': [0,0], '21-40': [0,0], '41+': [0,0] };
  for (let i = 0; i < T; i++) {
    let dist = 999;
    for (let j = i - 1; j >= 0; j--) { if (rows[j].num === 0) { dist = i - j; break; } }
    let bk = dist <= 5 ? '1-5' : dist <= 10 ? '6-10' : dist <= 20 ? '11-20' : dist <= 40 ? '21-40' : '41+';
    gB[bk][0]++;
    if (rows[i].num === ALVO) gB[bk][1]++;
  }
  for (const [k, [t, a]] of Object.entries(gB)) console.log('  Gap ' + k + ': ' + ALVO + ' aparece ' + p(a, t) + '% (n=' + t + ')');
}

// EXTRA: 1 e 3 juntos
console.log('\n' + '='.repeat(70));
console.log('  1 e 3 JUNTOS');
console.log('='.repeat(70) + '\n');

let juntos = 0, juntosB = 0, juntosP = 0;
for (let i = 4; i < T; i++) {
  let tem1 = false, tem3 = false;
  for (let j = 1; j <= 4; j++) { if (rows[i - j].num === 1) tem1 = true; if (rows[i - j].num === 3) tem3 = true; }
  if (tem1 && tem3) { juntos++; if (rows[i].num === 0) juntosB++; if ([0,11,12].includes(rows[i].num)) juntosP++; }
}
console.log('1+3 na zona (4 casas): ' + juntos + 'x | Branco: ' + p(juntosB, juntos) + '% | Pool: ' + p(juntosP, juntos) + '%');

let seq13 = 0, seq13B = 0, seq31 = 0, seq31B = 0;
for (let i = 0; i < T - 5; i++) {
  if (rows[i].num === 1) { for (let j = 1; j <= 3; j++) { if (i+j<T && rows[i + j].num === 3) { seq13++; for (let k = 1; k <= 4 && i+j+k<T; k++) if (rows[i+j+k].num === 0) { seq13B++; break; } break; } } }
  if (rows[i].num === 3) { for (let j = 1; j <= 3; j++) { if (i+j<T && rows[i + j].num === 1) { seq31++; for (let k = 1; k <= 4 && i+j+k<T; k++) if (rows[i+j+k].num === 0) { seq31B++; break; } break; } } }
}
console.log('1->3: ' + seq13 + 'x | branco em <=4: ' + seq13B + ' (' + p(seq13B, seq13) + '%)');
console.log('3->1: ' + seq31 + 'x | branco em <=4: ' + seq31B + ' (' + p(seq31B, seq31) + '%)');
