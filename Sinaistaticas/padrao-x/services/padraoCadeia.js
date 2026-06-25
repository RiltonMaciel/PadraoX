const state = require('../state');

function analisarPadraoCadeia() {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;

  if (nums.length < 20) return { erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' };

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return { erro: 'Poucos brancos encontrados.' };

  let ultimoBrancoIdx = -1;
  let n1 = 0, n2 = 0;
  for (let bi = idxBrancos.length - 1; bi >= 0; bi--) {
    const idx = idxBrancos[bi];
    const p1 = idx - 2;
    const p2 = idx - 3;
    if (p2 < 0) continue;
    if (nums[p1] !== 0 && nums[p2] !== 0) {
      ultimoBrancoIdx = idx;
      n1 = nums[p1];
      n2 = nums[p2];
      break;
    }
  }
  if (ultimoBrancoIdx === -1) return { erro: 'Nenhum branco com vizinhos válidos encontrado.' };

  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';
  const rodadasDesdeUltimo = nums.length - 1 - ultimoBrancoIdx;

  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    intervalos.push(idxBrancos[i] - idxBrancos[i - 1]);
  }
  const sortedInt = [...intervalos].sort((a, b) => a - b);
  const medianaInt = sortedInt[Math.floor(sortedInt.length / 2)];
  const ultimos10 = intervalos.slice(-10);
  const mediaRecente = Math.round(ultimos10.reduce((a, b) => a + b, 0) / ultimos10.length);

  const maxVal = Math.max(n1, n2);
  const minVal = Math.min(n1, n2);
  const media = Math.ceil((n1 + n2) / 2);

  let estimativa;
  if (maxVal >= 10) {
    estimativa = Math.min(minVal + 2, media);
  } else if (maxVal >= 7) {
    estimativa = Math.max(media - 1, minVal);
  } else {
    estimativa = media;
  }
  estimativa = Math.min(estimativa, mediaRecente);

  const posAlvo = ultimoBrancoIdx + estimativa;

  const chain = [];
  let posAtual = posAlvo;
  let previsaoFinal = posAlvo;

  if (posAlvo < nums.length && nums[posAlvo] !== 0) {
    let passos = 0;
    while (posAtual < nums.length && nums[posAtual] !== 0 && passos < 2) {
      const n = nums[posAtual];
      const saltoReal = Math.min(n, 5);
      chain.push({ pos: posAtual, num: n, hora: horas[posAtual] || '--:--' });
      posAtual += saltoReal;
      passos++;
    }
    previsaoFinal = posAtual;
  } else if (posAlvo < nums.length && nums[posAlvo] === 0) {
    previsaoFinal = posAlvo;
  }

  const capFinal = ultimoBrancoIdx + Math.ceil(mediaRecente * 1.3);
  if (previsaoFinal > capFinal) previsaoFinal = capFinal;

  let rodadasRestantes = previsaoFinal - (nums.length - 1);
  const rodadasRestantesMinus1 = rodadasRestantes - 1;

  if (rodadasRestantes <= 0) rodadasRestantes = Math.max(1, Math.ceil(sortedInt[0] / 2));

  let status = 'aguardando';
  if (rodadasRestantes <= 0) status = 'atrasado';
  else if (rodadasRestantes <= 2) status = 'iminente';
  else if (rodadasRestantes <= 5) status = 'proximo';

  let confianca = 65;
  if (rodadasDesdeUltimo >= mediaRecente) confianca += 15;
  if (chain.length > 0) {
    const ultimoNum = chain[chain.length - 1].num;
    if (ultimoNum <= 5) confianca += 15;
    else if (ultimoNum <= 8) confianca += 5;
    else confianca -= 10;
  }
  if (chain.length <= 1) confianca += 10;
  if (rodadasDesdeUltimo >= mediaRecente * 1.5) confianca += 10;
  confianca = Math.max(15, Math.min(95, confianca));

  const ultimoNumCadeia = chain.length > 0 ? chain[chain.length - 1].num : 0;
  const riscoOvershoot = ultimoNumCadeia >= 8;

  const historicoCadeia = [];
  for (let i = idxBrancos.length - 2; i >= Math.max(0, idxBrancos.length - 8); i--) {
    const idx = idxBrancos[i];
    const real = idxBrancos[i + 1];
    const p1b = idx - 2, p2b = idx - 3;
    if (p2b < 0) continue;
    const a = nums[p1b], b = nums[p2b];
    if (a === 0 || b === 0) continue;
    const prev = Math.max(a, b);
    const alvo = idx + prev;
    if (alvo >= real) {
      historicoCadeia.push({ hora: horas[idx], tipo: 'MAX_DIRETO', acertou: alvo === real, erro: alvo - real });
      continue;
    }
    let pos = alvo, steps = 0;
    const ch = [];
    while (pos < real && steps < 10) {
      const n = nums[pos];
      ch.push(n);
      pos += n;
      steps++;
    }
    const erro = pos - real;
    historicoCadeia.push({
      hora: horas[idx], tipo: 'CADEIA', saltos: steps,
      cadeia: ch.join('→'), acertou: Math.abs(erro) <= 1, erro
    });
  }

  // Calcular delta para ajustar timestamps ao tempo real
  const horaAtualCadeia = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const ultimoDadoHora = horas[horas.length - 1] || '--:--';
  let deltaCadeia = 0;
  if (ultimoDadoHora !== '--:--') {
    const [dh, dm] = ultimoDadoHora.split(':').map(Number);
    const [rh, rm] = horaAtualCadeia.split(':').map(Number);
    const dadosM = dh * 60 + dm, realM = rh * 60 + rm;
    deltaCadeia = realM >= dadosM ? realM - dadosM : realM + 1440 - dadosM;
  }
  const ajustarHoraCadeia = (h) => {
    if (!h || h === '--:--' || deltaCadeia === 0) return h;
    const [hh, mm] = h.split(':').map(Number);
    const tot = ((hh * 60 + mm) + deltaCadeia + 1440) % 1440;
    return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
  };
  const historicoCadeiaAjustado = historicoCadeia.map(e => ({ ...e, hora: ajustarHoraCadeia(e.hora) }));

  return {
    ultimoBranco: { hora: ajustarHoraCadeia(ultimoBrancoHora), rodadasAtras: rodadasDesdeUltimo },
    padraoX: { n1, n2, max: maxVal, estimativa, mediaRecente, posAlvo, alvoJaPassou: posAlvo < nums.length },
    cadeia: { saltos: chain, totalSaltos: chain.length, previsaoFinal, posicaoMinus1: previsaoFinal - 1 },
    previsao: {
      rodadasRestantes: Math.max(1, rodadasRestantes),
      rodadasRestantesMinus1: Math.max(0, rodadasRestantesMinus1),
      tempoEstimadoSeg: Math.max(0, rodadasRestantes * 30),
      status, riscoOvershoot, ultimoNumCadeia
    },
    confianca,
    historicoCadeia: historicoCadeiaAjustado
  };
}

module.exports = { analisarPadraoCadeia };
