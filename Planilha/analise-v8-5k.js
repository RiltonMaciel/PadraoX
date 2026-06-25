const XLSX = require('xlsx');
const path = require('path');

// ========== MOTOR v8 COMPLETO (cópia do server.js) ==========
const PARES_HOT = {
  '12,13': 2.5, '3,13': 2.3, '7,7': 2.2, '8,10': 2.0, '0,8': 2.0,
  '0,13': 1.7, '3,10': 1.7, '3,1': 1.5, '9,0': 1.5, '6,13': 1.5,
  '7,8': 1.3, '2,8': 1.3, '6,6': 1.5, '9,9': 1.3,
};
const PARES_VETO = new Set([
  '13,6','13,10','10,9','1,11','4,8','7,14','14,3','9,11','8,6','4,3','11,13',
  '4,4','5,5','2,2',
]);
const NUMS_GATILHO = { 13: 0.5, 10: 0.6, 8: 0.4, 7: 0.4 };

const TRIPLAS_HOT = {
  '7,12,13': 0.5, '3,12,13': 0.5,
  '8,8,10': 0.4, '0,3,13': 0.4,
  '7,7,8': 0.3, '6,7,7': 0.3,
  '9,0,8': 0.3, '3,3,10': 0.3,
};

function calcBoostDistancia(d) {
  if (d >= 35) return 1.8;
  if (d >= 25) return 1.5;
  if (d >= 15) return 1.2;
  return 1.0;
}

function calcAntiStreak(d) {
  if (d >= 40) return 0.6;
  if (d >= 30) return 0.4;
  if (d >= 20) return 0.2;
  return 0;
}

function calcParesDinamicos(historico, janelaTamanho) {
  janelaTamanho = janelaTamanho || 300;
  const T = historico.length;
  const inicio = Math.max(0, T - janelaTamanho);
  const pairStats = {};
  for (let i = inicio + 1; i < T; i++) {
    const par = historico[i-1]+','+historico[i];
    if (!pairStats[par]) pairStats[par] = {total:0, brancos:0};
    pairStats[par].total++;
    if (i+1 < T && historico[i+1] === 0) pairStats[par].brancos++;
  }
  const baseRate = historico.slice(inicio).filter(n=>n===0).length/(T-inicio)||0.0667;
  const dinamicos = {};
  for (const [par,stats] of Object.entries(pairStats)) {
    if (stats.total < 3) continue;
    const rate = stats.brancos/stats.total;
    const lift = rate/baseRate;
    if (lift >= 1.5 && stats.brancos >= 2) {
      dinamicos[par] = {rate, lift, total:stats.total, brancos:stats.brancos};
    }
  }
  return {dinamicos, baseRate};
}

function motorV8Avaliar(historico, idx, paresDinamicos) {
  if (idx < 1) return {nivel:'FRIO', score:0, veto:false, boosts:[]};
  
  const pen = historico[idx-1], ult = historico[idx];
  const parKey = pen+','+ult;
  
  // Distância do branco
  let distBranco = 0;
  for (let i = idx; i >= 0; i--) {
    if (historico[i] === 0) { distBranco = idx - i; break; }
    distBranco = idx - i + 1;
  }
  
  // VETO
  if (PARES_VETO.has(parKey)) {
    return {nivel:'FRIO', score:-1, veto:true, par:parKey, distBranco, boosts:['VETO']};
  }
  
  let score = 0;
  const boosts = [];
  const dupla = ult === pen;
  let gatilho = false;
  
  // Par HOT
  if (PARES_HOT[parKey]) {
    score = PARES_HOT[parKey];
    boosts.push('Par HOT');
  }
  
  // Gatilho
  if (NUMS_GATILHO[ult] !== undefined) {
    gatilho = true;
    const bonus = score < 1.0 ? NUMS_GATILHO[ult] : Math.round(NUMS_GATILHO[ult]*0.3*100)/100;
    score += bonus;
    boosts.push('Gatilho');
  }
  
  // Janela Dinâmica
  if (!PARES_HOT[parKey] && paresDinamicos && paresDinamicos[parKey]) {
    const din = paresDinamicos[parKey];
    const dinScore = Math.min(din.lift * 0.4, 1.2);
    score += dinScore;
    boosts.push('Dinamico');
  }
  
  // Tripla
  if (idx >= 2) {
    const tk = historico[idx-2]+','+pen+','+ult;
    if (TRIPLAS_HOT[tk]) {
      score += TRIPLAS_HOT[tk];
      boosts.push('Tripla');
    }
  }
  
  score = Math.round(score*100)/100;
  
  if (score > 0) {
    // Boost Distância
    const bd = calcBoostDistancia(distBranco);
    if (bd > 1.0) {
      score = Math.round(score * bd * 100) / 100;
      boosts.push('Dist x'+bd);
    }
    
    // Stacking
    let sc = 0;
    if (PARES_HOT[parKey]) sc++;
    if (gatilho) sc++;
    if (distBranco >= 20) sc++;
    if (dupla && !PARES_VETO.has(parKey)) sc++;
    if (sc >= 3) { score += 0.5; boosts.push('Stack'); }
    else if (sc >= 2 && PARES_HOT[parKey]) { score += 0.3; boosts.push('Stack'); }
    
    // Anti-streak
    const as = calcAntiStreak(distBranco);
    if (as > 0) { score += as; boosts.push('Anti-streak'); }
    
    score = Math.round(score*100)/100;
  }
  
  // Dist crítica
  if (distBranco >= 35 && score > 0 && score < 1.3) {
    score = 1.3;
    boosts.push('Dist critica');
  }
  
  let nivel;
  if (score >= 2.0) nivel = 'FORTE';
  else if (score >= 1.3) nivel = 'MEDIO';
  else if (score > 0.3) nivel = 'FRACO';
  else nivel = 'FRIO';
  
  return {nivel, score, veto:false, par:parKey, distBranco, gatilho, dupla, boosts};
}

// ========== MOTOR v7 (para comparação) ==========
function motorV7Avaliar(historico, idx) {
  if (idx < 1) return {nivel:'FRIO', score:0, veto:false};
  const pen = historico[idx-1], ult = historico[idx];
  const parKey = pen+','+ult;
  
  if (PARES_VETO.has(parKey)) return {nivel:'FRIO', score:-1, veto:true, par:parKey};
  
  let score = 0, gatilho = false;
  if (PARES_HOT[parKey]) score = PARES_HOT[parKey];
  if (NUMS_GATILHO[ult] !== undefined) {
    gatilho = true;
    score += score < 1.0 ? NUMS_GATILHO[ult] : Math.round(NUMS_GATILHO[ult]*0.3*100)/100;
  }
  score = Math.round(score*100)/100;
  
  let nivel;
  if (score >= 2.0) nivel = 'FORTE';
  else if (score >= 1.3) nivel = 'MEDIO';
  else if (score > 0.3) nivel = 'FRACO';
  else nivel = 'FRIO';
  
  return {nivel, score, veto:false, par:parKey};
}

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (7).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);

console.log('Colunas:', Object.keys(rows[0]));
console.log('Primeiras 3 linhas:', rows.slice(0,3));
console.log('Total linhas:', rows.length);

// Extrair números (procurar coluna result/número/color)
// Coluna é "Número", filtrar linhas de cabeçalho/lixo
const numCol = 'Número';
console.log('\nUsando coluna:', numCol);
const nums = rows
  .filter(r => typeof r[numCol] === 'number')
  .map(r => r[numCol])
  .filter(n => !isNaN(n) && n >= 0 && n <= 14);

// Verificar ordem (mais recente primeiro? inverter para cronológico)
// TipMiner geralmente exporta mais recente primeiro
const numsChron = nums.slice().reverse();
console.log('Total números válidos:', numsChron.length);
console.log('Primeiros 10 (cronológico):', numsChron.slice(0,10));
console.log('Últimos 10 (cronológico):', numsChron.slice(-10));

const totalBrancos = numsChron.filter(n => n === 0).length;
console.log('Total brancos:', totalBrancos, `(${(totalBrancos/numsChron.length*100).toFixed(2)}%)`);

// ========== SIMULAÇÃO v7 vs v8 ==========
console.log('\n' + '='.repeat(60));
console.log('SIMULAÇÃO: Motor v7 vs Motor v8');
console.log('='.repeat(60));

const JANELA_CALIBRACAO = 200;
const RECALIBRAR_CADA = 30;

function simular(historico, versao) {
  const stats = {
    FORTE: {total:0, acertos:0, impedidos:0, exemplos:[]},
    MEDIO: {total:0, acertos:0, impedidos:0, exemplos:[]},
    FRACO: {total:0, acertos:0, impedidos:0},
    FRIO: {total:0, vetoCorretos:0, vetoIncorretos:0},
  };
  
  let paresDinamicos = null;
  let ultimaCal = 0;
  
  // Começar da posição 300 para ter histórico suficiente
  for (let i = 300; i < historico.length - 1; i++) {
    // Recalibrar janela dinâmica periodicamente
    if (versao === 'v8' && (i - ultimaCal >= RECALIBRAR_CADA || !paresDinamicos)) {
      const {dinamicos} = calcParesDinamicos(historico.slice(0, i+1), 300);
      paresDinamicos = dinamicos;
      ultimaCal = i;
    }
    
    const sinal = versao === 'v8' 
      ? motorV8Avaliar(historico, i, paresDinamicos)
      : motorV7Avaliar(historico, i);
    
    const proximoNum = historico[i + 1];
    const acertou = proximoNum === 0;
    const parProx = historico[i]+','+proximoNum;
    const impedido = PARES_VETO.has(parProx);
    
    const s = stats[sinal.nivel];
    s.total++;
    
    if (sinal.nivel === 'FRIO') {
      if (sinal.veto) {
        if (!acertou) s.vetoCorretos++;
        else s.vetoIncorretos++;
      }
    } else {
      if (acertou) {
        s.acertos++;
        if ((sinal.nivel === 'FORTE' || sinal.nivel === 'MEDIO') && s.exemplos.length < 5) {
          s.exemplos.push({i, par:sinal.par, score:sinal.score, dist:sinal.distBranco||0, boosts:sinal.boosts||[]});
        }
      }
      if (impedido && !acertou) s.impedidos++;
    }
  }
  
  return stats;
}

const statsV7 = simular(numsChron, 'v7');
const statsV8 = simular(numsChron, 'v8');

function printStats(label, stats) {
  console.log(`\n--- ${label} ---`);
  const totalSinais = stats.FORTE.total + stats.MEDIO.total;
  const totalAcertos = stats.FORTE.acertos + stats.MEDIO.acertos;
  
  for (const nivel of ['FORTE','MEDIO','FRACO']) {
    const s = stats[nivel];
    if (s.total === 0) continue;
    const taxa = (s.acertos/s.total*100).toFixed(1);
    console.log(`  ${nivel}: ${s.total} sinais → ${s.acertos} acertos (${taxa}%) | ${s.impedidos} impedidos`);
  }
  
  const frio = stats.FRIO;
  console.log(`  FRIO: ${frio.total} sinais | VETO corretos: ${frio.vetoCorretos} | VETO bloqueou branco: ${frio.vetoIncorretos}`);
  
  if (totalSinais > 0) {
    console.log(`  >> FORTE+MEDIO combinado: ${totalSinais} sinais → ${totalAcertos} acertos (${(totalAcertos/totalSinais*100).toFixed(1)}%)`);
  }
}

printStats('Motor v7', statsV7);
printStats('Motor v8', statsV8);

// ========== COMPARAÇÃO DIRETA ==========
console.log('\n' + '='.repeat(60));
console.log('COMPARAÇÃO DIRETA v7 vs v8');
console.log('='.repeat(60));

const v7FM = statsV7.FORTE.total + statsV7.MEDIO.total;
const v7FMA = statsV7.FORTE.acertos + statsV7.MEDIO.acertos;
const v8FM = statsV8.FORTE.total + statsV8.MEDIO.total;
const v8FMA = statsV8.FORTE.acertos + statsV8.MEDIO.acertos;

console.log(`\n  v7 FORTE+MEDIO: ${v7FM} sinais, ${v7FMA} acertos (${v7FM>0?(v7FMA/v7FM*100).toFixed(1):'0'}%)`);
console.log(`  v8 FORTE+MEDIO: ${v8FM} sinais, ${v8FMA} acertos (${v8FM>0?(v8FMA/v8FM*100).toFixed(1):'0'}%)`);
console.log(`  Diferença sinais: ${v8FM - v7FM > 0 ? '+' : ''}${v8FM - v7FM}`);
console.log(`  Diferença acertos: ${v8FMA - v7FMA > 0 ? '+' : ''}${v8FMA - v7FMA}`);

// ========== ANÁLISE DOS BOOSTS ==========
console.log('\n' + '='.repeat(60));
console.log('ANÁLISE: QUAIS BOOSTS MAIS CONTRIBUEM');
console.log('='.repeat(60));

const boostStats = {};
let paresDinamicos2 = null;
let ultimaCal2 = 0;

for (let i = 300; i < numsChron.length - 1; i++) {
  if (i - ultimaCal2 >= 30 || !paresDinamicos2) {
    const {dinamicos} = calcParesDinamicos(numsChron.slice(0, i+1), 300);
    paresDinamicos2 = dinamicos;
    ultimaCal2 = i;
  }
  
  const sinal = motorV8Avaliar(numsChron, i, paresDinamicos2);
  if (sinal.nivel === 'FRIO') continue;
  
  const proximoNum = numsChron[i + 1];
  const acertou = proximoNum === 0;
  
  for (const b of (sinal.boosts || [])) {
    const bKey = b.replace(/ x[\d.]+/, '').replace(/ \+[\d.]+/, '');
    if (!boostStats[bKey]) boostStats[bKey] = {total:0, acertos:0};
    boostStats[bKey].total++;
    if (acertou) boostStats[bKey].acertos++;
  }
}

const boostArr = Object.entries(boostStats)
  .filter(([,s]) => s.total >= 5)
  .sort((a,b) => b[1].total - a[1].total);

console.log('\n  Boost             | Aparições | Acertos | Taxa');
console.log('  ' + '-'.repeat(55));
for (const [name, s] of boostArr) {
  const taxa = (s.acertos/s.total*100).toFixed(1);
  console.log(`  ${name.padEnd(18)} | ${String(s.total).padStart(9)} | ${String(s.acertos).padStart(7)} | ${taxa}%`);
}

// ========== ANÁLISE DE SECAS (dist branco) ==========
console.log('\n' + '='.repeat(60));
console.log('ANÁLISE: COMO O MOTOR SE SAI EM SECAS LONGAS');
console.log('='.repeat(60));

const secaRanges = [{min:0,max:14,label:'0-14'},{min:15,max:24,label:'15-24'},{min:25,max:34,label:'25-34'},{min:35,max:999,label:'35+'}];

for (const range of secaRanges) {
  let sinaisV7 = 0, acertosV7 = 0, sinaisV8 = 0, acertosV8 = 0;
  let paresDin = null, ulCal = 0;
  
  for (let i = 300; i < numsChron.length - 1; i++) {
    let distBranco = 0;
    for (let j = i; j >= 0; j--) {
      if (numsChron[j] === 0) { distBranco = i - j; break; }
      distBranco = i - j + 1;
    }
    
    if (distBranco < range.min || distBranco > range.max) continue;
    
    if (i - ulCal >= 30 || !paresDin) {
      const {dinamicos} = calcParesDinamicos(numsChron.slice(0, i+1), 300);
      paresDin = dinamicos;
      ulCal = i;
    }
    
    const s7 = motorV7Avaliar(numsChron, i);
    const s8 = motorV8Avaliar(numsChron, i, paresDin);
    const prox = numsChron[i+1];
    const ac = prox === 0;
    
    if (s7.nivel === 'FORTE' || s7.nivel === 'MEDIO') { sinaisV7++; if (ac) acertosV7++; }
    if (s8.nivel === 'FORTE' || s8.nivel === 'MEDIO') { sinaisV8++; if (ac) acertosV8++; }
  }
  
  const t7 = sinaisV7 > 0 ? (acertosV7/sinaisV7*100).toFixed(1) : '0';
  const t8 = sinaisV8 > 0 ? (acertosV8/sinaisV8*100).toFixed(1) : '0';
  console.log(`  Dist ${range.label.padEnd(5)}: v7 ${sinaisV7} sinais (${t7}%) | v8 ${sinaisV8} sinais (${t8}%)`);
}

// ========== PARES DINÂMICOS ENCONTRADOS ==========
console.log('\n' + '='.repeat(60));
console.log('PARES DINÂMICOS DETECTADOS (últimas 300 rodadas do dataset)');
console.log('='.repeat(60));

const {dinamicos: dinFinal} = calcParesDinamicos(numsChron, 300);
const dinArr = Object.entries(dinFinal).sort((a,b) => b[1].lift - a[1].lift).slice(0, 15);
if (dinArr.length === 0) {
  console.log('  Nenhum par dinâmico detectado');
} else {
  console.log('\n  Par       | Aparições | Brancos | Lift    | Taxa');
  console.log('  ' + '-'.repeat(55));
  for (const [par, s] of dinArr) {
    console.log(`  ${par.padEnd(10)} | ${String(s.total).padStart(9)} | ${String(s.brancos).padStart(7)} | ${s.lift.toFixed(2).padStart(7)}x | ${(s.rate*100).toFixed(1)}%`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('FIM DA ANÁLISE');
console.log('='.repeat(60));
