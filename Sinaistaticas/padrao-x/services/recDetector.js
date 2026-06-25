const state = require('../state');
const { corLetra } = require('./helpers');

function analisarRec() {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;
  if (nums.length < 20) return { erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' };

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return { erro: 'Poucos brancos encontrados.' };

  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';

  const vizAntes = [];
  for (let k = ultimoBrancoIdx - 1; k >= Math.max(0, ultimoBrancoIdx - 10) && vizAntes.length < 6; k--) {
    if (nums[k] !== 0) vizAntes.push({ num: nums[k], cor: corLetra(nums[k]) });
  }

  const vermelhos = vizAntes.filter(v => v.cor === 'V');
  const t1 = vermelhos.length >= 2 ? vermelhos[0].num + vermelhos[1].num : null;
  const t2 = vizAntes.length >= 2 ? Math.abs(vizAntes[0].num - vizAntes[1].num) : null;

  const previsoes = [];
  if (t1 !== null && t1 > 0) previsoes.push({ valor: t1, metodo: 'T1' });
  if (t2 !== null && t2 > 0) previsoes.push({ valor: t2, metodo: 'T2' });

  if (previsoes.length === 0) {
    return {
      status: 'sem-dados',
      mensagem: 'Sem dados suficientes para calcular previsão T1/T2.',
      ultimoBranco: { hora: ultimoBrancoHora }
    };
  }

  const previsaoMin = Math.min(...previsoes.map(p => p.valor));
  const previsaoMax = Math.max(...previsoes.map(p => p.valor));

  // Usa hora real do sistema para não depender de dados congelados
  const horaAtualReal = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const horaUltimoDado = horas[horas.length - 1] || '--:--';
  let deltaMinutos = 0;
  if (horaUltimoDado !== '--:--') {
    const [dh, dm] = horaUltimoDado.split(':').map(Number);
    const [rh, rm] = horaAtualReal.split(':').map(Number);
    const dadosMin = dh * 60 + dm;
    const realMin = rh * 60 + rm;
    deltaMinutos = realMin >= dadosMin ? realMin - dadosMin : realMin + 1440 - dadosMin;
  }
  let minutosPassados = 0;
  if (ultimoBrancoHora !== '--:--') {
    const [bh, bm] = ultimoBrancoHora.split(':').map(Number);
    const bracoMinReal = (bh * 60 + bm + deltaMinutos) % 1440;
    const [rh, rm] = horaAtualReal.split(':').map(Number);
    const realMin = rh * 60 + rm;
    minutosPassados = realMin >= bracoMinReal ? realMin - bracoMinReal : realMin + 1440 - bracoMinReal;
  }

  const atraso = minutosPassados - previsaoMin;

  let nivelRec = 'seguro';
  let chanceRec = 0;
  let cor = '#00ff95';

  if (atraso >= 12) {
    nivelRec = 'confirmado'; chanceRec = 100; cor = '#ff5667';
  } else if (atraso >= 8) {
    nivelRec = 'certeza'; chanceRec = 91; cor = '#ff5667';
  } else if (atraso >= 7) {
    nivelRec = 'quase-certo'; chanceRec = 88; cor = '#ff5667';
  } else if (atraso >= 6) {
    nivelRec = 'provavel'; chanceRec = 77; cor = '#ffcc4d';
  } else if (atraso >= 5) {
    nivelRec = 'risco'; chanceRec = 68; cor = '#ffcc4d';
  } else if (atraso >= 4) {
    nivelRec = 'alerta'; chanceRec = 54; cor = '#ffcc4d';
  } else if (atraso >= 0) {
    nivelRec = 'atrasado'; chanceRec = 27; cor = '#7c8ca5';
  } else {
    nivelRec = 'seguro'; chanceRec = 0; cor = '#00ff95';
  }

  const stopLossMin = previsaoMin + 7;
  const stopLossSeg = previsaoMin + 8;

  // Cadeia viva
  let cadeiaViva = false;
  if (idxBrancos.length >= 2) {
    const penultimoBrancoIdx = idxBrancos[idxBrancos.length - 2];
    const vizPenultimo = [];
    for (let k = penultimoBrancoIdx - 1; k >= Math.max(0, penultimoBrancoIdx - 10) && vizPenultimo.length < 6; k--) {
      if (nums[k] !== 0) vizPenultimo.push({ num: nums[k], cor: corLetra(nums[k]) });
    }
    const vermPen = vizPenultimo.filter(v => v.cor === 'V');
    const t1Pen = vermPen.length >= 2 ? vermPen[0].num + vermPen[1].num : null;
    const t2Pen = vizPenultimo.length >= 2 ? Math.abs(vizPenultimo[0].num - vizPenultimo[1].num) : null;

    let gapReal = 0;
    if (horas[ultimoBrancoIdx] !== '--:--' && horas[penultimoBrancoIdx] !== '--:--') {
      const [uh, um] = horas[ultimoBrancoIdx].split(':').map(Number);
      const [ph, pm] = horas[penultimoBrancoIdx].split(':').map(Number);
      const uMin = uh * 60 + um;
      const pMin = ph * 60 + pm;
      gapReal = uMin >= pMin ? uMin - pMin : (uMin + 1440) - pMin;
    }

    if (t1Pen !== null && Math.abs(t1Pen - gapReal) <= 2) cadeiaViva = true;
    if (t2Pen !== null && Math.abs(t2Pen - gapReal) <= 2) cadeiaViva = true;
  }

  let acao = '', icone = '';
  if (nivelRec === 'seguro') { acao = 'Dentro do tempo previsto. Continue normalmente.'; icone = '✅'; }
  else if (nivelRec === 'atrasado') { acao = 'Branco atrasou levemente. Fique atento.'; icone = '⏳'; }
  else if (nivelRec === 'alerta') { acao = 'Atenção! Passando do previsto. Não aumente apostas.'; icone = '⚠️'; }
  else if (nivelRec === 'risco') { acao = 'RISCO! 68% de ser REC. Considere parar.'; icone = '🔶'; }
  else if (nivelRec === 'provavel') { acao = 'PROVÁVEL REC (77%). Pare de apostar em branco!'; icone = '🛑'; }
  else if (nivelRec === 'quase-certo' || nivelRec === 'certeza') { acao = 'REC CONFIRMADA (91%). NÃO aposte em branco!'; icone = '💀'; }
  else if (nivelRec === 'confirmado') { acao = 'REC 100% confirmada. Aguarde próximo ciclo.'; icone = '💀'; }

  // Ajustar hora do último branco para tempo real (aplicar delta)
  const adjustHoraRec = (h) => {
    if (!h || h === '--:--' || deltaMinutos === 0) return h;
    const [hh, mm] = h.split(':').map(Number);
    const tot = ((hh * 60 + mm) + deltaMinutos + 1440) % 1440;
    return String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
  };

  return {
    status: nivelRec, chanceRec, cor, icone, acao, cadeiaViva,
    ultimoBranco: { hora: adjustHoraRec(ultimoBrancoHora), minutosAtras: minutosPassados },
    previsao: { t1, t2, previsaoMin, previsaoMax, metodos: previsoes },
    atraso: Math.max(0, atraso),
    stopLoss: { limite7min: stopLossMin, limite8min: stopLossSeg, jaAtingiu7: atraso >= 7, jaAtingiu8: atraso >= 8 },
    tempoRestante: { ateStop7: Math.max(0, stopLossMin - minutosPassados), ateStop8: Math.max(0, stopLossSeg - minutosPassados) },
    horaAtual: horaAtualReal
  };
}

module.exports = { analisarRec };
