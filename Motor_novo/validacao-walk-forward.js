/**
 * SIMULADOR WALK-FORWARD
 * 
 * Simula o motor adaptativo como se estivesse operando em tempo real:
 * 1. Começa na rodada 500 (precisa de histórico mínimo)
 * 2. A cada rodada, calibra com a janela anterior
 * 3. Gera sinal ANTES do resultado
 * 4. Registra se acertou ou errou
 * 5. Avança para próxima rodada
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const MotorAdaptativo = require('./motor-adaptativo');

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, '..', 'Planilha', 'tipminer-dados-blaze-double (4).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);
const keys = Object.keys(raw[0]);
const numKey = keys.find(k => /n[uú]mero|number|num/i.test(k)) || keys[0];

const allNums = raw.map(r => parseInt(r[numKey])).filter(n => !isNaN(n) && n >= 0 && n <= 14);
allNums.reverse(); // cronológico

const T = allNums.length;
const JANELA = 500;
const RECALIBRAR_CADA = 50;
const BASE_RATE_GLOBAL = allNums.filter(n => n === 0).length / T;

console.log(`Dataset: ${T} rodadas | Base rate: ${(BASE_RATE_GLOBAL * 100).toFixed(2)}%`);
console.log(`Janela do motor: ${JANELA} | Recalibração: a cada ${RECALIBRAR_CADA}`);
console.log('');

// ========== SIMULAÇÃO ==========
const resultados = {
  apostas: 0,
  acertos: 0,
  aguardou: 0,
  naoApostou: 0,
  neutro: 0,
  lucroUnidades: 0,
  bancaHistorico: [],
  scorePorHora: {},
  detalheApostas: []
};

let banca = 100;
const APOSTA = 1;
let ultimaCalibracao = 0;
let motor = null;

// Blocos de 1000 para ver evolução
const blocos = [];
let blocoAtual = { inicio: JANELA, apostas: 0, acertos: 0, lucro: 0 };

for (let i = JANELA; i < T; i++) {
  const historico = allNums.slice(0, i); // tudo até antes desta rodada
  const resultado = allNums[i]; // o que vai sair

  // Criar/recalibrar motor
  if (!motor || i - ultimaCalibracao >= RECALIBRAR_CADA) {
    motor = new MotorAdaptativo(historico, { janela: JANELA, zMinimo: 1.96, amostraMinima: 15 });
    motor.calibrar();
    ultimaCalibracao = i;
  } else {
    motor.historico = historico;
  }

  const sinal = motor.avaliar();

  if (sinal.decisao === 'APOSTAR') {
    resultados.apostas++;
    blocoAtual.apostas++;
    const acertou = resultado === 0;

    if (acertou) {
      resultados.acertos++;
      blocoAtual.acertos++;
      banca += 13 * APOSTA; // paga 14x, lucro = 13x
      resultados.lucroUnidades += 13;
      blocoAtual.lucro += 13;
    } else {
      banca -= APOSTA;
      resultados.lucroUnidades -= 1;
      blocoAtual.lucro -= 1;
    }

    resultados.detalheApostas.push({
      rodada: i,
      score: sinal.score,
      sinais: sinal.sinaisAtivos.length,
      acertou,
      banca: Math.round(banca * 100) / 100
    });
  } else if (sinal.decisao.includes('AGUARDAR')) {
    resultados.aguardou++;
  } else if (sinal.decisao === 'NÃO APOSTAR') {
    resultados.naoApostou++;
  } else {
    resultados.neutro++;
  }

  resultados.bancaHistorico.push(Math.round(banca * 100) / 100);

  // Bloco de 1000
  if ((i - JANELA + 1) % 2000 === 0 || i === T - 1) {
    blocoAtual.fim = i;
    blocos.push({ ...blocoAtual });
    blocoAtual = { inicio: i + 1, apostas: 0, acertos: 0, lucro: 0 };
  }
}

// ========== RELATÓRIO ==========
const report = [];
function log(s) { report.push(s); console.log(s); }

log('# VALIDAÇÃO WALK-FORWARD — MOTOR ADAPTATIVO');
log(`\n**Dataset:** ${T} rodadas | **Janela:** ${JANELA} | **Recalibração:** cada ${RECALIBRAR_CADA}`);
log(`**Período simulado:** rodadas ${JANELA} a ${T - 1} (${T - JANELA} rodadas avaliadas)`);

log(`\n---\n\n## RESULTADO GERAL\n`);
const taxa = resultados.apostas > 0 ? resultados.acertos / resultados.apostas : 0;
const roi = resultados.apostas > 0 ? resultados.lucroUnidades / resultados.apostas * 100 : 0;
const breakEven = 1 / 14 * 100; // 7.14%

log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Rodadas avaliadas | ${T - JANELA} |`);
log(`| Decisões APOSTAR | ${resultados.apostas} (${(resultados.apostas / (T - JANELA) * 100).toFixed(1)}% das rodadas) |`);
log(`| Acertos (branco) | ${resultados.acertos} |`);
log(`| Taxa de acerto | **${(taxa * 100).toFixed(2)}%** |`);
log(`| Taxa base (aleatório) | ${(BASE_RATE_GLOBAL * 100).toFixed(2)}% |`);
log(`| Break-even (1/14) | ${breakEven.toFixed(2)}% |`);
log(`| ROI | **${roi > 0 ? '+' : ''}${roi.toFixed(1)}%** |`);
log(`| Lucro em unidades | ${resultados.lucroUnidades > 0 ? '+' : ''}${resultados.lucroUnidades} |`);
log(`| Banca inicial | 100 |`);
log(`| Banca final | **${Math.round(banca)}** |`);
log(`| Decisões AGUARDAR | ${resultados.aguardou} |`);
log(`| Decisões NÃO APOSTAR | ${resultados.naoApostou} |`);
log(`| Decisões NEUTRO | ${resultados.neutro} |`);

// Z-score do motor vs aleatório
const motorZ = (taxa - BASE_RATE_GLOBAL) / Math.sqrt(BASE_RATE_GLOBAL * (1 - BASE_RATE_GLOBAL) / resultados.apostas);
log(`\n**Z-score do motor vs aleatório:** ${motorZ.toFixed(2)} (${Math.abs(motorZ) >= 1.96 ? '✅ SIGNIFICATIVO' : '❌ não significativo'})`);

// Drawdown
const bancaHist = resultados.bancaHistorico;
let maxBanca = 100, maxDrawdown = 0, maxSeqPerdas = 0, seqAtual = 0;
for (const b of bancaHist) {
  if (b > maxBanca) maxBanca = b;
  const dd = maxBanca - b;
  if (dd > maxDrawdown) maxDrawdown = dd;
}
for (const d of resultados.detalheApostas) {
  if (!d.acertou) { seqAtual++; if (seqAtual > maxSeqPerdas) maxSeqPerdas = seqAtual; }
  else seqAtual = 0;
}

log(`\n### Gestão de Risco\n`);
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Drawdown máximo | ${maxDrawdown.toFixed(0)} unidades |`);
log(`| Banca mínima | ${Math.min(...bancaHist).toFixed(0)} |`);
log(`| Banca máxima | ${Math.max(...bancaHist).toFixed(0)} |`);
log(`| Maior sequência de perdas | ${maxSeqPerdas} |`);

// Evolução por bloco
log(`\n---\n\n## EVOLUÇÃO POR BLOCO DE 2.000 RODADAS\n`);
log(`| Bloco | Apostas | Acertos | Taxa | ROI | Lucro |`);
log(`|-------|---------|---------|------|-----|-------|`);
for (let b = 0; b < blocos.length; b++) {
  const bl = blocos[b];
  const t = bl.apostas > 0 ? (bl.acertos / bl.apostas * 100).toFixed(1) : '0.0';
  const r = bl.apostas > 0 ? (bl.lucro / bl.apostas * 100).toFixed(1) : '0.0';
  log(`| ${b + 1} (rod ${bl.inicio}-${bl.fim || '?'}) | ${bl.apostas} | ${bl.acertos} | ${t}% | ${r}% | ${bl.lucro > 0 ? '+' : ''}${bl.lucro} |`);
}

// Comparação com motor estático (V4)
log(`\n---\n\n## COMPARAÇÃO: ADAPTATIVO vs V4 ESTÁTICO\n`);

// Simular V4 nas mesmas rodadas
let v4apostas = 0, v4acertos = 0, v4lucro = 0;
const distArrFull = new Array(T).fill(999);
let lastBFull = -1;
for (let i = 0; i < T; i++) {
  if (allNums[i] === 0) lastBFull = i;
  distArrFull[i] = lastBFull >= 0 ? i - lastBFull : 999;
}

for (let i = JANELA; i < T; i++) {
  let apostarV4 = false;
  // Regra V4-A: dist >= 35
  if (distArrFull[i] >= 35) apostarV4 = true;
  // Regra V4-B: par 11+12 nas últimas 4
  const l4 = allNums.slice(i - 4, i);
  if (l4.includes(11) && l4.includes(12)) apostarV4 = true;
  // Regra V4-C: rep 1 2x/3
  const l3 = allNums.slice(i - 3, i);
  if (l3.filter(x => x === 1).length >= 2) apostarV4 = true;

  if (apostarV4) {
    v4apostas++;
    if (allNums[i] === 0) {
      v4acertos++;
      v4lucro += 13;
    } else {
      v4lucro -= 1;
    }
  }
}

const v4taxa = v4apostas > 0 ? v4acertos / v4apostas : 0;
const v4roi = v4apostas > 0 ? v4lucro / v4apostas * 100 : 0;

log(`| Métrica | Motor Adaptativo | V4 Estático |`);
log(`|---------|-----------------|-------------|`);
log(`| Apostas | ${resultados.apostas} | ${v4apostas} |`);
log(`| Acertos | ${resultados.acertos} | ${v4acertos} |`);
log(`| Taxa | **${(taxa * 100).toFixed(2)}%** | ${(v4taxa * 100).toFixed(2)}% |`);
log(`| ROI | **${roi > 0 ? '+' : ''}${roi.toFixed(1)}%** | ${v4roi > 0 ? '+' : ''}${v4roi.toFixed(1)}% |`);
log(`| Lucro total | ${resultados.lucroUnidades > 0 ? '+' : ''}${resultados.lucroUnidades}u | ${v4lucro > 0 ? '+' : ''}${v4lucro}u |`);
log(`| Banca final | **${Math.round(banca)}** | ${Math.round(100 + v4lucro)} |`);

// Veredicto
log(`\n---\n\n## VEREDICTO\n`);
if (taxa > BASE_RATE_GLOBAL * 1.1 && roi > 0) {
  log(`✅ **O motor adaptativo é LUCRATIVO** com taxa de ${(taxa * 100).toFixed(2)}% (base: ${(BASE_RATE_GLOBAL * 100).toFixed(2)}%) e ROI de ${roi.toFixed(1)}%.`);
  if (Math.abs(motorZ) >= 1.96) {
    log(`✅ **Estatisticamente significativo** (Z=${motorZ.toFixed(2)}).`);
  } else {
    log(`⚠️ **Não estatisticamente significativo** (Z=${motorZ.toFixed(2)}). Pode ser variância. Mais dados ajudariam.`);
  }
} else if (taxa > breakEven / 100) {
  log(`⚠️ **Marginalmente lucrativo** — acima do break-even mas não muito acima da base.`);
} else {
  log(`❌ **Não lucrativo** com as configurações atuais. Taxa ${(taxa * 100).toFixed(2)}% abaixo do break-even ${breakEven.toFixed(2)}%.`);
}

if (roi > v4roi) {
  log(`\n🏆 **Motor adaptativo supera o V4 estático** (${roi.toFixed(1)}% vs ${v4roi.toFixed(1)}%).`);
} else {
  log(`\n⚠️ V4 estático teve ROI melhor neste período (${v4roi.toFixed(1)}% vs ${roi.toFixed(1)}%).`);
}

log(`\n---\n*Simulação walk-forward em ${new Date().toISOString()}*`);

// Salvar
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'VALIDACAO-WALK-FORWARD.md'), output, 'utf-8');
console.log('\n✅ Relatório salvo em: Motor_novo/VALIDACAO-WALK-FORWARD.md');
