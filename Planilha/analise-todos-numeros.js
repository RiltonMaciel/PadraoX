const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (4).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);

const rows = raw.map(r => {
  const keys = Object.keys(r);
  const numKey = keys.find(k => /n[uú]mero|number|num/i.test(k)) || keys[0];
  return { num: parseInt(r[numKey]) };
}).filter(r => !isNaN(r.num) && r.num >= 0 && r.num <= 14);

rows.reverse(); // cronológico
const T = rows.length;
const totalBrancos = rows.filter(r => r.num === 0).length;
const BASE_RATE = totalBrancos / T;

// ========== FUNÇÕES ==========
function zScore(obs, n, p) {
  if (n === 0) return 0;
  return (obs / n - p) / Math.sqrt(p * (1 - p) / n);
}
function sig(z) {
  const az = Math.abs(z);
  if (az >= 3.29) return '***';
  if (az >= 2.58) return '**';
  if (az >= 1.96) return '*';
  return 'ns';
}

// Pré-calcular distância do último branco para cada posição
const distArr = new Array(T).fill(999);
let lastB = -1;
for (let i = 0; i < T; i++) {
  if (rows[i].num === 0) lastB = i;
  distArr[i] = lastB >= 0 ? i - lastB : 999;
}

const report = [];
function log(s) { report.push(s); }

log('# ANÁLISE COMPLETA — TODOS OS NÚMEROS (0 a 14)');
log(`\n**Dataset:** ${T} rodadas | **Brancos:** ${totalBrancos} (${(BASE_RATE * 100).toFixed(2)}%) | **Data:** ${new Date().toISOString().substring(0, 10)}`);
log(`\n**Critério de significância:** Z-score ≥ 1.96 (p < 0.05)`);
log(`\n**Regra de amostra:** Resultados com < 50 observações são marcados como inconclusivos.`);

// ========== ESTRUTURA DE RESULTADOS POR NÚMERO ==========
const numerosData = [];

for (let N = 0; N <= 14; N++) {
  const numInfo = {
    numero: N,
    freq: 0,
    freqPct: 0,
    // Branco na próxima rodada após N
    brancoApos1: { hits: 0, total: 0, rate: 0, z: 0 },
    brancoApos2: { hits: 0, total: 0, rate: 0, z: 0 },
    brancoApos3: { hits: 0, total: 0, rate: 0, z: 0 },
    brancoApos5: { hits: 0, total: 0, rate: 0, z: 0 },
    // Predecessor direto do branco
    predecessor: { count: 0, total: totalBrancos, pct: 0, z: 0 },
    // Repetição 2x/3
    rep2of3: { hits: 0, total: 0, rate: 0, z: 0 },
    // Consecutiva vs não-consecutiva
    consec: { hits: 0, total: 0, rate: 0, z: 0 },
    nonConsec: { hits: 0, total: 0, rate: 0, z: 0 },
    // Em gaps longos
    freqGapLongo: 0,
    totalGapLongo: 0,
    freqGapCurto: 0,
    totalGapCurto: 0,
    // N em dist>=35 → branco próxima
    distAlta: { hits: 0, total: 0, rate: 0, z: 0 },
    // Melhor par
    melhorPar: null,
    // Classificação
    classificacao: '',
    eficacia: 0,
    testes: []
  };

  // Frequência
  numInfo.freq = rows.filter(r => r.num === N).length;
  numInfo.freqPct = numInfo.freq / T;

  // ---- Branco após N (janelas 1, 2, 3, 5) ----
  const janelas = [
    { w: 1, key: 'brancoApos1' },
    { w: 2, key: 'brancoApos2' },
    { w: 3, key: 'brancoApos3' },
    { w: 5, key: 'brancoApos5' }
  ];
  for (const { w, key } of janelas) {
    let hits = 0, total = 0;
    for (let i = 0; i < T - w; i++) {
      if (rows[i].num === N) {
        total++;
        for (let j = 1; j <= w; j++) {
          if (rows[i + j].num === 0) { hits++; break; }
        }
      }
    }
    const espP = 1 - Math.pow(1 - BASE_RATE, w);
    numInfo[key] = { hits, total, rate: total > 0 ? hits / total : 0, z: zScore(hits, total, espP) };
  }

  // ---- Predecessor direto do branco ----
  let predCount = 0;
  for (let i = 1; i < T; i++) {
    if (rows[i].num === 0 && rows[i - 1].num === N) predCount++;
  }
  numInfo.predecessor = {
    count: predCount,
    total: totalBrancos,
    pct: predCount / totalBrancos,
    z: zScore(predCount, totalBrancos, numInfo.freqPct)
  };

  // ---- Repetição 2x/3 (só para N != 0) ----
  if (N !== 0) {
    let rHits = 0, rTotal = 0;
    for (let i = 3; i < T; i++) {
      const last3 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num];
      if (last3.filter(x => x === N).length >= 2) {
        rTotal++;
        if (rows[i].num === 0) rHits++;
      }
    }
    numInfo.rep2of3 = { hits: rHits, total: rTotal, rate: rTotal > 0 ? rHits / rTotal : 0, z: zScore(rHits, rTotal, BASE_RATE) };

    // Consecutiva vs não-consecutiva
    let cH = 0, cT = 0, ncH = 0, ncT = 0;
    for (let i = 3; i < T; i++) {
      const last3 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num];
      if (last3.filter(x => x === N).length >= 2) {
        if (rows[i - 1].num === N && rows[i - 2].num === N) {
          cT++; if (rows[i].num === 0) cH++;
        } else {
          ncT++; if (rows[i].num === 0) ncH++;
        }
      }
    }
    numInfo.consec = { hits: cH, total: cT, rate: cT > 0 ? cH / cT : 0, z: zScore(cH, cT, BASE_RATE) };
    numInfo.nonConsec = { hits: ncH, total: ncT, rate: ncT > 0 ? ncH / ncT : 0, z: zScore(ncH, ncT, BASE_RATE) };
  }

  // ---- Gaps longos ----
  let n_gapL = 0, t_gapL = 0, n_gapC = 0, t_gapC = 0;
  for (let i = 0; i < T; i++) {
    if (rows[i].num === 0) continue;
    if (distArr[i] > 20) { t_gapL++; if (rows[i].num === N) n_gapL++; }
    else { t_gapC++; if (rows[i].num === N) n_gapC++; }
  }
  numInfo.freqGapLongo = n_gapL;
  numInfo.totalGapLongo = t_gapL;
  numInfo.freqGapCurto = n_gapC;
  numInfo.totalGapCurto = t_gapC;

  // N em dist>=35 → branco na próxima
  let dHits = 0, dTot = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === N && distArr[i] >= 35) {
      dTot++;
      if (rows[i + 1].num === 0) dHits++;
    }
  }
  numInfo.distAlta = { hits: dHits, total: dTot, rate: dTot > 0 ? dHits / dTot : 0, z: zScore(dHits, dTot, BASE_RATE) };

  // ---- Melhor par (N+X nas últimas 4) ----
  if (N !== 0) {
    let bestPar = null;
    for (let partner = 0; partner <= 14; partner++) {
      if (partner === N) continue;
      let pH = 0, pT = 0;
      for (let i = 4; i < T; i++) {
        const last4 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num, rows[i - 4].num];
        if (last4.includes(N) && last4.includes(partner)) {
          pT++;
          if (rows[i].num === 0) pH++;
        }
      }
      const pRate = pT > 0 ? pH / pT : 0;
      const pZ = zScore(pH, pT, BASE_RATE);
      if (!bestPar || pZ > bestPar.z) {
        bestPar = { partner, hits: pH, total: pT, rate: pRate, z: pZ };
      }
    }
    numInfo.melhorPar = bestPar;
  }

  // ---- CÁLCULO DE EFICÁCIA (0-100%) ----
  // Baseado exclusivamente nos dados: conta quantos testes mostram desvio significativo
  const testes = [];

  // Teste 1: Branco após N (+1 rodada)
  testes.push({
    nome: 'Branco +1 rod após N',
    z: numInfo.brancoApos1.z,
    n: numInfo.brancoApos1.total,
    valor: `${(numInfo.brancoApos1.rate * 100).toFixed(1)}%`,
    significativo: Math.abs(numInfo.brancoApos1.z) >= 1.96 && numInfo.brancoApos1.total >= 30
  });

  // Teste 2: Branco +3 rod
  testes.push({
    nome: 'Branco +3 rod após N',
    z: numInfo.brancoApos3.z,
    n: numInfo.brancoApos3.total,
    valor: `${(numInfo.brancoApos3.rate * 100).toFixed(1)}%`,
    significativo: Math.abs(numInfo.brancoApos3.z) >= 1.96 && numInfo.brancoApos3.total >= 30
  });

  // Teste 3: Predecessor
  testes.push({
    nome: 'Predecessor do branco',
    z: numInfo.predecessor.z,
    n: numInfo.predecessor.total,
    valor: `${(numInfo.predecessor.pct * 100).toFixed(1)}%`,
    significativo: Math.abs(numInfo.predecessor.z) >= 1.96
  });

  // Teste 4: Repetição 2x/3
  if (N !== 0) {
    testes.push({
      nome: 'Repetição 2x/3 → branco',
      z: numInfo.rep2of3.z,
      n: numInfo.rep2of3.total,
      valor: numInfo.rep2of3.total > 0 ? `${(numInfo.rep2of3.rate * 100).toFixed(1)}%` : 'N/A',
      significativo: Math.abs(numInfo.rep2of3.z) >= 1.96 && numInfo.rep2of3.total >= 20
    });
  }

  // Teste 5: Em gap longo + branco
  testes.push({
    nome: 'Em dist≥35 → branco',
    z: numInfo.distAlta.z,
    n: numInfo.distAlta.total,
    valor: numInfo.distAlta.total > 0 ? `${(numInfo.distAlta.rate * 100).toFixed(1)}%` : 'N/A',
    significativo: Math.abs(numInfo.distAlta.z) >= 1.96 && numInfo.distAlta.total >= 10
  });

  // Teste 6: Melhor par
  if (numInfo.melhorPar) {
    testes.push({
      nome: `Melhor par (${N}+${numInfo.melhorPar.partner})`,
      z: numInfo.melhorPar.z,
      n: numInfo.melhorPar.total,
      valor: numInfo.melhorPar.total > 0 ? `${(numInfo.melhorPar.rate * 100).toFixed(1)}%` : 'N/A',
      significativo: Math.abs(numInfo.melhorPar.z) >= 1.96 && numInfo.melhorPar.total >= 20
    });
  }

  numInfo.testes = testes;

  // Eficácia = % dos testes que são significativos (com peso por Z-score)
  const testesValidos = testes.filter(t => t.n >= 10);
  const testesSignificativos = testesValidos.filter(t => t.significativo);
  
  if (testesValidos.length === 0) {
    numInfo.eficacia = 0;
  } else {
    // Componente 1: proporção de testes significativos (0 a 50%)
    const propSig = testesSignificativos.length / testesValidos.length * 50;
    
    // Componente 2: força do maior Z-score encontrado (0 a 50%)
    const maxZ = Math.max(...testesValidos.map(t => Math.abs(t.z)), 0);
    const forcaZ = Math.min(maxZ / 3.29, 1) * 50; // 3.29 = Z para p<0.001
    
    numInfo.eficacia = Math.round(propSig + forcaZ);
  }

  // Classificação
  const afterZ = numInfo.brancoApos1.z;
  const afterRate = numInfo.brancoApos1.rate;
  if (afterZ >= 1.96) numInfo.classificacao = '🔥 INDICADOR DE BRANCO';
  else if (afterZ >= 1.0) numInfo.classificacao = '⚡ Tendência positiva (não significativa)';
  else if (afterZ <= -1.96) numInfo.classificacao = '🛡️ BLOQUEADOR';
  else if (afterZ <= -1.0) numInfo.classificacao = '⚡ Tendência bloqueio (não significativa)';
  else numInfo.classificacao = '⚪ NEUTRO';

  // Ajustar classificação se repetição ou par forem fortes
  if (N !== 0 && numInfo.rep2of3.total >= 20 && numInfo.rep2of3.z >= 1.96) {
    numInfo.classificacao += ' + 🔄 REPETIÇÃO FORTE';
  }
  if (numInfo.melhorPar && numInfo.melhorPar.total >= 20 && numInfo.melhorPar.z >= 1.96) {
    numInfo.classificacao += ' + 🤝 PAR FORTE';
  }

  numerosData.push(numInfo);
}

// ========================================================
// GERAR RELATÓRIO
// ========================================================

// ---- TABELA RESUMO GERAL ----
log(`\n---\n\n## TABELA RESUMO — TODOS OS NÚMEROS\n`);
log(`| # | Freq | Branco +1 | Z | Branco +3 | Z | Predecessor | Z | Rep 2x/3 | Z | Classif. | Eficácia |`);
log(`|---|------|-----------|---|-----------|---|-------------|---|----------|---|----------|----------|`);

for (const n of numerosData) {
  const b1 = `${(n.brancoApos1.rate * 100).toFixed(1)}%`;
  const b3 = `${(n.brancoApos3.rate * 100).toFixed(1)}%`;
  const pred = `${(n.predecessor.pct * 100).toFixed(1)}%`;
  const rep = n.numero === 0 ? '-' : (n.rep2of3.total > 0 ? `${(n.rep2of3.rate * 100).toFixed(1)}% (${n.rep2of3.total})` : '0 casos');
  const repZ = n.numero === 0 ? '-' : n.rep2of3.z.toFixed(2);
  log(`| **${n.numero}** | ${n.freq} (${(n.freqPct * 100).toFixed(1)}%) | ${b1} | ${n.brancoApos1.z.toFixed(2)} | ${b3} | ${n.brancoApos3.z.toFixed(2)} | ${pred} | ${n.predecessor.z.toFixed(2)} | ${rep} | ${repZ} | ${n.classificacao} | **${n.eficacia}%** |`);
}

// ---- DETALHADO POR NÚMERO ----
for (const n of numerosData) {
  log(`\n---\n\n## Número ${n.numero} ${n.numero === 0 ? '(BRANCO)' : n.numero <= 7 ? '(Vermelho)' : '(Preto)'}`);
  log(`\n**Frequência:** ${n.freq}/${T} (${(n.freqPct * 100).toFixed(2)}%) | **Classificação:** ${n.classificacao} | **Eficácia:** ${n.eficacia}%\n`);

  // Branco após N
  log(`### Branco após o número ${n.numero}\n`);
  log(`| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |`);
  log(`|--------|-----------|---------|------|----------|---------|-----|`);
  const jData = [
    { label: '+1 rod', d: n.brancoApos1 },
    { label: '+2 rod', d: n.brancoApos2 },
    { label: '+3 rod', d: n.brancoApos3 },
    { label: '+5 rod', d: n.brancoApos5 }
  ];
  for (const j of jData) {
    const espP = j.label === '+1 rod' ? BASE_RATE :
      j.label === '+2 rod' ? 1 - Math.pow(1 - BASE_RATE, 2) :
        j.label === '+3 rod' ? 1 - Math.pow(1 - BASE_RATE, 3) :
          1 - Math.pow(1 - BASE_RATE, 5);
    log(`| ${j.label} | ${j.d.total} | ${j.d.hits} | ${(j.d.rate * 100).toFixed(1)}% | ${(espP * 100).toFixed(1)}% | ${j.d.z.toFixed(2)} | ${sig(j.d.z)} |`);
  }

  // Predecessor
  log(`\n**Predecessor direto do branco:** ${n.predecessor.count}/${n.predecessor.total} (${(n.predecessor.pct * 100).toFixed(1)}%), esperado ${(n.freqPct * 100).toFixed(1)}%, Z=${n.predecessor.z.toFixed(2)} (${sig(n.predecessor.z)})`);

  // Repetição (não para o 0)
  if (n.numero !== 0) {
    log(`\n### Repetição 2x nas últimas 3\n`);
    if (n.rep2of3.total === 0) {
      log(`Nenhum caso de repetição 2x/3 encontrado.`);
    } else {
      log(`| Métrica | Valor |`);
      log(`|---------|-------|`);
      log(`| Situações | ${n.rep2of3.total} |`);
      log(`| Brancos | ${n.rep2of3.hits} |`);
      log(`| Taxa | ${(n.rep2of3.rate * 100).toFixed(1)}% |`);
      log(`| Z-score | ${n.rep2of3.z.toFixed(2)} (${sig(n.rep2of3.z)}) |`);
      log(`| Amostra ≥50? | ${n.rep2of3.total >= 50 ? 'SIM' : 'NÃO (' + n.rep2of3.total + ') — inconclusivo'} |`);

      if (n.consec.total > 0 || n.nonConsec.total > 0) {
        log(`\n**Consecutiva vs Não-consecutiva:**`);
        log(`| Tipo | Casos | Brancos | Taxa | Z | Sig |`);
        log(`|------|-------|---------|------|---|-----|`);
        log(`| Consecutiva | ${n.consec.total} | ${n.consec.hits} | ${n.consec.total > 0 ? (n.consec.rate * 100).toFixed(1) + '%' : 'N/A'} | ${n.consec.z.toFixed(2)} | ${sig(n.consec.z)} |`);
        log(`| Não-consec. | ${n.nonConsec.total} | ${n.nonConsec.hits} | ${n.nonConsec.total > 0 ? (n.nonConsec.rate * 100).toFixed(1) + '%' : 'N/A'} | ${n.nonConsec.z.toFixed(2)} | ${sig(n.nonConsec.z)} |`);
      }
    }
  }

  // Gaps longos
  log(`\n### Comportamento em gaps longos\n`);
  const pctGL = n.totalGapLongo > 0 ? (n.freqGapLongo / n.totalGapLongo * 100).toFixed(1) : 'N/A';
  const pctGC = n.totalGapCurto > 0 ? (n.freqGapCurto / n.totalGapCurto * 100).toFixed(1) : 'N/A';
  log(`| Contexto | Rodadas | Aparições | % | Freq geral |`);
  log(`|----------|---------|-----------|---|------------|`);
  log(`| Gap > 20 | ${n.totalGapLongo} | ${n.freqGapLongo} | ${pctGL}% | ${(n.freqPct * 100).toFixed(1)}% |`);
  log(`| Gap ≤ 20 | ${n.totalGapCurto} | ${n.freqGapCurto} | ${pctGC}% | ${(n.freqPct * 100).toFixed(1)}% |`);

  if (n.distAlta.total > 0) {
    log(`\n**Em dist≥35 → branco na próxima:** ${n.distAlta.hits}/${n.distAlta.total} = ${(n.distAlta.rate * 100).toFixed(1)}%, Z=${n.distAlta.z.toFixed(2)} (${sig(n.distAlta.z)})${n.distAlta.total < 10 ? ' ⚠️ amostra muito pequena' : ''}`);
  } else {
    log(`\n**Em dist≥35:** Nenhuma aparição neste contexto.`);
  }

  // Melhor par
  if (n.melhorPar) {
    log(`\n### Melhor par\n`);
    log(`**${n.numero}+${n.melhorPar.partner}** nas últimas 4: ${n.melhorPar.hits}/${n.melhorPar.total} = ${(n.melhorPar.rate * 100).toFixed(1)}%, Z=${n.melhorPar.z.toFixed(2)} (${sig(n.melhorPar.z)})${n.melhorPar.total < 50 ? ' ⚠️ amostra <50' : ''}`);
  }

  // Testes individuais
  log(`\n### Bateria de testes\n`);
  log(`| Teste | Valor | Amostra | Z-score | Significativo? |`);
  log(`|-------|-------|---------|---------|----------------|`);
  for (const t of n.testes) {
    const amWarn = t.n < 50 ? ` ⚠️` : '';
    log(`| ${t.nome} | ${t.valor} | ${t.n}${amWarn} | ${t.z.toFixed(2)} (${sig(t.z)}) | ${t.significativo ? '✅ SIM' : '❌ NÃO'} |`);
  }
}

// ========== RANKING DE EFICÁCIA ==========
log(`\n---\n\n## RANKING DE EFICÁCIA — TODOS OS NÚMEROS\n`);
log(`> Eficácia = combinação de (1) proporção de testes estatisticamente significativos e (2) força do maior Z-score encontrado. Escala: 0% = nenhum sinal útil, 100% = todos os testes significativos com Z > 3.29.\n`);

const ranking = [...numerosData].sort((a, b) => b.eficacia - a.eficacia);
log(`| Rank | Número | Eficácia | Classificação | Detalhe chave |`);
log(`|------|--------|----------|---------------|---------------|`);
let rank = 1;
for (const n of ranking) {
  // Detalhe chave: o teste mais forte
  let detalhe = 'Nenhum sinal significativo';
  const melhorTeste = n.testes.filter(t => t.n >= 10).sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];
  if (melhorTeste) {
    detalhe = `${melhorTeste.nome}: ${melhorTeste.valor}, Z=${melhorTeste.z.toFixed(2)}`;
  }
  const bar = '█'.repeat(Math.round(n.eficacia / 5)) + '░'.repeat(20 - Math.round(n.eficacia / 5));
  log(`| ${rank} | **${n.numero}** ${n.numero === 0 ? '(branco)' : n.numero <= 7 ? '(verm)' : '(preto)'} | **${n.eficacia}%** ${bar} | ${n.classificacao} | ${detalhe} |`);
  rank++;
}

// ========== CONCLUSÃO GERAL ==========
log(`\n---\n\n## CONCLUSÃO GERAL\n`);

const sigCount = numerosData.filter(n => n.testes.some(t => t.significativo)).length;
const totalTestes = numerosData.reduce((acc, n) => acc + n.testes.filter(t => t.n >= 10).length, 0);
const totalSig = numerosData.reduce((acc, n) => acc + n.testes.filter(t => t.significativo).length, 0);

log(`### Estatísticas globais\n`);
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Total de números analisados | 15 (0 a 14) |`);
log(`| Total de testes realizados (amostra ≥10) | ${totalTestes} |`);
log(`| Testes com significância (Z≥1.96) | ${totalSig} (${(totalSig / totalTestes * 100).toFixed(1)}%) |`);
log(`| Números com pelo menos 1 teste significativo | ${sigCount}/15 |`);
log(`| Números sem NENHUM sinal | ${15 - sigCount}/15 |`);

log(`\n### Eficácia geral da análise por número individual\n`);
const eficaciaMedia = numerosData.reduce((a, n) => a + n.eficacia, 0) / numerosData.length;
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Eficácia média | **${eficaciaMedia.toFixed(1)}%** |`);
log(`| Eficácia máxima | ${Math.max(...numerosData.map(n => n.eficacia))}% (número ${ranking[0].numero}) |`);
log(`| Eficácia mínima | ${Math.min(...numerosData.map(n => n.eficacia))}% |`);

// Veredicto
log(`\n### Veredicto final\n`);
if (eficaciaMedia < 20) {
  log(`🔴 **EFICÁCIA BAIXA (${eficaciaMedia.toFixed(0)}%)**: Com este dataset de ${T} rodadas, a maioria dos números individuais NÃO mostra influência estatisticamente significativa sobre o branco. Os padrões do V3/V4 baseados em números individuais provavelmente eram overfitting.`);
} else if (eficaciaMedia < 40) {
  log(`🟡 **EFICÁCIA MODERADA (${eficaciaMedia.toFixed(0)}%)**: Alguns números mostram sinais, mas a maioria é ruído. Usar com cautela e apenas os que têm Z≥1.96.`);
} else {
  log(`🟢 **EFICÁCIA ALTA (${eficaciaMedia.toFixed(0)}%)**: Vários números mostram influência mensurável. Vale explorar no novo motor.`);
}

log(`\n### Números que merecem atenção no novo motor\n`);
const merecedores = ranking.filter(n => n.eficacia >= 20 || n.testes.some(t => t.significativo));
if (merecedores.length === 0) {
  log(`Nenhum número atingiu o limiar de eficácia para inclusão no motor.`);
} else {
  for (const n of merecedores) {
    const sigTestes = n.testes.filter(t => t.significativo);
    log(`- **Número ${n.numero}** (${n.eficacia}%): ${sigTestes.length > 0 ? sigTestes.map(t => `${t.nome} Z=${t.z.toFixed(2)}`).join(', ') : 'Z-scores altos mas abaixo de 1.96'}`);
  }
}

log(`\n### O que os dados dizem vs o que o V4 usava\n`);
log(`| Regra do V4 | Status neste dataset |`);
log(`|-------------|---------------------|`);

// Checar par 11+12
let par1112_h = 0, par1112_t = 0;
for (let i = 4; i < T; i++) {
  const last4 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num, rows[i - 4].num];
  if (last4.includes(11) && last4.includes(12)) {
    par1112_t++;
    if (rows[i].num === 0) par1112_h++;
  }
}
const par1112_z = zScore(par1112_h, par1112_t, BASE_RATE);
log(`| Par 11+12 nas últimas 4 (V4: 11.4%) | ${par1112_t > 0 ? (par1112_h / par1112_t * 100).toFixed(1) : 0}% (${par1112_h}/${par1112_t}), Z=${par1112_z.toFixed(2)} (${sig(par1112_z)}) |`);

// Checar dist>=35
let dist35_h = 0, dist35_t = 0;
for (let i = 0; i < T - 1; i++) {
  if (distArr[i] >= 35) {
    dist35_t++;
    if (rows[i + 1].num === 0) dist35_h++;
  }
}
const dist35_z = zScore(dist35_h, dist35_t, BASE_RATE);
log(`| Distância ≥35 (V4: 8.6%) | ${dist35_t > 0 ? (dist35_h / dist35_t * 100).toFixed(1) : 0}% (${dist35_h}/${dist35_t}), Z=${dist35_z.toFixed(2)} (${sig(dist35_z)}) |`);

// Checar rep 1
const n1data = numerosData.find(n => n.numero === 1);
log(`| Repetição do 1 2x/3 (V4: 12.0%) | ${n1data.rep2of3.total > 0 ? (n1data.rep2of3.rate * 100).toFixed(1) : 0}% (${n1data.rep2of3.hits}/${n1data.rep2of3.total}), Z=${n1data.rep2of3.z.toFixed(2)} (${sig(n1data.rep2of3.z)}) |`);

log(`\n---\n*Relatório gerado em ${new Date().toISOString()}*`);
log(`*Dataset: ${T} rodadas | Base rate: ${(BASE_RATE * 100).toFixed(2)}% | Testes: ${totalTestes} | Significativos: ${totalSig}*`);

// ========== SALVAR ==========
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'RELATORIO-COMPLETO-TODOS-NUMEROS.md'), output, 'utf-8');
console.log(output);
console.log('\n\n✅ Relatório salvo em: RELATORIO-COMPLETO-TODOS-NUMEROS.md');
