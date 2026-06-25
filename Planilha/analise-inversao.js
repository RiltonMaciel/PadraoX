const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, '..', 'Lixeira_motor', 'Referencia_v4_ativo_2026-05-15', 'dados-novos.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf-8').split('\n');
const dados = [];
for (let i = csvRaw.length - 1; i >= 2; i--) {
  const cols = csvRaw[i].split(',');
  if (cols.length < 4) continue;
  const num = parseInt(cols[0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}
const h = dados, T = h.length;
const baseRate = h.filter(n=>n===0).length / T;

console.log('═'.repeat(70));
console.log('  ANÁLISE DE INVERSÃO: números que mudam o comportamento do branco');
console.log('  N=' + T + ' | base=' + (baseRate*100).toFixed(2) + '%');
console.log('═'.repeat(70));

// ══════════════════════════════════════════════
// TESTE 1: Taxa de inversão por número
// Se X é "interruptor", os períodos entre cada X alternam alto/baixo
// ══════════════════════════════════════════════
console.log('\n▓ TESTE 1: TAXA DE INVERSÃO (alternância de regime)');
console.log('  Se >55% = o número "inverte" o ritmo do branco\n');
console.log('  Num | Aparições | Inversão% | Gap médio após | Status');
console.log('  ' + '─'.repeat(60));

const resultados = [];

for (let x = 0; x <= 14; x++) {
  const pos = [];
  for (let i = 0; i < T; i++) if (h[i] === x) pos.push(i);
  if (pos.length < 20) continue;

  const periodos = [];
  for (let p = 0; p < pos.length - 1; p++) {
    const ini = pos[p]+1, fim = pos[p+1];
    if (fim-ini < 2) continue;
    let b=0,t=0;
    for (let i=ini;i<fim;i++){t++;if(h[i]===0)b++;}
    periodos.push({taxa: t>0?b/t:0, t});
  }
  if (periodos.length < 20) continue;

  let inv = 0;
  for (let i=1;i<periodos.length;i++) {
    if ((periodos[i-1].taxa>baseRate && periodos[i].taxa<baseRate) ||
        (periodos[i-1].taxa<baseRate && periodos[i].taxa>baseRate)) inv++;
  }
  const taxaInv = inv/(periodos.length-1);

  // Gap até próximo branco após X
  let gapsApos = [];
  for (const p of pos) {
    for (let j=p+1;j<Math.min(T,p+50);j++) {
      if (h[j]===0) { gapsApos.push(j-p); break; }
    }
  }
  const gapMedio = gapsApos.length>0 ? gapsApos.reduce((a,b)=>a+b,0)/gapsApos.length : 99;

  const status = taxaInv > 0.58 ? '★ INVERSOR FORTE' : taxaInv > 0.55 ? '✓ Inversor' : taxaInv > 0.52 ? '~ possível' : '  normal';
  resultados.push({x, pos: pos.length, taxaInv, gapMedio, status, periodos: periodos.length});
  console.log(`   ${String(x).padStart(2)} |    ${String(pos.length).padStart(4)}   |  ${(taxaInv*100).toFixed(1)}%    |   ${gapMedio.toFixed(1)} rodadas  | ${status}`);
}

// ══════════════════════════════════════════════
// TESTE 2: Efeito antes vs depois
// ══════════════════════════════════════════════
console.log('\n\n▓ TESTE 2: TAXA DE BRANCO ANTES vs DEPOIS DE CADA NÚMERO');
console.log('  Se DEPOIS é muito diferente de ANTES = o número muda algo\n');
console.log('  Num | 5 antes | 5 depois | Mudança | Efeito');
console.log('  ' + '─'.repeat(55));

for (let x = 0; x <= 14; x++) {
  const pos = [];
  for (let i = 5; i < T-5; i++) if (h[i] === x) pos.push(i);
  if (pos.length < 30) continue;

  let bAntes=0,tAntes=0,bDepois=0,tDepois=0;
  for (const p of pos) {
    for (let j=p-5;j<p;j++){tAntes++;if(h[j]===0)bAntes++;}
    for (let j=p+1;j<=p+5;j++){tDepois++;if(h[j]===0)bDepois++;}
  }
  const tA = bAntes/tAntes, tD = bDepois/tDepois;
  const diff = tD - tA;
  const efeito = diff > 0.015 ? '↑ PUXA branco' : diff < -0.015 ? '↓ AFASTA branco' : '= neutro';
  console.log(`   ${String(x).padStart(2)} | ${(tA*100).toFixed(1)}%   | ${(tD*100).toFixed(1)}%    | ${diff>=0?'+':''}${(diff*100).toFixed(1)}pp   | ${efeito}`);
}

// ══════════════════════════════════════════════
// TESTE 3: Gap até branco — qual número ENCURTA o caminho?
// ══════════════════════════════════════════════
console.log('\n\n▓ TESTE 3: GAP ATÉ O PRÓXIMO BRANCO — quem encurta/alonga?');
console.log('  "Se X acabou de sair, em quantas rodadas vem o branco?"\n');
console.log('  Num | Gap médio | Gap geral | Diff    | Significado');
console.log('  ' + '─'.repeat(60));

// Gap geral
let gapGeral = [];
for (let i = 1; i < T-30; i++) {
  for (let j=i;j<Math.min(T,i+50);j++) { if(h[j]===0){gapGeral.push(j-i+1);break;} }
}
const mediaGeral = gapGeral.reduce((a,b)=>a+b,0)/gapGeral.length;

for (let x = 0; x <= 14; x++) {
  let gaps = [];
  for (let i = 1; i < T-30; i++) {
    if (h[i-1] !== x) continue;
    for (let j=i;j<Math.min(T,i+50);j++) { if(h[j]===0){gaps.push(j-i+1);break;} }
  }
  if (gaps.length < 30) continue;
  const media = gaps.reduce((a,b)=>a+b,0)/gaps.length;
  const diff = media - mediaGeral;
  const sig = diff < -1.5 ? '★ ACELERA branco!' : diff > 1.5 ? '✗ Atrasa branco' : '  neutro';
  console.log(`   ${String(x).padStart(2)} | ${media.toFixed(1).padStart(5)}   | ${mediaGeral.toFixed(1).padStart(5)}   | ${diff>=0?'+':''}${diff.toFixed(1).padStart(5)}  | ${sig}`);
}

// ══════════════════════════════════════════════
// TESTE 4: ANUNCIADORES — quem aparece nos últimos 3 antes do branco?
// ══════════════════════════════════════════════
console.log('\n\n▓ TESTE 4: ANUNCIADORES — quem aparece mais nos 3 antes do branco?');
console.log('  Lift > 1.15 = anunciador | Lift < 0.85 = anti-anunciador\n');
console.log('  Num | Freq 3 antes do branco | Freq geral | Lift  | Status');
console.log('  ' + '─'.repeat(60));

const brancoPos = [];
for (let i = 0; i < T; i++) if (h[i]===0) brancoPos.push(i);

for (let x = 1; x <= 14; x++) {
  let antesBranco = 0, totalAntes = 0;
  for (const bp of brancoPos) {
    for (let j=Math.max(0,bp-3);j<bp;j++) { totalAntes++; if(h[j]===x) antesBranco++; }
  }
  const freqAntes = antesBranco/totalAntes;
  const freqGeral = h.filter(n=>n===x).length/T;
  const lift = freqAntes/freqGeral;
  const status = lift > 1.20 ? '★ ANUNCIADOR!' : lift > 1.10 ? '✓ tendência' : lift < 0.80 ? '✗ RARO' : '  normal';
  console.log(`   ${String(x).padStart(2)} |     ${(freqAntes*100).toFixed(2)}%           | ${(freqGeral*100).toFixed(2)}%    | ${lift.toFixed(2)}x | ${status}`);
}

// ══════════════════════════════════════════════
// TESTE 5: STREAKS DE COR
// ══════════════════════════════════════════════
console.log('\n\n▓ TESTE 5: STREAKS DE COR — efeito no branco');
console.log('  Preto = 8-14, Vermelho = 1-7\n');

function corNum(n) { if(n===0)return'B'; return n<=7?'V':'P'; }

console.log('  Streak     | P(branco) | N   | vs base | Status');
console.log('  ' + '─'.repeat(55));
for (let streak of [3,4,5,6,7,8,9,10]) {
  for (const cor of ['P','V']) {
    let n=0,b=0;
    for (let i=streak;i<T;i++) {
      let ok = true;
      for (let j=1;j<=streak;j++) if(corNum(h[i-j])!==cor){ok=false;break;}
      if (ok) { n++; if(h[i]===0)b++; }
    }
    if (n < 10) continue;
    const taxa = b/n;
    const diff = taxa - baseRate;
    const status = diff > 0.03 ? '★ ELEVA!' : diff < -0.02 ? '↓ reduz' : '  normal';
    const corLabel = cor==='P'?'PRETO':'VERM.';
    console.log(`  ${streak}x ${corLabel} | ${(taxa*100).toFixed(1)}%     | ${String(n).padStart(4)} | ${diff>=0?'+':''}${(diff*100).toFixed(1)}pp  | ${status}`);
  }
}

// ══════════════════════════════════════════════
// TESTE 6: O NÚMERO ANTERIOR AO ANTERIOR (2 casas antes)
// ══════════════════════════════════════════════
console.log('\n\n▓ TESTE 6: NÚMERO 2 CASAS ANTES — afeta o branco?');
console.log('  P(branco) quando h[i-2] = X\n');
console.log('  Num | Taxa    | N    | Z-score | Status');
console.log('  ' + '─'.repeat(45));

for (let x = 0; x <= 14; x++) {
  let n=0,b=0;
  for (let i=2;i<T;i++) { if(h[i-2]===x){n++;if(h[i]===0)b++;} }
  const taxa = b/n;
  const z = (taxa-baseRate)/Math.sqrt(baseRate*(1-baseRate)/n);
  const status = z > 2.0 ? '★ ELEVADO!' : z < -2.0 ? '✗ REDUZIDO' : '  normal';
  console.log(`   ${String(x).padStart(2)} | ${(taxa*100).toFixed(1)}%   | ${String(n).padStart(4)} | ${z.toFixed(2).padStart(5)}   | ${status}`);
}

console.log('\n' + '═'.repeat(70));
console.log('  FIM — Dados puros, sem interpretação.');
console.log('═'.repeat(70) + '\n');
