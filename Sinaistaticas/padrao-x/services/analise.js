const state = require('../state');
const { corLetra, corNome, BLOQUEADORES, FAVORAVEIS, BLOQUEADORES_EXATOS, FAVORAVEIS_EXATOS, PADROES_ALERTA, PADROES_BOM } = require('./helpers');

function analisarPadraoX() {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;

  if (nums.length < 10) {
    return { erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' };
  }

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 2) {
    return { erro: 'Poucos brancos encontrados.' };
  }

  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';

  const pos1 = ultimoBrancoIdx - 2;
  const pos2 = ultimoBrancoIdx - 3;

  if (pos2 < 0) {
    return { erro: 'Branco muito no início dos dados.' };
  }

  const n1 = nums[pos1];
  const n2 = nums[pos2];

  if (n1 === 0 || n2 === 0) {
    return { erro: 'Vizinhos do branco contêm outro branco. Aguardar próximo ciclo.' };
  }

  const cor1 = corLetra(n1);
  const cor2 = corLetra(n2);
  const coresDiferentes = cor1 !== cor2;
  const previsaoRodadas = Math.max(n1, n2);
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;
  const rodadasRestantes = previsaoRodadas - rodadasDesdeUltimo;

  const rodadasApos = nums.slice(ultimoBrancoIdx + 1);
  const bloqueadoresVistos = [];
  const favoraveisVistos = [];

  for (const n of rodadasApos) {
    if (BLOQUEADORES.includes(n) && !bloqueadoresVistos.includes(n)) bloqueadoresVistos.push(n);
    if (FAVORAVEIS.includes(n) && !favoraveisVistos.includes(n)) favoraveisVistos.push(n);
  }

  const ultimas3 = nums.slice(-3).map(corLetra).join('');
  const padraoAlerta = PADROES_ALERTA.includes(ultimas3);
  const padraoBom = PADROES_BOM.includes(ultimas3);

  const posPrevisao = ultimoBrancoIdx + previsaoRodadas;
  let numNaPosPrevisao = null;
  let bloqueadorExato = false;
  let favoravelExato = false;
  if (posPrevisao < nums.length) {
    numNaPosPrevisao = nums[posPrevisao];
    bloqueadorExato = BLOQUEADORES_EXATOS.includes(numNaPosPrevisao);
    favoravelExato = FAVORAVEIS_EXATOS.includes(numNaPosPrevisao);
  }

  let confianca = 50;
  if (coresDiferentes) confianca += 15;
  else confianca -= 10;
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

  const historico = [];
  for (let i = Math.max(0, idxBrancos.length - 11); i < idxBrancos.length - 1; i++) {
    const idx = idxBrancos[i];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    const a = nums[p1], b = nums[p2];
    if (a === 0 || b === 0) continue;
    const prev = Math.max(a, b);
    const real = idxBrancos[i + 1] - idx;
    const erro = Math.abs(real - prev);
    historico.push({
      hora: horas[idx] || '--:--',
      n1: a, n2: b,
      previsao: prev,
      real,
      acertou: erro <= 3
    });
  }

  const ultimos30 = [];
  const startIdx = Math.max(0, nums.length - 30);
  for (let i = startIdx; i < nums.length; i++) {
    ultimos30.push({
      num: nums[i],
      cor: nums[i] === 0 ? 'branco' : nums[i] <= 7 ? 'vermelho' : 'preto',
      hora: horas[i] || '--:--'
    });
  }

  const totalBrancos = idxBrancos.length;
  const taxaBranco = ((totalBrancos / nums.length) * 100).toFixed(1);
  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalos.push(idxBrancos[i] - idxBrancos[i - 1]);
  }
  const mediaIntervalo = intervalos.length > 0
    ? (intervalos.reduce((a, b) => a + b, 0) / intervalos.length).toFixed(1)
    : 0;

  let dica;
  if (status === 'atrasado') dica = 'Branco atrasou! 52% vem em +10 rodadas, 65% em +15. Mantenha atenção.';
  else if (status === 'iminente') dica = 'Branco pode sair nas próximas 1-3 rodadas!';
  else if (status === 'expirado') dica = 'Previsão expirou. Aguarde o próximo branco para novo ciclo.';
  else dica = `Faltam ~${Math.max(0, rodadasRestantes)} rodadas (~${Math.max(0, Math.round(rodadasRestantes * 0.5))} min) para a previsão.`;

  return {
    ultimoBranco: {
      posicao: ultimoBrancoIdx + 1,
      hora: ultimoBrancoHora,
      rodadasAtras: rodadasDesdeUltimo
    },
    formula: {
      n1, cor1: corNome(n1),
      n2, cor2: corNome(n2),
      coresDiferentes,
      resultado: previsaoRodadas
    },
    previsao: {
      rodadasPrevistas: previsaoRodadas,
      rodadasJaPassaram: rodadasDesdeUltimo,
      rodadasRestantes: Math.max(0, rodadasRestantes),
      tempoEstimado: Math.max(0, Math.round(rodadasRestantes * 0.5)) + ' min',
      status
    },
    sinais: {
      bloqueadoresVistos,
      favoraveisVistos,
      padraoCores: ultimas3,
      padraoAlerta,
      padraoBom,
      numNaPosPrevisao,
      bloqueadorExato,
      favoravelExato
    },
    confianca,
    historico,
    ultimos30,
    stats: {
      totalRodadas: nums.length,
      totalBrancos,
      taxaBranco: taxaBranco + '%',
      mediaIntervalo: mediaIntervalo + ' rodadas',
      ultimaBusca: state.ultimaBusca
    },
    dica
  };
}

function analisarHistoricoSinais() {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;

  if (nums.length < 10) return { erro: 'Dados insuficientes' };

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 3) return { erro: 'Poucos brancos' };

  const sinais = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    const idx = idxBrancos[i - 1];
    const realIdx = idxBrancos[i];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 < 0) continue;
    const a = nums[p1], b = nums[p2];
    if (a === 0 || b === 0) continue;

    const previsto = Math.max(a, b);
    const real = realIdx - idx;
    const diferencaMax = real - previsto;
    const acertouMax = Math.abs(diferencaMax) <= 3;

    const posAlvo = idx + previsto;
    let cadeiaPosicao = posAlvo;
    let cadeiaSaltos = 0;
    const cadeiaNumeros = [];

    if (posAlvo < realIdx && posAlvo < nums.length) {
      let pos = posAlvo;
      while (pos < realIdx && pos < nums.length && nums[pos] !== 0 && cadeiaSaltos < 10) {
        cadeiaNumeros.push(nums[pos]);
        pos += nums[pos];
        cadeiaSaltos++;
      }
      cadeiaPosicao = pos;
    }

    const erroCadeia = cadeiaPosicao - realIdx;
    const acertouCadeia = Math.abs(erroCadeia) <= 1;

    const horaBranco = horas[idx] || '--:--';
    const horaReal = horas[realIdx] || '--:--';

    sinais.push({
      horaBranco,
      horaReal,
      n1: a,
      n2: b,
      previsto,
      real,
      diferencaMax,
      acertouMax,
      cadeiaSaltos,
      cadeiaNumeros: cadeiaNumeros.join('→'),
      erroCadeia,
      acertouCadeia,
      acertou: acertouMax || acertouCadeia,
      metodo: cadeiaSaltos > 0 ? 'CADEIA' : 'MAX',
      status: (acertouMax || acertouCadeia)
        ? 'acertou'
        : (cadeiaSaltos > 0
          ? `cadeia +${erroCadeia}`
          : (diferencaMax > 0 ? `+${diferencaMax} atrasou` : `${diferencaMax} adiantou`))
    });
  }

  const total = sinais.length;
  const acertosTotal = sinais.filter(s => s.acertou).length;
  const acertosMax = sinais.filter(s => s.acertouMax).length;
  const casosCadeia = sinais.filter(s => s.cadeiaSaltos > 0);
  const acertosCadeia = casosCadeia.filter(s => s.acertouCadeia).length;

  return {
    sinais: sinais.reverse(),
    stats: {
      total,
      acertos: acertosTotal,
      erros: total - acertosTotal,
      taxa: total > 0 ? ((acertosTotal / total) * 100).toFixed(1) + '%' : '0%',
      acertosMaxDireto: acertosMax,
      taxaMax: total > 0 ? ((acertosMax / total) * 100).toFixed(1) + '%' : '0%',
      casosCadeia: casosCadeia.length,
      acertosCadeia,
      taxaCadeia: casosCadeia.length > 0 ? ((acertosCadeia / casosCadeia.length) * 100).toFixed(1) + '%' : '0%'
    }
  };
}

module.exports = { analisarPadraoX, analisarHistoricoSinais };
