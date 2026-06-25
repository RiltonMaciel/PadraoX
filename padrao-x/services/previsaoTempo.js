const state = require('../state');
const { corLetra, somarMinutos } = require('./helpers');

function analisarPrevisaoTempo() {
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
  const ehDuplo = (ultimoBrancoIdx > 0 && nums[ultimoBrancoIdx - 1] === 0) ||
                  (ultimoBrancoIdx < nums.length - 1 && nums[ultimoBrancoIdx + 1] === 0);

  const previsoes = [];
  const maxBrancos = Math.min(idxBrancos.length, 10);

  for (let bi = idxBrancos.length - 1; bi >= idxBrancos.length - maxBrancos && bi >= 0; bi--) {
    const bIdx = idxBrancos[bi];
    const bHora = horas[bIdx] || '--:--';
    if (bHora === '--:--') continue;

    const vizAntes = [];
    for (let k = bIdx - 1; k >= Math.max(0, bIdx - 6) && vizAntes.length < 4; k--) {
      if (nums[k] !== 0) vizAntes.push({ num: nums[k], cor: corLetra(nums[k]) });
    }
    const vizDepois = [];
    for (let k = bIdx + 1; k < Math.min(nums.length, bIdx + 6) && vizDepois.length < 4; k++) {
      if (nums[k] !== 0) vizDepois.push({ num: nums[k], cor: corLetra(nums[k]) });
    }

    const todosViz = [...vizAntes, ...vizDepois];
    const vermelhos = todosViz.filter(v => v.cor === 'V');
    const pretos = todosViz.filter(v => v.cor === 'P');

    const doisAntes = [];
    for (let k = bIdx - 1; k >= 0 && doisAntes.length < 2; k--) {
      if (nums[k] !== 0) doisAntes.push(nums[k]);
    }

    // T1: Soma vermelhos
    if (vermelhos.length >= 2) {
      const v1 = vermelhos[0].num, v2 = vermelhos[1].num;
      const soma = v1 + v2;
      previsoes.push({ horaPrevista: somarMinutos(bHora, soma), metodo: `V${v1}+V${v2}=${soma}`, base: bHora });
      const mult = v1 * v2;
      if (mult <= 30 && mult !== soma) {
        previsoes.push({ horaPrevista: somarMinutos(bHora, mult), metodo: `V${v1}×V${v2}=${mult}`, base: bHora });
      }
    }

    // T2: Diferença dos 2 antes
    if (doisAntes.length >= 2) {
      const diff = Math.abs(doisAntes[0] - doisAntes[1]);
      if (diff > 0) {
        previsoes.push({ horaPrevista: somarMinutos(bHora, diff), metodo: `|${doisAntes[0]}-${doisAntes[1]}|=${diff}`, base: bHora });
      }
    }

    // T3: Soma pretos
    if (pretos.length >= 2) {
      const p1 = pretos[0].num, p2 = pretos[1].num;
      previsoes.push({ horaPrevista: somarMinutos(bHora, p1 + p2), metodo: `P${p1}+P${p2}=${p1+p2}`, base: bHora });
    }

    // T3b: Multiplicação dos 2 antes
    if (doisAntes.length >= 2) {
      const mult = doisAntes[0] * doisAntes[1];
      if (mult <= 45 && mult > 0) {
        previsoes.push({ horaPrevista: somarMinutos(bHora, mult), metodo: `${doisAntes[0]}×${doisAntes[1]}=${mult}`, base: bHora });
      }
    }
  }

  // Remover duplicados e ordenar
  const vistos = new Set();
  const previsoesFiltradas = previsoes
    .filter(p => {
      if (p.horaPrevista === '--:--') return false;
      if (vistos.has(p.horaPrevista)) return false;
      vistos.add(p.horaPrevista);
      return true;
    })
    .sort((a, b) => {
      const [ah, am] = a.horaPrevista.split(':').map(Number);
      const [bh, bm] = b.horaPrevista.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

  const agora = horas[horas.length - 1] || '--:--';
  let minutosPassados = 0;
  if (agora !== '--:--' && ultimoBrancoHora !== '--:--') {
    const [ah, am] = agora.split(':').map(Number);
    const [bh, bm] = ultimoBrancoHora.split(':').map(Number);
    const aMin = ah * 60 + am;
    const bMin = bh * 60 + bm;
    minutosPassados = aMin >= bMin ? aMin - bMin : (aMin + 1440) - bMin;
  }

  return {
    ultimoBranco: {
      hora: ultimoBrancoHora,
      tipo: ehDuplo ? 'DUPLO' : 'ÚNICO',
      minutosAtras: minutosPassados
    },
    previsoes: previsoesFiltradas,
    horaAtual: agora
  };
}

module.exports = { analisarPrevisaoTempo };
