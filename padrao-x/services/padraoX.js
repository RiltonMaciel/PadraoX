const state = require('../state');
const { formatarTempo } = require('./helpers');

function preverProximosBrancos(quantidade) {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;
  quantidade = Math.min(Math.max(parseInt(quantidade) || 10, 5), 1000);

  if (nums.length < 10) return { erro: 'Dados insuficientes' };

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }

  if (idxBrancos.length < 3) return { erro: 'Poucos brancos para calcular padrão' };

  const intervalosReais = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalosReais.push(idxBrancos[i] - idxBrancos[i - 1]);
  }

  const sorted = [...intervalosReais].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const mediana = sorted[Math.floor(sorted.length * 0.5)];
  const ultimos10 = intervalosReais.slice(-10);
  const mediaRecente = Math.round(ultimos10.reduce((a, b) => a + b, 0) / ultimos10.length);

  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;

  let n1 = 0, n2 = 0, brancoBase = ultimoBrancoIdx;
  for (let bi = idxBrancos.length - 1; bi >= 0; bi--) {
    const idx = idxBrancos[bi];
    const p1 = idx - 2, p2 = idx - 3;
    if (p2 >= 0 && nums[p1] !== 0 && nums[p2] !== 0) {
      brancoBase = idx;
      n1 = nums[p1];
      n2 = nums[p2];
      break;
    }
  }

  let previsaoRodadas;
  let metodo = 'SMART';
  let cadeiaSaltos = 0;

  if (n1 > 0 && n2 > 0) {
    const media = Math.ceil((n1 + n2) / 2);
    const maxVal = Math.max(n1, n2);
    const minVal = Math.min(n1, n2);

    let estimativa;
    if (maxVal >= 10) {
      estimativa = Math.min(minVal + 2, media);
    } else if (maxVal >= 7) {
      estimativa = Math.max(media - 1, minVal);
    } else {
      estimativa = media;
    }

    estimativa = Math.min(estimativa, mediaRecente);

    const posAlvo = brancoBase + estimativa;
    if (posAlvo < nums.length && nums[posAlvo] !== 0 && posAlvo > ultimoBrancoIdx) {
      let posAtual = posAlvo;
      let passos = 0;
      while (posAtual < nums.length && nums[posAtual] !== 0 && passos < 2) {
        const salto = Math.min(nums[posAtual], 5);
        posAtual += salto;
        passos++;
      }
      previsaoRodadas = posAtual - brancoBase;
      cadeiaSaltos = passos;
      metodo = 'SMART+CADEIA';
    } else {
      previsaoRodadas = estimativa;
    }

    if (brancoBase !== ultimoBrancoIdx) {
      const offset = ultimoBrancoIdx - brancoBase;
      previsaoRodadas = Math.max(previsaoRodadas - offset, mediaRecente);
      metodo = 'SMART(adj)';
    }
  } else {
    previsaoRodadas = mediaRecente;
    metodo = 'MEDIA';
  }

  let rodadasRestantes1 = previsaoRodadas - rodadasDesdeUltimo;

  if (rodadasRestantes1 <= 0) {
    rodadasRestantes1 = Math.min(3, Math.ceil(q1 / 3));
    metodo += '(IMIN)';
  }

  const agora = new Date();
  const SEGUNDOS_POR_RODADA = 30;
  const espacamento = Math.max(q1, 4);
  const previsoes = [];

  for (let i = 0; i < quantidade; i++) {
    let rodadasAteEste;

    if (i === 0) {
      rodadasAteEste = rodadasRestantes1;
    } else {
      rodadasAteEste = previsoes[i - 1].rodadasRestantes + espacamento;
    }

    const segundosAte = Math.max(0, rodadasAteEste) * SEGUNDOS_POR_RODADA;
    const horaPrevista = new Date(agora.getTime() + segundosAte * 1000);
    const horaFormatada = horaPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

    previsoes.push({
      ordem: i + 1,
      horario: horaFormatada,
      rodadasRestantes: Math.max(1, Math.round(rodadasAteEste)),
      tempoRestante: formatarTempo(segundosAte),
      metodo: i === 0 ? metodo : 'CICLO',
      cadeiaSaltos: i === 0 ? cadeiaSaltos : 0
    });
  }

  const formulaTexto = `AVG(${n1},${n2})=${Math.ceil((n1+n2)/2)} | Recente:${mediaRecente} | Q1:${q1}`;

  return {
    previsoes,
    formula: formulaTexto,
    metodo,
    cadeiaSaltos,
    medianaIntervalo: mediana,
    mediaRecente,
    q1,
    ultimoBranco: {
      hora: horas[ultimoBrancoIdx] || '--:--',
      rodadasAtras: rodadasDesdeUltimo
    },
    totalBrancos: idxBrancos.length,
    totalRodadas: nums.length
  };
}

module.exports = { preverProximosBrancos };
