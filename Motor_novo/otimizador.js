/**
 * OTIMIZADOR COMPLETO — Testa todas as combinações e calcula eficácia 1-100%
 * 
 * Eficácia (1-100%):
 *   0%  = apostar aleatório (base rate 6.65%)
 *  50%  = break-even (7.14%, lucro zero)
 * 100%  = taxa de 14% (dobro do break-even, ROI ~100%)
 * 
 * Componentes da eficácia:
 *  - Precisão (quando aposta, acerta?)
 *  - Cobertura (pega quantos brancos?)
 *  - Lucratividade (ROI)
 *  - Consistência (funciona em todas as janelas?)
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
const BASE_RATE = allNums.filter(n => n === 0).length / T;
const BREAK_EVEN = 1 / 14;

console.log(`Dataset: ${T} rodadas | Base: ${(BASE_RATE * 100).toFixed(2)}% | Break-even: ${(BREAK_EVEN * 100).toFixed(2)}%`);

// ========== CALCULAR EFICÁCIA 1-100% ==========
function calcEficacia(precisao, recall, roi, consistencia, apostas) {
  // Se não tem apostas suficientes, eficácia 0
  if (apostas < 20) return 0;

  // Componente 1: Precisão (0-40 pontos)
  // 0% em base_rate, 20 pontos no break-even, 40 pontos em 14%
  let precPontos = 0;
  if (precisao <= BASE_RATE) {
    precPontos = 0;
  } else if (precisao <= BREAK_EVEN) {
    precPontos = ((precisao - BASE_RATE) / (BREAK_EVEN - BASE_RATE)) * 20;
  } else if (precisao <= 0.14) {
    precPontos = 20 + ((precisao - BREAK_EVEN) / (0.14 - BREAK_EVEN)) * 20;
  } else {
    precPontos = 40;
  }

  // Componente 2: Cobertura/Recall (0-20 pontos)
  // 0% recall = 0, 5% = 10 pontos, 10%+ = 20 pontos
  let recPontos = Math.min(recall / 0.10, 1) * 20;

  // Componente 3: ROI (0-25 pontos)
  // ROI negativo = 0, ROI 0 = 5, ROI 50% = 15, ROI 100%+ = 25
  let roiPontos = 0;
  if (roi <= -100) roiPontos = 0;
  else if (roi <= 0) roiPontos = (1 + roi / 100) * 5;
  else if (roi <= 100) roiPontos = 5 + (roi / 100) * 20;
  else roiPontos = 25;

  // Componente 4: Consistência (0-15 pontos)
  // 0% blocos lucrativos = 0, 50% = 7.5, 100% = 15
  let consPontos = consistencia * 15;

  return Math.round(Math.min(precPontos + recPontos + roiPontos + consPontos, 100));
}

// ========== SIMULAÇÃO WALK-FORWARD GENÉRICA ==========
function simular(config) {
  const { janela, zMinimo, amostraMinima, sinaisMinimos, scoreMinimo, recalibrar } = config;

  let motor = null;
  let ultimaCal = 0;
  let apostas = 0, acertos = 0, lucro = 0;
  let totalBrancos = 0;
  const BLOCO_SIZE = 2000;
  const blocos = [];
  let blocoApostas = 0, blocoAcertos = 0;

  for (let i = janela; i < T; i++) {
    const resultado = allNums[i];
    if (resultado === 0) totalBrancos++;

    // Criar/recalibrar motor
    if (!motor || i - ultimaCal >= recalibrar) {
      const historico = allNums.slice(0, i);
      motor = new MotorAdaptativo(historico, { janela, zMinimo, amostraMinima });
      motor.calibrar();
      ultimaCal = i;
    } else {
      motor.historico = allNums.slice(0, i);
    }

    const sinal = motor.avaliar();

    // Filtros adicionais
    const apostou = sinal.decisao === 'APOSTAR' &&
      sinal.sinaisAtivos.length >= sinaisMinimos &&
      sinal.score >= scoreMinimo;

    if (apostou) {
      apostas++;
      blocoApostas++;
      if (resultado === 0) {
        acertos++;
        blocoAcertos++;
        lucro += 13;
      } else {
        lucro -= 1;
      }
    }

    // Blocos
    if ((i - janela + 1) % BLOCO_SIZE === 0) {
      blocos.push({ apostas: blocoApostas, acertos: blocoAcertos });
      blocoApostas = 0;
      blocoAcertos = 0;
    }
  }
  if (blocoApostas > 0) blocos.push({ apostas: blocoApostas, acertos: blocoAcertos });

  const precisao = apostas > 0 ? acertos / apostas : 0;
  const recall = totalBrancos > 0 ? acertos / totalBrancos : 0;
  const roi = apostas > 0 ? lucro / apostas * 100 : 0;

  // Consistência: % de blocos com apostas que foram lucrativos
  const blocosComAposta = blocos.filter(b => b.apostas >= 3);
  const blocosLucrativos = blocosComAposta.filter(b => {
    const p = b.acertos / b.apostas;
    return p >= BREAK_EVEN;
  });
  const consistencia = blocosComAposta.length > 0 ? blocosLucrativos.length / blocosComAposta.length : 0;

  const eficacia = calcEficacia(precisao, recall, roi, consistencia, apostas);

  return {
    config,
    apostas,
    acertos,
    precisao,
    recall,
    roi,
    lucro,
    bancaFinal: 100 + lucro,
    consistencia,
    eficacia,
    blocos
  };
}

// ========== GRID DE CONFIGURAÇÕES ==========
const configs = [];

const janelas = [300, 500, 750];
const zMinimos = [1.96, 2.3, 2.58];
const amostras = [10, 15, 20];
const sinaisMinimos = [1, 2, 3];
const scoreMinimos = [1.5, 2.0, 2.5, 3.0];
const recalibracoes = [30, 50, 100];

// Gerar todas as combinações
for (const j of janelas) {
  for (const z of zMinimos) {
    for (const a of amostras) {
      for (const s of sinaisMinimos) {
        for (const sc of scoreMinimos) {
          for (const r of recalibracoes) {
            configs.push({
              janela: j,
              zMinimo: z,
              amostraMinima: a,
              sinaisMinimos: s,
              scoreMinimo: sc,
              recalibrar: r
            });
          }
        }
      }
    }
  }
}

console.log(`Testando ${configs.length} combinações de parâmetros...\n`);

// ========== EXECUTAR TODAS ==========
const resultados = [];
let progresso = 0;

for (const config of configs) {
  const r = simular(config);
  resultados.push(r);
  progresso++;
  if (progresso % 100 === 0) {
    process.stdout.write(`  ${progresso}/${configs.length} (${(progresso / configs.length * 100).toFixed(0)}%)\r`);
  }
}
console.log(`\n✅ ${configs.length} combinações testadas.\n`);

// ========== RANKING ==========
resultados.sort((a, b) => b.eficacia - a.eficacia);

// ========== RELATÓRIO ==========
const report = [];
function log(s) { report.push(s); console.log(s); }

log('# OTIMIZAÇÃO COMPLETA — MOTOR ADAPTATIVO');
log(`\n**Dataset:** ${T} rodadas | **Combinações testadas:** ${configs.length}`);
log(`\n**Base rate:** ${(BASE_RATE * 100).toFixed(2)}% | **Break-even:** ${(BREAK_EVEN * 100).toFixed(2)}%`);

log(`\n---\n\n## ESCALA DE EFICÁCIA (1-100%)\n`);
log(`| Faixa | Significado | Ação |`);
log(`|-------|-------------|------|`);
log(`| 0-15% | Pior que aleatório | ❌ Não usar |`);
log(`| 16-35% | Abaixo do break-even | ⚠️ Perde dinheiro |`);
log(`| 36-50% | Próximo do break-even | ⚠️ Marginal |`);
log(`| 51-65% | Lucrativo leve | ✅ Usável com cautela |`);
log(`| 66-80% | Lucrativo consistente | ✅✅ Bom para operar |`);
log(`| 81-100% | Excepcional | ✅✅✅ Ideal |`);

log(`\n> Componentes: Precisão (0-40pts) + Cobertura (0-20pts) + ROI (0-25pts) + Consistência (0-15pts) = 100pts`);

// Top 20
log(`\n---\n\n## TOP 20 MELHORES CONFIGURAÇÕES\n`);
log(`| Rank | Eficácia | Apostas | Acertos | Precisão | Recall | ROI | Banca | Consist. | Janela | Z | Amostra | Sinais | Score | Recal |`);
log(`|------|----------|---------|---------|----------|--------|-----|-------|----------|--------|---|---------|--------|-------|-------|`);

const top20 = resultados.slice(0, 20);
for (let i = 0; i < top20.length; i++) {
  const r = top20[i];
  const c = r.config;
  const bar = '█'.repeat(Math.round(r.eficacia / 5)) + '░'.repeat(20 - Math.round(r.eficacia / 5));
  log(`| ${i + 1} | **${r.eficacia}%** | ${r.apostas} | ${r.acertos} | ${(r.precisao * 100).toFixed(1)}% | ${(r.recall * 100).toFixed(1)}% | ${r.roi > 0 ? '+' : ''}${r.roi.toFixed(1)}% | ${r.bancaFinal.toFixed(0)} | ${(r.consistencia * 100).toFixed(0)}% | ${c.janela} | ${c.zMinimo} | ${c.amostraMinima} | ≥${c.sinaisMinimos} | ≥${c.scoreMinimo} | ${c.recalibrar} |`);
}

// Melhor configuração
const melhor = top20[0];
log(`\n---\n\n## MELHOR CONFIGURAÇÃO ENCONTRADA\n`);
log(`### Eficácia: **${melhor.eficacia}%**\n`);
log(`| Parâmetro | Valor |`);
log(`|-----------|-------|`);
log(`| Janela | ${melhor.config.janela} rodadas |`);
log(`| Z mínimo | ${melhor.config.zMinimo} |`);
log(`| Amostra mínima | ${melhor.config.amostraMinima} |`);
log(`| Sinais mínimos para apostar | ≥${melhor.config.sinaisMinimos} |`);
log(`| Score mínimo para apostar | ≥${melhor.config.scoreMinimo} |`);
log(`| Recalibração | a cada ${melhor.config.recalibrar} rodadas |`);

log(`\n### Resultado\n`);
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Apostas | ${melhor.apostas} (${(melhor.apostas / (T - melhor.config.janela) * 100).toFixed(1)}% das rodadas) |`);
log(`| Acertos | ${melhor.acertos} |`);
log(`| Precisão | **${(melhor.precisao * 100).toFixed(2)}%** |`);
log(`| Recall | ${(melhor.recall * 100).toFixed(2)}% |`);
log(`| ROI | **${melhor.roi > 0 ? '+' : ''}${melhor.roi.toFixed(1)}%** |`);
log(`| Lucro | ${melhor.lucro > 0 ? '+' : ''}${melhor.lucro}u |`);
log(`| Banca final | **${melhor.bancaFinal.toFixed(0)}** (de 100) |`);
log(`| Consistência | ${(melhor.consistencia * 100).toFixed(0)}% dos blocos lucrativos |`);

// Evolução por bloco do melhor
log(`\n### Evolução por bloco (2.000 rodadas)\n`);
log(`| Bloco | Apostas | Acertos | Taxa | Status |`);
log(`|-------|---------|---------|------|--------|`);
for (let b = 0; b < melhor.blocos.length; b++) {
  const bl = melhor.blocos[b];
  const taxa = bl.apostas > 0 ? (bl.acertos / bl.apostas * 100).toFixed(1) : '0.0';
  const lucr = bl.apostas > 0 ? (bl.acertos * 13 - (bl.apostas - bl.acertos)) : 0;
  const status = bl.apostas === 0 ? '⏸️ Sem apostas' : 
    (bl.acertos / bl.apostas >= BREAK_EVEN ? `✅ +${lucr}u` : `❌ ${lucr}u`);
  log(`| ${b + 1} | ${bl.apostas} | ${bl.acertos} | ${taxa}% | ${status} |`);
}

// Análise por faixa
log(`\n---\n\n## DISTRIBUIÇÃO DE EFICÁCIA\n`);
const faixas = [
  { min: 0, max: 15, label: '0-15% (pior que aleatório)' },
  { min: 16, max: 35, label: '16-35% (perde dinheiro)' },
  { min: 36, max: 50, label: '36-50% (marginal)' },
  { min: 51, max: 65, label: '51-65% (lucrativo leve)' },
  { min: 66, max: 80, label: '66-80% (lucrativo consistente)' },
  { min: 81, max: 100, label: '81-100% (excepcional)' }
];
log(`| Faixa | Configs | % do total |`);
log(`|-------|---------|-----------|`);
for (const f of faixas) {
  const count = resultados.filter(r => r.eficacia >= f.min && r.eficacia <= f.max).length;
  const bar = '█'.repeat(Math.round(count / configs.length * 40));
  log(`| ${f.label} | ${count} | ${(count / configs.length * 100).toFixed(1)}% ${bar} |`);
}

// Comparação: melhor vs base vs V4
log(`\n---\n\n## COMPARAÇÃO FINAL\n`);

// V4 estático
let v4apost = 0, v4acert = 0, v4lucro = 0;
const distArr = new Array(T).fill(999);
let lastB = -1;
for (let i = 0; i < T; i++) {
  if (allNums[i] === 0) lastB = i;
  distArr[i] = lastB >= 0 ? i - lastB : 999;
}
for (let i = 500; i < T; i++) {
  let apostar = false;
  if (distArr[i] >= 35) apostar = true;
  const l4 = allNums.slice(i - 4, i);
  if (l4.includes(11) && l4.includes(12)) apostar = true;
  const l3 = allNums.slice(i - 3, i);
  if (l3.filter(x => x === 1).length >= 2) apostar = true;
  if (apostar) {
    v4apost++;
    if (allNums[i] === 0) { v4acert++; v4lucro += 13; }
    else v4lucro -= 1;
  }
}
const v4prec = v4apost > 0 ? v4acert / v4apost : 0;
const v4roi = v4apost > 0 ? v4lucro / v4apost * 100 : 0;

// Aleatório (apostar tudo)
const randApost = T - 500;
const randAcert = allNums.slice(500).filter(n => n === 0).length;
const randPrec = randAcert / randApost;
const randROI = (randPrec * 14 - 1) * 100;

log(`| Métrica | **Melhor Adaptativo** | V4 Estático | Aleatório |`);
log(`|---------|----------------------|-------------|-----------|`);
log(`| Eficácia | **${melhor.eficacia}%** | ~0% | 0% |`);
log(`| Apostas | ${melhor.apostas} | ${v4apost} | ${randApost} |`);
log(`| Precisão | **${(melhor.precisao * 100).toFixed(2)}%** | ${(v4prec * 100).toFixed(2)}% | ${(randPrec * 100).toFixed(2)}% |`);
log(`| ROI | **${melhor.roi > 0 ? '+' : ''}${melhor.roi.toFixed(1)}%** | ${v4roi > 0 ? '+' : ''}${v4roi.toFixed(1)}% | ${randROI > 0 ? '+' : ''}${randROI.toFixed(1)}% |`);
log(`| Banca final | **${melhor.bancaFinal.toFixed(0)}** | ${(100 + v4lucro).toFixed(0)} | ${(100 + randAcert * 13 - (randApost - randAcert)).toFixed(0)} |`);

// Veredicto
log(`\n---\n\n## VEREDICTO FINAL\n`);
const ef = melhor.eficacia;
if (ef >= 66) {
  log(`### 🟢 EFICÁCIA ${ef}% — LUCRATIVO CONSISTENTE`);
  log(`O motor otimizado é confiável para operar. Configuração recomendada acima.`);
} else if (ef >= 51) {
  log(`### 🟡 EFICÁCIA ${ef}% — LUCRATIVO LEVE`);
  log(`O motor gera lucro, mas com margem pequena. Usar com gestão de banca rigorosa.`);
} else if (ef >= 36) {
  log(`### 🟠 EFICÁCIA ${ef}% — MARGINAL`);
  log(`Próximo do break-even. O motor tem alguma capacidade preditiva, mas não o suficiente para operar com confiança.`);
} else {
  log(`### 🔴 EFICÁCIA ${ef}% — INSUFICIENTE`);
  log(`O motor não consegue superar o break-even de forma consistente com nenhuma configuração testada.`);
}

// O que os dados realmente dizem
log(`\n### O que os dados dizem\n`);
const lucrativos = resultados.filter(r => r.roi > 0 && r.apostas >= 20);
const totalLucr = lucrativos.length;
log(`- De ${configs.length} configurações testadas, **${totalLucr} (${(totalLucr / configs.length * 100).toFixed(1)}%)** foram lucrativas.`);
if (totalLucr > 0) {
  const mediaROI = lucrativos.reduce((a, r) => a + r.roi, 0) / totalLucr;
  const mediaPrecisao = lucrativos.reduce((a, r) => a + r.precisao, 0) / totalLucr;
  log(`- ROI médio das lucrativas: +${mediaROI.toFixed(1)}%`);
  log(`- Precisão média das lucrativas: ${(mediaPrecisao * 100).toFixed(1)}%`);
  
  // O que as lucrativas têm em comum?
  const janelaComum = {};
  const sinaisComum = {};
  const scoreComum = {};
  for (const r of lucrativos) {
    janelaComum[r.config.janela] = (janelaComum[r.config.janela] || 0) + 1;
    sinaisComum[r.config.sinaisMinimos] = (sinaisComum[r.config.sinaisMinimos] || 0) + 1;
    scoreComum[r.config.scoreMinimo] = (scoreComum[r.config.scoreMinimo] || 0) + 1;
  }
  
  log(`\n### Perfil das configurações lucrativas\n`);
  log(`| Parâmetro | Valores mais comuns entre as lucrativas |`);
  log(`|-----------|----------------------------------------|`);
  
  const topJanela = Object.entries(janelaComum).sort((a, b) => b[1] - a[1]).slice(0, 3);
  log(`| Janela | ${topJanela.map(([k, v]) => `${k}: ${v}x`).join(', ')} |`);
  
  const topSinais = Object.entries(sinaisComum).sort((a, b) => b[1] - a[1]).slice(0, 3);
  log(`| Sinais mín. | ${topSinais.map(([k, v]) => `≥${k}: ${v}x`).join(', ')} |`);
  
  const topScore = Object.entries(scoreComum).sort((a, b) => b[1] - a[1]).slice(0, 3);
  log(`| Score mín. | ${topScore.map(([k, v]) => `≥${k}: ${v}x`).join(', ')} |`);
}

log(`\n---\n*Otimização em ${new Date().toISOString()} | ${configs.length} configs | ${T} rodadas*`);

// Salvar
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'OTIMIZACAO-COMPLETA.md'), output, 'utf-8');
console.log('\n✅ Relatório salvo em: Motor_novo/OTIMIZACAO-COMPLETA.md');
