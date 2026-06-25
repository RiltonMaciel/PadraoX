/**
 * SIMULAÇÃO DO BOT - Backtesting com dados reais do Excel
 * 
 * Lógica: Percorre as 2000 rodadas simulando o comportamento exato do bot.
 * Para cada posição, usa uma janela de N rodadas anteriores como "histórico disponível"
 * e aplica os mesmos algoritmos de decisão (PadrãoX, Cadeia, Tempo/Intervalo).
 * 
 * Quando o bot decide "apostar", verifica se o branco aparece nas próximas 8 rodadas.
 * Se sim: GREEN em X casas → lucro = stake × (14 - X)
 * Se não: RED → perda = stake × 8
 */

const XLSX = require('xlsx');
const path = require('path');

// === CARREGAR DADOS DO EXCEL ===
const excelPath = path.join(__dirname, '..', 'double-fetcher', 'exports', 'blaze-double-2000-2026-06-12T12-59-00.xlsx');
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws);

// Dados estão do mais recente ao mais antigo — inverter para cronológico
const dados = rawData.reverse();
const nums = dados.map(r => r.Numero);
const horas = dados.map(r => r.Horario);

console.log(`\n📊 SIMULAÇÃO DO BOT - BACKTEST`);
console.log(`${'═'.repeat(60)}`);
console.log(`Total de rodadas: ${nums.length}`);
console.log(`Período: ${horas[0]} até ${horas[horas.length - 1]}`);

// Contar brancos
const totalBrancos = nums.filter(n => n === 0).length;
console.log(`Total de brancos: ${totalBrancos} (${(totalBrancos / nums.length * 100).toFixed(1)}%)`);

// === CONSTANTES DO BOT (mesmas do código real) ===
const BLOQUEADORES = [2, 3, 11, 4, 12, 9];
const FAVORAVEIS = [14, 8, 1];
const BLOQUEADORES_EXATOS = [3, 6, 9, 13];
const FAVORAVEIS_EXATOS = [14, 2, 8];
const PADROES_ALERTA = ['PVP', 'VVV', 'VVP', 'PPP'];
const PADROES_BOM = ['VBP', 'PBV'];

function corLetra(n) {
  if (n === 0) return 'B';
  if (n <= 7) return 'V';
  return 'P';
}

// === ANÁLISE PADRÃO X (réplica simplificada) ===
function analisarPadraoXLocal(historico) {
  if (historico.length < 10) return null;

  const idxBrancos = [];
  for (let i = 0; i < historico.length; i++) {
    if (historico[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return null;

  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;
  if (pos2 < 0) return null;

  const n1 = historico[pos1];
  const n2 = historico[pos2];
  if (n1 === 0 || n2 === 0) return null;

  const cor1 = corLetra(n1);
  const cor2 = corLetra(n2);
  const coresDiferentes = cor1 !== cor2;
  const previsaoRodadas = Math.max(n1, n2);
  const rodadasDesdeUltimo = historico.length - 1 - ultimoBrancoIdx;
  const rodadasRestantes = previsaoRodadas - rodadasDesdeUltimo;

  const rodadasApos = historico.slice(ultimoBrancoIdx + 1);
  const bloqueadoresVistos = [];
  const favoraveisVistos = [];
  for (const n of rodadasApos) {
    if (BLOQUEADORES.includes(n) && !bloqueadoresVistos.includes(n)) bloqueadoresVistos.push(n);
    if (FAVORAVEIS.includes(n) && !favoraveisVistos.includes(n)) favoraveisVistos.push(n);
  }

  const ultimas3 = historico.slice(-3).map(corLetra).join('');
  const padraoAlerta = PADROES_ALERTA.includes(ultimas3);
  const padraoBom = PADROES_BOM.includes(ultimas3);

  const posPrevisao = ultimoBrancoIdx + previsaoRodadas;
  let bloqueadorExato = false, favoravelExato = false;
  if (posPrevisao < historico.length) {
    const numNaPos = historico[posPrevisao];
    bloqueadorExato = BLOQUEADORES_EXATOS.includes(numNaPos);
    favoravelExato = FAVORAVEIS_EXATOS.includes(numNaPos);
  }

  let confianca = 50;
  if (coresDiferentes) confianca += 15; else confianca -= 10;
  if (favoraveisVistos.length > 0) confianca += 10;
  if (bloqueadoresVistos.length >= 3) confianca -= 20;
  else if (bloqueadoresVistos.length >= 1) confianca -= 8;
  if (padraoAlerta) confianca -= 20;
  if (padraoBom) confianca += 20;
  if (bloqueadorExato) confianca -= 25;
  if (favoravelExato) confianca += 15;
  confianca = Math.max(5, Math.min(95, confianca));

  let status = 'aguardando';
  if (rodadasRestantes <= 0) {
    status = rodadasDesdeUltimo > previsaoRodadas + 15 ? 'expirado' : 'atrasado';
  } else if (rodadasRestantes <= 3) {
    status = 'iminente';
  }

  return { status, confianca, rodadasRestantes };
}

// === ANÁLISE CADEIA (réplica simplificada) ===
function analisarCadeiaLocal(historico) {
  if (historico.length < 20) return null;

  const idxBrancos = [];
  for (let i = 0; i < historico.length; i++) {
    if (historico[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return null;

  let ultimoBrancoIdx = -1, n1 = 0, n2 = 0;
  for (let bi = idxBrancos.length - 1; bi >= 0; bi--) {
    const idx = idxBrancos[bi];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    if (historico[p1] !== 0 && historico[p2] !== 0) {
      ultimoBrancoIdx = idx;
      n1 = historico[p1];
      n2 = historico[p2];
      break;
    }
  }
  if (ultimoBrancoIdx === -1) return null;

  const rodadasDesdeUltimo = historico.length - 1 - ultimoBrancoIdx;

  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalos.push(idxBrancos[i] - idxBrancos[i - 1]);
  }
  const ultimos10 = intervalos.slice(-10);
  const mediaRecente = Math.round(ultimos10.reduce((a, b) => a + b, 0) / ultimos10.length);

  const maxVal = Math.max(n1, n2);
  const minVal = Math.min(n1, n2);
  const media = Math.ceil((n1 + n2) / 2);

  let estimativa;
  if (maxVal >= 10) estimativa = Math.min(minVal + 2, media);
  else if (maxVal >= 7) estimativa = Math.max(media - 1, minVal);
  else estimativa = media;
  estimativa = Math.min(estimativa, mediaRecente);

  const posAlvo = ultimoBrancoIdx + estimativa;
  let previsaoFinal = posAlvo;

  if (posAlvo < historico.length && historico[posAlvo] !== 0) {
    let posAtual = posAlvo, passos = 0;
    while (posAtual < historico.length && historico[posAtual] !== 0 && passos < 2) {
      const n = historico[posAtual];
      posAtual += Math.min(n, 5);
      passos++;
    }
    previsaoFinal = posAtual;
  }

  const capFinal = ultimoBrancoIdx + Math.ceil(mediaRecente * 1.3);
  if (previsaoFinal > capFinal) previsaoFinal = capFinal;

  let rodadasRestantes = previsaoFinal - (historico.length - 1);
  if (rodadasRestantes <= 0) {
    const sortedInt = [...intervalos].sort((a, b) => a - b);
    rodadasRestantes = Math.max(1, Math.ceil(sortedInt[0] / 2));
  }

  let status = 'aguardando';
  if (rodadasRestantes <= 0) status = 'atrasado';
  else if (rodadasRestantes <= 2) status = 'iminente';
  else if (rodadasRestantes <= 5) status = 'proximo';

  let confianca = 65;
  if (rodadasDesdeUltimo >= mediaRecente) confianca += 15;
  if (rodadasDesdeUltimo >= mediaRecente * 1.5) confianca += 10;
  confianca = Math.max(15, Math.min(95, confianca));

  return { status, confianca, rodadasRestantes };
}

// === ANÁLISE TEMPO/INTERVALO (simplificada) ===
function analisarTempoLocal(historico) {
  if (historico.length < 20) return null;

  const idxBrancos = [];
  for (let i = 0; i < historico.length; i++) {
    if (historico[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 3) return null;

  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalos.push(idxBrancos[i] - idxBrancos[i - 1]);
  }

  const mediaGeral = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const rodadasDesdeUltimo = historico.length - 1 - ultimoBrancoIdx;

  let status = 'aguardando';
  if (rodadasDesdeUltimo >= mediaGeral * 1.3) status = 'atrasado';
  else if (rodadasDesdeUltimo >= mediaGeral - 2) status = 'iminente';
  else if (rodadasDesdeUltimo >= mediaGeral - 5) status = 'proximo';

  return { status };
}

// === LÓGICA DE DECISÃO DO BOT ===
function calcularConfiancaGeral(px, cadeia, tempo) {
  let sinais = 0, confiancaTotal = 0;

  if (px) {
    if (px.status === 'iminente' || px.status === 'atrasado') {
      sinais++;
      confiancaTotal += Math.max(px.confianca, 60);
    } else if (px.rodadasRestantes <= 10) {
      sinais++;
      confiancaTotal += px.confianca;
    }
  }

  if (cadeia) {
    if (cadeia.status === 'iminente' || cadeia.status === 'proximo' || cadeia.status === 'atrasado') {
      sinais++;
      confiancaTotal += Math.max(cadeia.confianca, 55);
    } else if (cadeia.rodadasRestantes <= 10) {
      sinais++;
      confiancaTotal += cadeia.confianca;
    }
  }

  if (tempo) {
    if (tempo.status === 'iminente' || tempo.status === 'proximo' || tempo.status === 'atrasado') {
      sinais++;
      confiancaTotal += 70;
    }
  }

  const confiancaMedia = sinais > 0 ? Math.round(confiancaTotal / sinais) : 0;
  return { sinais, confiancaMedia };
}

// === SIMULAÇÃO ===
function simular(perfil, bancaInicial, stakeFixo) {
  const JANELA = 200; // mínimo de dados históricos para começar a analisar
  const RODADAS_VERIFICAR = 8;

  let banca = bancaInicial;
  let totalGreen = 0, totalRed = 0, totalPulou = 0;
  let sequenciaLoss = 0, maxSequenciaLoss = 0;
  let lucroTotal = 0;
  let apostas = []; // registro de todas as apostas
  let apostaAberta = null; // { posInicio, stake }
  let maxDrawdown = 0;
  let picoBanca = bancaInicial;

  for (let i = JANELA; i < nums.length; i++) {
    // Se tem aposta aberta, não faz nada — só avança rodada
    if (apostaAberta) {
      const rodadasDesde = i - apostaAberta.posInicio;
      const brancoNaRodada = nums[i] === 0;

      if (brancoNaRodada) {
        // GREEN! Em quantas casas?
        const casas = rodadasDesde;
        const stake = apostaAberta.stake;
        const lucro = stake * (14 - casas);
        banca += lucro;
        lucroTotal += lucro;
        totalGreen++;
        sequenciaLoss = 0;
        apostas.push({ pos: apostaAberta.posInicio, tipo: 'green', casas, stake, lucro, banca });
        apostaAberta = null;
      } else if (rodadasDesde >= RODADAS_VERIFICAR) {
        // RED — não saiu em 8
        const stake = apostaAberta.stake;
        const perda = stake * RODADAS_VERIFICAR;
        banca -= perda;
        lucroTotal -= perda;
        totalRed++;
        sequenciaLoss++;
        maxSequenciaLoss = Math.max(maxSequenciaLoss, sequenciaLoss);
        apostas.push({ pos: apostaAberta.posInicio, tipo: 'red', casas: RODADAS_VERIFICAR, stake, lucro: -perda, banca });
        apostaAberta = null;
      }
      // Tracking de drawdown
      if (banca > picoBanca) picoBanca = banca;
      const dd = (picoBanca - banca) / picoBanca * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      continue;
    }

    // Analisar com o histórico disponível até aqui
    const historico = nums.slice(Math.max(0, i - JANELA), i + 1);

    const px = analisarPadraoXLocal(historico);
    const cadeia = analisarCadeiaLocal(historico);
    const tempo = analisarTempoLocal(historico);

    const { sinais, confiancaMedia } = calcularConfiancaGeral(px, cadeia, tempo);

    // Decisão: apostar se sinais >= sinaisMinimos do perfil (1 para todos)
    if (sinais >= 1) {
      // Calcular stake
      let stake;
      if (stakeFixo) {
        stake = stakeFixo;
      } else {
        const fator = Math.min(1, Math.max(0, (confiancaMedia - 30) / 70));
        stake = perfil.stakeMin + (perfil.stakeMax - perfil.stakeMin) * fator;
        const valoresPermitidos = [2, 5, 15, 30];
        stake = valoresPermitidos.reduce((prev, curr) =>
          Math.abs(curr - stake) < Math.abs(prev - stake) ? curr : prev
        );
        stake = Math.min(stake, perfil.stakeMax);
      }

      // Não apostar mais que a banca
      if (stake * RODADAS_VERIFICAR > banca) {
        totalPulou++;
        continue;
      }

      apostaAberta = { posInicio: i, stake };
    } else {
      totalPulou++;
    }

    // Tracking de drawdown
    if (banca > picoBanca) picoBanca = banca;
    const dd = (picoBanca - banca) / picoBanca * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Se ficou com aposta aberta no final, resolver como red
  if (apostaAberta) {
    const casas = Math.min(nums.length - apostaAberta.posInicio, RODADAS_VERIFICAR);
    const perda = apostaAberta.stake * casas;
    banca -= perda;
    lucroTotal -= perda;
    totalRed++;
  }

  return {
    banca,
    bancaInicial,
    lucroTotal,
    totalGreen,
    totalRed,
    totalPulou,
    totalApostas: totalGreen + totalRed,
    winRate: totalGreen + totalRed > 0 ? (totalGreen / (totalGreen + totalRed) * 100).toFixed(1) : '0',
    maxSequenciaLoss,
    maxDrawdown: maxDrawdown.toFixed(1),
    apostas
  };
}

// === PERFIS ===
const PERFIS = {
  normal: { nome: 'Normal', stakeMin: 2, stakeMax: 5, sinaisMinimos: 1 },
  corajoso: { nome: 'Corajoso', stakeMin: 5, stakeMax: 15, sinaisMinimos: 1 },
  agressivo: { nome: 'Agressivo', stakeMin: 15, stakeMax: 30, sinaisMinimos: 1 }
};

// === CENÁRIOS ===
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`📈 CENÁRIOS DE SIMULAÇÃO`);
console.log(`${'═'.repeat(60)}`);

const cenarios = [
  { nome: 'Normal (Banca R$100)', perfil: 'normal', banca: 100 },
  { nome: 'Normal (Banca R$200)', perfil: 'normal', banca: 200 },
  { nome: 'Corajoso (Banca R$200)', perfil: 'corajoso', banca: 200 },
  { nome: 'Corajoso (Banca R$500)', perfil: 'corajoso', banca: 500 },
  { nome: 'Agressivo (Banca R$500)', perfil: 'agressivo', banca: 500 },
  { nome: 'Agressivo (Banca R$1000)', perfil: 'agressivo', banca: 1000 },
  { nome: 'Conservador Fixo R$2 (Banca R$100)', perfil: 'normal', banca: 100, stakeFixo: 2 },
  { nome: 'Stake Fixo R$5 (Banca R$200)', perfil: 'normal', banca: 200, stakeFixo: 5 },
];

const resultados = [];

for (const c of cenarios) {
  const res = simular(PERFIS[c.perfil], c.banca, c.stakeFixo);
  resultados.push({ cenario: c.nome, ...res });

  const saldo = res.banca - res.bancaInicial;
  const emoji = saldo >= 0 ? '✅' : '❌';
  
  console.log(`\n${emoji} ${c.nome}`);
  console.log(`   Banca Final: R$${res.banca.toFixed(2)} (${saldo >= 0 ? '+' : ''}R$${saldo.toFixed(2)})`);
  console.log(`   Win Rate: ${res.winRate}% (${res.totalGreen}G / ${res.totalRed}R)`);
  console.log(`   Total Apostas: ${res.totalApostas} | Pulou: ${res.totalPulou}`);
  console.log(`   Max Loss Seguidos: ${res.maxSequenciaLoss} | Max Drawdown: ${res.maxDrawdown}%`);
}

// === ANÁLISE DETALHADA DO MELHOR CENÁRIO ===
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`🔍 ANÁLISE DETALHADA - GREEN POR CASAS`);
console.log(`${'═'.repeat(60)}`);

// Usar o cenário "Stake Fixo R$5"
const detalhado = resultados.find(r => r.cenario.includes('Fixo R$5'));
if (detalhado) {
  const porCasas = {};
  for (const a of detalhado.apostas) {
    if (!porCasas[a.casas]) porCasas[a.casas] = { green: 0, red: 0, lucroTotal: 0 };
    if (a.tipo === 'green') {
      porCasas[a.casas].green++;
      porCasas[a.casas].lucroTotal += a.lucro;
    } else {
      porCasas[a.casas].red++;
      porCasas[a.casas].lucroTotal += a.lucro;
    }
  }

  console.log(`\n   Casas | Greens | Reds | Lucro/Perda | Lucro por GREEN`);
  console.log(`   ${'─'.repeat(55)}`);
  for (let c = 1; c <= 8; c++) {
    const d = porCasas[c];
    if (d) {
      const lucroPorGreen = c <= 8 ? `R$${(5 * (14 - c)).toFixed(0)}` : '-';
      console.log(`     ${c}    |   ${String(d.green).padStart(3)}  |  ${String(d.red).padStart(3)} | ${d.lucroTotal >= 0 ? '+' : ''}R$${d.lucroTotal.toFixed(0).padStart(6)} | ${d.tipo !== 'red' ? lucroPorGreen : ''}`);
    }
  }
}

// === MÉTRICAS DE ACERTIVIDADE ===
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`📊 MÉTRICAS DE ACERTIVIDADE (todos os cenários)`);
console.log(`${'═'.repeat(60)}`);

console.log(`\n   Cenário                              | Win%  | Saldo Final  | ROI`);
console.log(`   ${'─'.repeat(70)}`);
for (const r of resultados) {
  const roi = ((r.banca - r.bancaInicial) / r.bancaInicial * 100).toFixed(1);
  const saldo = r.banca - r.bancaInicial;
  console.log(`   ${r.cenario.padEnd(40)}| ${r.winRate.padStart(4)}% | ${(saldo >= 0 ? '+' : '') + 'R$' + saldo.toFixed(0).padStart(6)} | ${roi}%`);
}

// === CONCLUSÃO ===
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`📋 CONCLUSÃO`);
console.log(`${'═'.repeat(60)}`);

const positivos = resultados.filter(r => r.banca > r.bancaInicial);
const negativos = resultados.filter(r => r.banca <= r.bancaInicial);

console.log(`\n   Cenários com saldo POSITIVO: ${positivos.length}/${resultados.length}`);
console.log(`   Cenários com saldo NEGATIVO: ${negativos.length}/${resultados.length}`);

if (positivos.length > 0) {
  const melhor = positivos.reduce((a, b) => (a.banca - a.bancaInicial) / a.bancaInicial > (b.banca - b.bancaInicial) / b.bancaInicial ? a : b);
  console.log(`\n   🏆 Melhor cenário: ${melhor.cenario}`);
  console.log(`      ROI: ${((melhor.banca - melhor.bancaInicial) / melhor.bancaInicial * 100).toFixed(1)}%`);
  console.log(`      Win Rate: ${melhor.winRate}%`);
}

if (negativos.length > 0) {
  const pior = negativos.reduce((a, b) => (a.banca - a.bancaInicial) / a.bancaInicial < (b.banca - b.bancaInicial) / b.bancaInicial ? a : b);
  console.log(`\n   ⚠️  Pior cenário: ${pior.cenario}`);
  console.log(`      ROI: ${((pior.banca - pior.bancaInicial) / pior.bancaInicial * 100).toFixed(1)}%`);
  console.log(`      Win Rate: ${pior.winRate}%`);
}

const mediaWinRate = resultados.reduce((a, r) => a + parseFloat(r.winRate), 0) / resultados.length;
console.log(`\n   📈 Win Rate médio geral: ${mediaWinRate.toFixed(1)}%`);
console.log(`   📊 Média de apostas por cenário: ${Math.round(resultados.reduce((a, r) => a + r.totalApostas, 0) / resultados.length)}`);

// Distribuição dos greens por casa (usando todos os cenários)
const todasApostas = resultados.flatMap(r => r.apostas.filter(a => a.tipo === 'green'));
const greenPorCasa = {};
for (const a of todasApostas) {
  greenPorCasa[a.casas] = (greenPorCasa[a.casas] || 0) + 1;
}
console.log(`\n   Distribuição dos GREENs por casa (quando branco sai):`);
for (let c = 1; c <= 8; c++) {
  const qtd = greenPorCasa[c] || 0;
  const pct = todasApostas.length > 0 ? (qtd / todasApostas.length * 100).toFixed(1) : '0';
  const bar = '█'.repeat(Math.round(qtd / resultados.length));
  console.log(`     Casa ${c}: ${String(qtd).padStart(4)} (${pct}%) ${bar}`);
}

console.log(`\n${'═'.repeat(60)}\n`);
