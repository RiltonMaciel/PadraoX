const XLSX = require('xlsx');
const path = require('path');

// === CARREGAR DADOS ===
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (10).xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const dados = [];
for (let r = 2; r < raw.length; r++) {
  const num = parseInt(raw[r][0]);
  if (!isNaN(num) && num >= 0 && num <= 14) dados.push(num);
}
dados.reverse(); // cronologico
const h = dados, T = h.length;
const baseRate = h.filter(n => n === 0).length / T;

// === MOTOR V10 ===
const PARES_HOT = {
  '13,0':2.5,'13,10':2.3,'9,1':2.2,'8,3':2.0,'14,7':2.0,
  '4,5':1.8,'1,3':1.7,'5,11':1.7,'6,9':1.5
};
const PARES_VETO = new Set(['7,14','11,13','14,3','9,11','4,8','5,5','2,2']);
const GATILHO = {8:0.2, 10:0.2};

function boostV4(hist, idx) {
  let bonus = 0;
  if (idx >= 3) {
    const l4 = [hist[idx],hist[idx-1],hist[idx-2],hist[idx-3]];
    if (l4.includes(11) && l4.includes(12)) bonus += 2.0;
  }
  let dist = 0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){dist=idx-i;break;}dist=idx-i+1;}
  if (dist>=50) bonus+=2.0; else if(dist>=40) bonus+=1.5; else if(dist>=35) bonus+=1.0;
  if (idx >= 2) {
    const l3 = [hist[idx],hist[idx-1],hist[idx-2]];
    if (l3.filter(x=>x===1).length >= 2) bonus += 1.0;
  }
  return bonus;
}

function scoreV10(hist, idx) {
  if (idx < 1) return {score:0, nivel:'FRIO'};
  const pen = hist[idx-1], ult = hist[idx], par = pen+','+ult;
  if (PARES_VETO.has(par)) return {score:-1, nivel:'VETO', par};
  let s = 0;
  if (PARES_HOT[par]) s = PARES_HOT[par];
  if (GATILHO[ult] !== undefined) s += s < 1 ? GATILHO[ult] : GATILHO[ult]*0.3;
  // Stacking
  let st = 0, d = 0;
  for(let i=idx;i>=0;i--){if(hist[i]===0){d=idx-i;break;}d=idx-i+1;}
  if (PARES_HOT[par]) st++;
  if (GATILHO[ult]!==undefined) st++;
  if (d>=20) st++;
  if (ult===pen && !PARES_VETO.has(par)) st++;
  if (st>=3) s+=0.5; else if(st>=2 && PARES_HOT[par]) s+=0.3;
  // Boost V4
  s += boostV4(hist, idx);
  s = Math.round(s*100)/100;
  let nivel = s>=2?'FORTE':s>=1.3?'MEDIO':s>0?'FRACO':'FRIO';
  return {score: s, nivel, par, dist: d};
}

// === SIMULACAO COM JANELA ADAPTATIVA ===
function simular(hist, config, label) {
  let sinal = null, entradas = 0, acertos = 0, erros = 0;
  let porNivel = {FORTE:{e:0,a:0,err:0},MEDIO:{e:0,a:0,err:0},FRACO:{e:0,a:0,err:0}};
  let maxDD = 0, dd = 0; // drawdown consecutivo
  let streakW = 0, maxStreakW = 0, streakL = 0, maxStreakL = 0;
  let tempos = []; // rodadas ate acerto
  
  for (let i = 200; i < hist.length; i++) {
    if (sinal) {
      sinal.r++;
      if (hist[i] === 0) {
        acertos++;
        porNivel[sinal.nv].a++;
        tempos.push(sinal.r);
        dd = 0; streakW++; maxStreakW = Math.max(maxStreakW, streakW); streakL = 0;
        sinal = null;
      } else if (sinal.r >= sinal.janela) {
        erros++;
        porNivel[sinal.nv].err++;
        dd++; maxDD = Math.max(maxDD, dd); streakL++; maxStreakL = Math.max(maxStreakL, streakL); streakW = 0;
        sinal = null;
      }
    } else {
      const r = scoreV10(hist, i-1);
      if (r.score <= 0) continue;
      const nv = r.nivel;
      if (!config.niveis.includes(nv)) continue;
      if (config.minScore && r.score < config.minScore) continue;
      const janela = config.janelas[nv] || config.janelas.default || 10;
      sinal = { r: 0, nv, janela };
      entradas++;
      porNivel[nv].e++;
    }
  }
  
  const total = acertos + erros;
  const taxa = total > 0 ? acertos/total : 0;
  const mediaRodadas = tempos.length > 0 ? tempos.reduce((a,b)=>a+b,0)/tempos.length : 0;
  const sinaisPorHora = entradas / (T / 90); // ~90 rodadas/hora estimado
  
  console.log(`\n  ${label}`);
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  Entradas: ${entradas} | Concluidos: ${total} | Sinais/hora: ${sinaisPorHora.toFixed(1)}`);
  console.log(`  ACERTOS: ${acertos} | ERROS: ${erros} | TAXA: ${(taxa*100).toFixed(1)}%`);
  console.log(`  Media rodadas até acerto: ${mediaRodadas.toFixed(1)} | Max DD consecutivo: ${maxDD}`);
  console.log(`  Max streak W: ${maxStreakW} | Max streak L: ${maxStreakL}`);
  for (const nv of ['FORTE','MEDIO','FRACO']) {
    const d = porNivel[nv];
    if (d.e > 0) {
      console.log(`    ${nv.padEnd(6)}: ${d.a}/${d.e} acertos (${(d.a/d.e*100).toFixed(1)}%) | ${d.err} erros`);
    }
  }
  return { entradas, acertos, erros, taxa, maxDD, sinaisPorHora };
}

// === SPLIT-HALF VALIDATION ===
function splitHalf(hist, config, label) {
  const mid = Math.floor(hist.length / 2);
  const h1 = hist.slice(0, mid);
  const h2 = hist.slice(mid);
  
  function taxaLocal(hLocal) {
    let sinal = null, ac = 0, err = 0;
    for (let i = 10; i < hLocal.length; i++) {
      if (sinal) {
        sinal.r++;
        if (hLocal[i] === 0) { ac++; sinal = null; }
        else if (sinal.r >= sinal.janela) { err++; sinal = null; }
      } else {
        const r = scoreV10(hLocal, i-1);
        if (r.score <= 0 || !config.niveis.includes(r.nivel)) continue;
        if (config.minScore && r.score < config.minScore) continue;
        const janela = config.janelas[r.nivel] || config.janelas.default || 10;
        sinal = { r:0, nv:r.nivel, janela };
      }
    }
    const total = ac + err;
    return total > 0 ? ac/total : 0;
  }
  
  const t1 = taxaLocal(h1), t2 = taxaLocal(h2);
  const diff = Math.abs(t1 - t2);
  const estavel = diff < 0.08; // <8pp de diferença = estável
  console.log(`  Split-half: 1ª metade ${(t1*100).toFixed(1)}% | 2ª metade ${(t2*100).toFixed(1)}% | Diff: ${(diff*100).toFixed(1)}pp ${estavel ? '✓ ESTÁVEL' : '⚠ INSTÁVEL'}`);
  return { t1, t2, diff, estavel };
}

// === PAR-A-PAR: QUAL PAR CONTRIBUI MAIS? ===
function analisePares(hist) {
  console.log('\n  ANÁLISE POR PAR (contribuição individual):');
  console.log('  ' + '─'.repeat(60));
  const stats = {};
  for (let i = 201; i < hist.length; i++) {
    const pen = hist[i-2], ult = hist[i-1], par = pen+','+ult;
    if (!PARES_HOT[par]) continue;
    if (!stats[par]) stats[par] = { ent: 0, brancos10: 0 };
    stats[par].ent++;
    // verifica se deu branco em J=10
    let acertou = false;
    for (let j = i; j < Math.min(i+10, hist.length); j++) {
      if (hist[j] === 0) { acertou = true; break; }
    }
    if (acertou) stats[par].brancos10++;
  }
  
  const results = Object.entries(stats).map(([par, s]) => ({
    par, ent: s.ent, ac: s.brancos10, taxa: s.brancos10/s.ent,
    score: PARES_HOT[par]
  })).sort((a,b) => b.taxa - a.taxa);
  
  for (const r of results) {
    const barra = '█'.repeat(Math.round(r.taxa * 20));
    const status = r.taxa > 0.55 ? '✓' : r.taxa > 0.50 ? '~' : '✗';
    console.log(`    ${status} ${r.par.padEnd(6)} score=${r.score} | ${r.ac}/${r.ent} = ${(r.taxa*100).toFixed(1)}% ${barra}`);
  }
  
  // Baseline (aleatório sem padrão)
  let baseAc = 0, baseT = 0;
  for (let i = 201; i < hist.length - 10; i++) {
    baseT++;
    for (let j = i; j < i+10; j++) { if (hist[j] === 0) { baseAc++; break; } }
  }
  console.log(`    → Baseline (qualquer momento, J10): ${(baseAc/baseT*100).toFixed(1)}%`);
}

// === BOOST V4 ANALYSIS ===
function analiseBoostV4(hist) {
  console.log('\n  ANÁLISE BOOST V4 (condições especiais):');
  console.log('  ' + '─'.repeat(60));
  
  let par1112 = {ent:0,ac:0}, dist35 = {ent:0,ac:0}, dist40 = {ent:0,ac:0}, dist50 = {ent:0,ac:0}, rep1 = {ent:0,ac:0};
  
  for (let i = 200; i < hist.length - 15; i++) {
    // Par 11+12 nas ultimas 4
    if (i >= 3) {
      const l4 = [hist[i],hist[i-1],hist[i-2],hist[i-3]];
      if (l4.includes(11) && l4.includes(12)) {
        par1112.ent++;
        for(let j=i+1;j<Math.min(i+11,hist.length);j++){if(hist[j]===0){par1112.ac++;break;}}
      }
    }
    // Distância
    let d = 0;
    for(let k=i;k>=0;k--){if(hist[k]===0){d=i-k;break;}d=i-k+1;}
    if (d >= 50) { dist50.ent++; for(let j=i+1;j<Math.min(i+11,hist.length);j++){if(hist[j]===0){dist50.ac++;break;}} }
    else if (d >= 40) { dist40.ent++; for(let j=i+1;j<Math.min(i+11,hist.length);j++){if(hist[j]===0){dist40.ac++;break;}} }
    else if (d >= 35) { dist35.ent++; for(let j=i+1;j<Math.min(i+11,hist.length);j++){if(hist[j]===0){dist35.ac++;break;}} }
    // Rep1
    if (i >= 2) {
      const l3 = [hist[i],hist[i-1],hist[i-2]];
      if (l3.filter(x=>x===1).length >= 2) {
        rep1.ent++;
        for(let j=i+1;j<Math.min(i+11,hist.length);j++){if(hist[j]===0){rep1.ac++;break;}}
      }
    }
  }
  
  const show = (lbl, s) => {
    if (s.ent === 0) return console.log(`    ${lbl.padEnd(20)} N=0 (nunca ocorreu)`);
    const taxa = (s.ac/s.ent*100).toFixed(1);
    const barra = '█'.repeat(Math.round(s.ac/s.ent * 20));
    console.log(`    ${lbl.padEnd(20)} ${s.ac}/${s.ent} = ${taxa}% ${barra}`);
  };
  show('Par 11+12 (4r)', par1112);
  show('Dist >= 35', dist35);
  show('Dist >= 40', dist40);
  show('Dist >= 50', dist50);
  show('Rep 1 (2x/3r)', rep1);
}

// === VETO ANALYSIS ===
function analiseVetos(hist) {
  console.log('\n  ANÁLISE VETOS (pares bloqueados):');
  console.log('  ' + '─'.repeat(60));
  
  for (const par of PARES_VETO) {
    let ent = 0, ac = 0;
    for (let i = 201; i < hist.length - 10; i++) {
      const p = hist[i-2]+','+hist[i-1];
      if (p !== par) continue;
      ent++;
      for(let j=i;j<Math.min(i+10,hist.length);j++){if(hist[j]===0){ac++;break;}}
    }
    const taxa = ent > 0 ? (ac/ent*100).toFixed(1) : 'N/A';
    const status = ent > 0 && ac/ent < 0.45 ? '✓ BOM VETO' : '⚠ DUVIDOSO';
    console.log(`    ${par.padEnd(6)} → ${ac}/${ent} = ${taxa}% em J10 ${status}`);
  }
}

// ========== EXECUÇÃO ==========
console.log('\n' + '═'.repeat(70));
console.log('  CURADORIA COMPLETA DO MOTOR V10');
console.log('  Dataset: ' + T + ' rodadas | Base rate branco: ' + (baseRate*100).toFixed(2) + '%');
console.log('  P(branco em J=10) teórico: ' + ((1 - Math.pow(1-baseRate, 10))*100).toFixed(1) + '%');
console.log('═'.repeat(70));

// 1. Cenários de configuração
console.log('\n' + '▓'.repeat(70));
console.log('  1. CENÁRIOS DE CONFIGURAÇÃO');
console.log('▓'.repeat(70));

simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {default:10} }, 'A) Todos níveis, J=10 fixo');
simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {default:15} }, 'B) Todos níveis, J=15 fixo');
simular(h, { niveis: ['FORTE','MEDIO'], janelas: {default:10} }, 'C) Só FORTE+MEDIO, J=10');
simular(h, { niveis: ['FORTE','MEDIO'], janelas: {default:15} }, 'D) Só FORTE+MEDIO, J=15');
simular(h, { niveis: ['FORTE'], janelas: {default:10} }, 'E) Só FORTE, J=10');
simular(h, { niveis: ['FORTE'], janelas: {default:15} }, 'F) Só FORTE, J=15');

// Janela adaptativa
simular(h, { niveis: ['FORTE','MEDIO'], janelas: {FORTE:10, MEDIO:15} }, 'G) ADAPTATIVA: FORTE=J10, MEDIO=J15');
simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {FORTE:10, MEDIO:15, FRACO:20} }, 'H) ADAPTATIVA FULL: F=10,M=15,FR=20');
simular(h, { niveis: ['FORTE','MEDIO'], janelas: {FORTE:12, MEDIO:18} }, 'I) ADAPTATIVA v2: FORTE=J12, MEDIO=J18');

// Score mínimo
simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {default:10}, minScore: 1.5 }, 'J) Score >= 1.5, J=10');
simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {default:15}, minScore: 1.5 }, 'K) Score >= 1.5, J=15');
simular(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {FORTE:10, MEDIO:15, default:10}, minScore: 2.5 }, 'L) Score >= 2.5, ADAPT');

// 2. Split-half
console.log('\n\n' + '▓'.repeat(70));
console.log('  2. ESTABILIDADE TEMPORAL (Split-Half)');
console.log('▓'.repeat(70) + '\n');

splitHalf(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {default:10} }, 'Todos J10');
splitHalf(h, { niveis: ['FORTE','MEDIO'], janelas: {FORTE:10, MEDIO:15} }, 'Adaptativa G');
splitHalf(h, { niveis: ['FORTE'], janelas: {default:10} }, 'Só FORTE J10');
splitHalf(h, { niveis: ['FORTE','MEDIO','FRACO'], janelas: {FORTE:10, MEDIO:15, FRACO:20} }, 'Adaptativa Full H');

// 3. Análise por par
console.log('\n\n' + '▓'.repeat(70));
console.log('  3. CONTRIBUIÇÃO POR PAR HOT');
console.log('▓'.repeat(70));
analisePares(h);

// 4. Boost V4
console.log('\n\n' + '▓'.repeat(70));
console.log('  4. VALIDAÇÃO BOOST V4');
console.log('▓'.repeat(70));
analiseBoostV4(h);

// 5. Vetos
console.log('\n\n' + '▓'.repeat(70));
console.log('  5. VALIDAÇÃO VETOS');
console.log('▓'.repeat(70));
analiseVetos(h);

// 6. Recomendação final
console.log('\n\n' + '═'.repeat(70));
console.log('  RECOMENDAÇÃO FINAL');
console.log('═'.repeat(70));
console.log(`
  Com base nos dados:
  - Base rate P(branco em J10) = ${((1 - Math.pow(1-baseRate, 10))*100).toFixed(1)}%
  - Nenhum cenário supera significativamente a baseline
  - Janela maior SEMPRE melhora taxa (mas = menos sinais)
  
  A melhor config é a que MAXIMIZA: (taxa - baseline) × entradas
  Isso indica a quantidade de "edge real" do motor.
`);

// Calcula edge real por cenário
const baseline10 = 1 - Math.pow(1-baseRate, 10);
const baseline15 = 1 - Math.pow(1-baseRate, 15);
const baseline20 = 1 - Math.pow(1-baseRate, 20);

function edge(hist, config, bl, label) {
  let sinal = null, ac = 0, err = 0;
  for (let i = 200; i < hist.length; i++) {
    if (sinal) {
      sinal.r++;
      if (hist[i] === 0) { ac++; sinal = null; }
      else if (sinal.r >= sinal.janela) { err++; sinal = null; }
    } else {
      const r = scoreV10(hist, i-1);
      if (r.score <= 0 || !config.niveis.includes(r.nivel)) continue;
      if (config.minScore && r.score < config.minScore) continue;
      const janela = config.janelas[r.nivel] || config.janelas.default || 10;
      sinal = { r:0, nv:r.nivel, janela };
    }
  }
  const total = ac + err;
  if (total === 0) return;
  const taxa = ac/total;
  const edgeReal = taxa - bl;
  const valor = edgeReal * total; // "unidades de edge"
  console.log(`  ${label.padEnd(30)} taxa=${(taxa*100).toFixed(1)}% base=${(bl*100).toFixed(1)}% edge=${(edgeReal*100).toFixed(1)}pp N=${total} valor=${valor.toFixed(1)}`);
}

console.log('  Edge = (taxa observada) - (baseline teórica da janela usada)\n');
edge(h, {niveis:['FORTE','MEDIO','FRACO'],janelas:{default:10}}, baseline10, 'Todos J10');
edge(h, {niveis:['FORTE','MEDIO'],janelas:{default:10}}, baseline10, 'F+M J10');
edge(h, {niveis:['FORTE'],janelas:{default:10}}, baseline10, 'FORTE J10');
edge(h, {niveis:['FORTE','MEDIO'],janelas:{FORTE:10,MEDIO:15}}, baseline10, 'Adapt G (aprox bl10)');
edge(h, {niveis:['FORTE','MEDIO','FRACO'],janelas:{FORTE:10,MEDIO:15,FRACO:20}}, baseline15, 'Adapt Full H (aprox bl15)');
edge(h, {niveis:['FORTE','MEDIO','FRACO'],janelas:{default:15}}, baseline15, 'Todos J15');
edge(h, {niveis:['FORTE','MEDIO','FRACO'],janelas:{default:10},minScore:1.5}, baseline10, 'Score>=1.5 J10');

console.log('\n' + '═'.repeat(70) + '\n');
