/**
 * CURADORIA: Acertividade do Motor Adaptativo em relação ao Branco
 * 
 * Perguntas respondidas:
 * 1. Quando o motor disse APOSTAR e veio branco? (Precisão)
 * 2. Quando o branco veio, o motor tinha sinal? (Recall/Cobertura)
 * 3. De todos os brancos, quantos o motor "pegou"?
 * 4. Análise por força de sinal
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const MotorAdaptativo = require('./motor-adaptativo');

// ========== CARREGAR ==========
const wb = XLSX.readFile(path.join(__dirname, '..', 'Planilha', 'tipminer-dados-blaze-double (4).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);
const keys = Object.keys(raw[0]);
const numKey = keys.find(k => /n[uú]mero|number|num/i.test(k)) || keys[0];
const allNums = raw.map(r => parseInt(r[numKey])).filter(n => !isNaN(n) && n >= 0 && n <= 14);
allNums.reverse();

const T = allNums.length;
const JANELA = 500;
const RECALIBRAR = 50;
const BASE = allNums.filter(n => n === 0).length / T;

// ========== SIMULAR ==========
let motor = null;
let ultimaCal = 0;

// Categorias de resultado
const matriz = {
  apostar_branco: [],    // Motor disse APOSTAR e veio branco (TRUE POSITIVE)
  apostar_nao: [],       // Motor disse APOSTAR e NÃO veio branco (FALSE POSITIVE)
  nao_apostar_branco: [],// Motor NÃO disse APOSTAR e veio branco (FALSE NEGATIVE / branco perdido)
  nao_apostar_nao: []    // Motor NÃO disse APOSTAR e NÃO veio branco (TRUE NEGATIVE)
};

// Detalhes por score
const porScore = {};  // score arredondado → { apostas, acertos }
const porSinais = {}; // qtd sinais → { apostas, acertos }

// Detalhes dos acertos
const acertosDetalhe = [];
const brancosPerdidos = [];

for (let i = JANELA; i < T; i++) {
  const historico = allNums.slice(0, i);
  const resultado = allNums[i];

  if (!motor || i - ultimaCal >= RECALIBRAR) {
    motor = new MotorAdaptativo(historico, { janela: JANELA, zMinimo: 1.96, amostraMinima: 15 });
    motor.calibrar();
    ultimaCal = i;
  } else {
    motor.historico = historico;
  }

  const sinal = motor.avaliar();
  const apostou = sinal.decisao === 'APOSTAR';
  const veioBranco = resultado === 0;

  if (apostou && veioBranco) {
    matriz.apostar_branco.push(i);
    acertosDetalhe.push({
      rodada: i,
      score: sinal.score,
      sinais: sinal.sinaisAtivos.length,
      descricao: sinal.sinaisAtivos.map(s => s.descricao).join(' | ')
    });
  } else if (apostou && !veioBranco) {
    matriz.apostar_nao.push(i);
  } else if (!apostou && veioBranco) {
    matriz.nao_apostar_branco.push(i);
    brancosPerdidos.push({
      rodada: i,
      decisao: sinal.decisao,
      score: sinal.score,
      sinais: sinal.sinaisAtivos.length
    });
  } else {
    matriz.nao_apostar_nao.push(i);
  }

  // Por score
  if (apostou) {
    const scoreKey = Math.round(sinal.score * 10) / 10;
    if (!porScore[scoreKey]) porScore[scoreKey] = { apostas: 0, acertos: 0 };
    porScore[scoreKey].apostas++;
    if (veioBranco) porScore[scoreKey].acertos++;

    const sinaisKey = sinal.sinaisAtivos.length;
    if (!porSinais[sinaisKey]) porSinais[sinaisKey] = { apostas: 0, acertos: 0 };
    porSinais[sinaisKey].apostas++;
    if (veioBranco) porSinais[sinaisKey].acertos++;
  }
}

// ========== RELATÓRIO ==========
const report = [];
function log(s) { report.push(s); console.log(s); }

const TP = matriz.apostar_branco.length;
const FP = matriz.apostar_nao.length;
const FN = matriz.nao_apostar_branco.length;
const TN = matriz.nao_apostar_nao.length;

const precisao = TP / (TP + FP); // quando apostou, % de acerto
const recall = TP / (TP + FN);   // dos brancos, % que pegou
const f1 = 2 * precisao * recall / (precisao + recall);
const totalBrancos = TP + FN;

log('# CURADORIA — ACERTIVIDADE DO MOTOR ADAPTATIVO');
log(`\n**Dataset:** ${T} rodadas | **Janela:** ${JANELA} | **Rodadas avaliadas:** ${T - JANELA}`);
log(`\n**Total de brancos no período:** ${totalBrancos} | **Base rate:** ${(BASE * 100).toFixed(2)}%`);

log(`\n---\n\n## 1. MATRIZ DE CONFUSÃO\n`);
log(`|  | Veio Branco | Não veio Branco | Total |`);
log(`|--|-------------|-----------------|-------|`);
log(`| **Motor: APOSTAR** | ✅ ${TP} (acertos) | ❌ ${FP} (erros) | ${TP + FP} |`);
log(`| **Motor: NÃO apostar** | 😢 ${FN} (brancos perdidos) | ✅ ${TN} (correto) | ${FN + TN} |`);
log(`| **Total** | ${totalBrancos} brancos | ${FP + TN} não-brancos | ${T - JANELA} |`);

log(`\n---\n\n## 2. MÉTRICAS DE ACERTIVIDADE\n`);
log(`| Métrica | Valor | O que significa |`);
log(`|---------|-------|-----------------|`);
log(`| **Precisão** | **${(precisao * 100).toFixed(2)}%** | De cada 100 vezes que o motor disse "APOSTAR", ${(precisao * 100).toFixed(1)} veio branco |`);
log(`| **Recall (Cobertura)** | **${(recall * 100).toFixed(2)}%** | De ${totalBrancos} brancos que aconteceram, o motor "pegou" ${TP} (${(recall * 100).toFixed(1)}%) |`);
log(`| **F1-Score** | **${(f1 * 100).toFixed(2)}%** | Equilíbrio entre precisão e cobertura |`);
log(`| **Brancos perdidos** | **${FN}** de ${totalBrancos} | ${(FN / totalBrancos * 100).toFixed(1)}% dos brancos passaram sem sinal |`);
log(`| **Falsos alarmes** | **${FP}** de ${TP + FP} apostas | ${(FP / (TP + FP) * 100).toFixed(1)}% das apostas erraram |`);
log(`| **Base rate (aleatório)** | ${(BASE * 100).toFixed(2)}% | Se apostasse TODAS as rodadas |`);
log(`| **Break-even** | 7.14% | Mínimo para lucrar (1/14) |`);

log(`\n### Interpretação\n`);
if (precisao > 0.0714) {
  log(`✅ **Precisão ACIMA do break-even** (${(precisao * 100).toFixed(2)}% > 7.14%) — se ajustarmos seletividade, pode lucrar.`);
} else {
  log(`❌ **Precisão ABAIXO do break-even** (${(precisao * 100).toFixed(2)}% < 7.14%) — motor não filtra bem o suficiente.`);
}
if (recall > 0.10) {
  log(`✅ **Cobertura razoável** — pega ${(recall * 100).toFixed(1)}% dos brancos.`);
} else {
  log(`⚠️ **Cobertura baixa** — pega apenas ${(recall * 100).toFixed(1)}% dos brancos.`);
}

log(`\n---\n\n## 3. PRECISÃO POR FORÇA DO SINAL\n`);
log(`### Por Score\n`);
log(`| Score | Apostas | Acertos | Precisão | vs Break-even |`);
log(`|-------|---------|---------|----------|---------------|`);
const scoreKeys = Object.keys(porScore).map(Number).sort((a, b) => b - a);
for (const sk of scoreKeys) {
  const d = porScore[sk];
  const p = d.acertos / d.apostas;
  const vs = p >= 0.0714 ? '✅' : '❌';
  log(`| ${sk.toFixed(1)} | ${d.apostas} | ${d.acertos} | **${(p * 100).toFixed(1)}%** | ${vs} |`);
}

log(`\n### Por Quantidade de Sinais Ativos\n`);
log(`| Sinais ativos | Apostas | Acertos | Precisão | vs Break-even |`);
log(`|---------------|---------|---------|----------|---------------|`);
const sinaisKeys = Object.keys(porSinais).map(Number).sort((a, b) => b - a);
for (const sk of sinaisKeys) {
  const d = porSinais[sk];
  const p = d.acertos / d.apostas;
  const vs = p >= 0.0714 ? '✅' : '❌';
  log(`| ${sk} sinal(is) | ${d.apostas} | ${d.acertos} | **${(p * 100).toFixed(1)}%** | ${vs} |`);
}

// Melhor filtro
log(`\n### Melhor filtro encontrado\n`);
let melhorFiltro = null;
let melhorROI = -Infinity;

// Testar por score mínimo
for (let minScore = 1.0; minScore <= 4.0; minScore += 0.5) {
  let apost = 0, acert = 0;
  for (const sk of scoreKeys) {
    if (sk >= minScore) {
      apost += porScore[sk].apostas;
      acert += porScore[sk].acertos;
    }
  }
  if (apost >= 20) {
    const prec = acert / apost;
    const roi = (prec * 14 - 1) * 100;
    if (roi > melhorROI) {
      melhorROI = roi;
      melhorFiltro = { tipo: `Score ≥ ${minScore}`, apostas: apost, acertos: acert, precisao: prec, roi };
    }
  }
}

// Testar por sinais mínimos
for (let minSinais = 1; minSinais <= 4; minSinais++) {
  let apost = 0, acert = 0;
  for (const sk of sinaisKeys) {
    if (sk >= minSinais) {
      apost += porSinais[sk].apostas;
      acert += porSinais[sk].acertos;
    }
  }
  if (apost >= 20) {
    const prec = acert / apost;
    const roi = (prec * 14 - 1) * 100;
    if (roi > melhorROI) {
      melhorROI = roi;
      melhorFiltro = { tipo: `≥${minSinais} sinais`, apostas: apost, acertos: acert, precisao: prec, roi };
    }
  }
}

if (melhorFiltro) {
  log(`| Filtro | Apostas | Acertos | Precisão | ROI |`);
  log(`|--------|---------|---------|----------|-----|`);
  log(`| **${melhorFiltro.tipo}** | ${melhorFiltro.apostas} | ${melhorFiltro.acertos} | **${(melhorFiltro.precisao * 100).toFixed(1)}%** | **${melhorFiltro.roi > 0 ? '+' : ''}${melhorFiltro.roi.toFixed(1)}%** |`);
  if (melhorFiltro.roi > 0) {
    log(`\n✅ **Encontrado filtro LUCRATIVO!** Com "${melhorFiltro.tipo}", a precisão sobe para ${(melhorFiltro.precisao * 100).toFixed(1)}% e o ROI é positivo.`);
  } else {
    log(`\n⚠️ Melhor filtro ainda não é lucrativo (ROI ${melhorFiltro.roi.toFixed(1)}%), mas reduz perda.`);
  }
} else {
  log(`Nenhum filtro com amostra ≥20 encontrado.`);
}

log(`\n---\n\n## 4. DETALHE DOS ACERTOS (quando o motor disse APOSTAR e veio branco)\n`);
if (acertosDetalhe.length === 0) {
  log(`Nenhum acerto registrado.`);
} else {
  log(`| # | Rodada | Score | Sinais | Padrões ativos |`);
  log(`|---|--------|-------|--------|----------------|`);
  for (let i = 0; i < acertosDetalhe.length; i++) {
    const a = acertosDetalhe[i];
    log(`| ${i + 1} | ${a.rodada} | ${a.score.toFixed(1)} | ${a.sinais} | ${a.descricao || '-'} |`);
  }
}

log(`\n---\n\n## 5. BRANCOS PERDIDOS (motor não tinha sinal)\n`);
log(`\nTotal: ${FN} brancos perdidos de ${totalBrancos} (${(FN / totalBrancos * 100).toFixed(1)}%)\n`);

// Agrupar por decisão
const porDecisao = {};
for (const b of brancosPerdidos) {
  const d = b.decisao;
  if (!porDecisao[d]) porDecisao[d] = 0;
  porDecisao[d]++;
}
log(`| Decisão do motor | Brancos perdidos |`);
log(`|------------------|-----------------|`);
for (const [d, c] of Object.entries(porDecisao).sort((a, b) => b[1] - a[1])) {
  log(`| ${d} | ${c} (${(c / FN * 100).toFixed(1)}%) |`);
}

// Score dos brancos perdidos
log(`\n### Score que o motor tinha quando o branco veio (e não apostou)\n`);
const scoresBP = brancosPerdidos.map(b => b.score);
const scoresDist = {};
for (const s of scoresBP) {
  const k = Math.round(s * 10) / 10;
  scoresDist[k] = (scoresDist[k] || 0) + 1;
}
log(`| Score | Brancos perdidos | % do total perdido |`);
log(`|-------|-----------------|-------------------|`);
for (const [s, c] of Object.entries(scoresDist).sort((a, b) => Number(b[0]) - Number(a[0]))) {
  log(`| ${s} | ${c} | ${(c / FN * 100).toFixed(1)}% |`);
}

// ========== RESUMO FINAL ==========
log(`\n---\n\n## 6. RESUMO FINAL DE ACERTIVIDADE\n`);
log(`| Pergunta | Resposta |`);
log(`|----------|---------|`);
log(`| Quando o motor diz APOSTAR, acerta? | **${(precisao * 100).toFixed(1)}%** das vezes (${TP}/${TP + FP}) |`);
log(`| Dos brancos que vieram, o motor previu quantos? | **${(recall * 100).toFixed(1)}%** (${TP} de ${totalBrancos}) |`);
log(`| O motor é melhor que apostar aleatório? | ${precisao > BASE ? '✅ Sim' : '❌ Não'} (${(precisao * 100).toFixed(1)}% vs ${(BASE * 100).toFixed(1)}%) |`);
log(`| O motor é lucrativo? | ${precisao > 0.0714 ? '✅ Sim' : '❌ Não'} (precisa >7.14%, tem ${(precisao * 100).toFixed(1)}%) |`);
if (melhorFiltro && melhorFiltro.roi > 0) {
  log(`| Existe filtro que torna lucrativo? | ✅ **${melhorFiltro.tipo}** → ${(melhorFiltro.precisao * 100).toFixed(1)}% precisão, ROI ${melhorFiltro.roi.toFixed(1)}% |`);
} else {
  log(`| Existe filtro que torna lucrativo? | ❌ Nenhum filtro testado atinge ROI positivo |`);
}

log(`\n---\n*Curadoria gerada em ${new Date().toISOString()}*`);

// Salvar
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'CURADORIA-ACERTIVIDADE.md'), output, 'utf-8');
console.log('\n✅ Relatório salvo em: Motor_novo/CURADORIA-ACERTIVIDADE.md');
