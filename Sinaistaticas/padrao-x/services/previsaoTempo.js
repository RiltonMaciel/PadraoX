const state = require('../state');
const { somarMinutos } = require('./helpers');

const TIPOS_NOME = {
  PX_MAX:    'PX MAX(N1,N2)',
  PX_MIN:    'PX MIN(N1,N2)',
  PX_SOMA:   'PX N1+N2',
  PX_N1:     'PX só N1',
  PX_N2:     'PX só N2',
  CADEIA:    'Cadeia PX',
};

// Cada rodada dura ~30s = 0.5min
const RODADA_MIN = 0.5;

function horaParaMin(h) {
  if (!h || h === '--:--') return null;
  const parts = h.split(':');
  const hh = parseInt(parts[0]), mm = parseInt(parts[1]);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

function minParaHora(m) {
  const total = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

function diffAbsMin(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 1440 - d);
}

function detectarTipo(metodo) {
  if (metodo.startsWith('PX-MAX'))   return 'PX_MAX';
  if (metodo.startsWith('PX-MIN'))   return 'PX_MIN';
  if (metodo.startsWith('PX-SOMA'))  return 'PX_SOMA';
  if (metodo.startsWith('PX-N1'))    return 'PX_N1';
  if (metodo.startsWith('PX-N2'))    return 'PX_N2';
  if (metodo.startsWith('Cadeia'))   return 'CADEIA';
  return 'OUTRO';
}

// Converte rodadas a partir do branco em hora prevista
function rodadasParaHora(bHora, rodadas) {
  const mins = Math.round(rodadas * RODADA_MIN);
  return somarMinutos(bHora, Math.max(1, mins));
}

function calcularPrevisoesBranco(bIdx, nums, horas) {
  const bHora = horas[bIdx] || '--:--';
  if (bHora === '--:--' || bIdx < 3) return [];

  // Posições absolutas: A=i-1 (imediato), B=i-2 (N1 clássico), C=i-3 (N2 clássico), D=i-4
  const A = nums[bIdx - 1];
  const B = nums[bIdx - 2];
  const C = nums[bIdx - 3];
  const D = bIdx >= 4 ? nums[bIdx - 4] : null;

  if (!B || !C) return [];

  const visto = new Set();
  const raw = [];

  const add = (rodadas, metodo) => {
    const r = Math.round(rodadas);
    if (r > 0 && r <= 80 && !visto.has(r)) {
      visto.add(r);
      raw.push({ rodadas: r, metodo });
    }
  };

  // ─── Padrão X clássico com B e C ────────────────────────────────────────
  add(Math.max(B, C),             `PX-MAX(${B},${C})=${Math.max(B,C)}`);
  add(Math.min(B, C),             `PX-MIN(${B},${C})=${Math.min(B,C)}`);
  add(B + C,                      `PX-SOMA(${B}+${C})=${B+C}`);
  add(B,                          `PX-N1(i-2)=${B}`);
  add(C,                          `PX-N2(i-3)=${C}`);

  // ─── Variantes incluindo A (imediato) ────────────────────────────────────
  if (A && A !== 0) {
    add(Math.max(A, B),           `PX-MAX(${A},${B})=${Math.max(A,B)} (i-1,i-2)`);
    add(Math.max(A, C),           `PX-MAX(${A},${C})=${Math.max(A,C)} (i-1,i-3)`);
    add(A + B,                    `PX-SOMA(${A}+${B})=${A+B} (i-1,i-2)`);
    add(A + C,                    `PX-SOMA(${A}+${C})=${A+C} (i-1,i-3)`);
    add(A,                        `PX-N(i-1)=${A}`);
    add(Math.round((A+B+C)/3),    `PX-AVG(${A},${B},${C})=${Math.round((A+B+C)/3)}`);
  }

  // ─── Variantes com D ─────────────────────────────────────────────────────
  if (D !== null && D !== 0) {
    add(Math.max(B, D),           `PX-MAX(${B},${D})=${Math.max(B,D)} (i-2,i-4)`);
    add(Math.max(C, D),           `PX-MAX(${C},${D})=${Math.max(C,D)} (i-3,i-4)`);
    add(B + C + D,                `PX-SOMA3(${B}+${C}+${D})=${B+C+D}`);
  }

  // ─── Cadeia a partir do alvo PX-MAX(B,C) ─────────────────────────────────
  const pxMaxBC = Math.max(B, C);
  const alvoIdx = bIdx + pxMaxBC;
  if (alvoIdx < nums.length) {
    let pos = alvoIdx;
    let passos = 0;
    const trail = [];
    while (pos < nums.length && passos < 8) {
      const n = nums[pos];
      trail.push(n);
      if (n === 0) break;
      pos += n;
      passos++;
    }
    const rodCadeia = pos - bIdx;
    if (rodCadeia > pxMaxBC && rodCadeia <= 80) {
      add(rodCadeia, `Cadeia(${trail.join('→')})=${rodCadeia}`);
    }
    // Cadeia parcial (apenas 1º salto)
    if (trail.length >= 1 && trail[0] !== 0) {
      add(pxMaxBC + trail[0], `Cadeia1(${pxMaxBC}+${trail[0]})=${pxMaxBC+trail[0]}`);
    }
    // Cadeia parcial (2 saltos)
    if (trail.length >= 2 && trail[0] !== 0 && trail[1] !== 0) {
      add(pxMaxBC + trail[0] + trail[1], `Cadeia2(${pxMaxBC}+${trail[0]}+${trail[1]})=${pxMaxBC+trail[0]+trail[1]}`);
    }
  }

  return raw.map(r => ({
    horaPrevista: rodadasParaHora(bHora, r.rodadas),
    metodo: r.metodo,
    tipo: detectarTipo(r.metodo),
    rodadas: r.rodadas
  }));
}


function analisarPrevisaoTempo() {
  const nums = state.historicoGlobal;
  const horas = state.horariosGlobal;
  if (nums.length < 20) return { erro: 'Dados insuficientes. Busque pelo menos 200 rodadas.' };

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) idxBrancos.push(i);
  }
  if (idxBrancos.length < 2) return { erro: 'Poucos brancos encontrados.' };

  // ─── 1. Calcular acurácia histórica por tipo de fórmula ─────────────────
  const stats = {};
  for (let bi = 0; bi < idxBrancos.length - 1; bi++) {
    const nextHora = horas[idxBrancos[bi + 1]] || '--:--';
    const nextMin = horaParaMin(nextHora);
    if (nextMin === null) continue;
    calcularPrevisoesBranco(idxBrancos[bi], nums, horas).forEach(p => {
      const pMin = horaParaMin(p.horaPrevista);
      if (pMin === null) return;
      if (!stats[p.tipo]) stats[p.tipo] = { acertos: 0, tentativas: 0 };
      stats[p.tipo].tentativas++;
      if (diffAbsMin(pMin, nextMin) <= 1) stats[p.tipo].acertos++;
    });
  }

  const ranking = Object.entries(stats)
    .filter(([tipo]) => tipo !== 'OUTRO')
    .map(([tipo, s]) => ({
      tipo, nome: TIPOS_NOME[tipo] || tipo,
      acertos: s.acertos, tentativas: s.tentativas,
      taxa: s.tentativas >= 3 ? Math.round((s.acertos / s.tentativas) * 100) : null
    }))
    .sort((a, b) => {
      if (a.taxa === null && b.taxa === null) return b.tentativas - a.tentativas;
      if (a.taxa === null) return 1;
      if (b.taxa === null) return -1;
      return b.taxa - a.taxa;
    });

  // ─── 2. Gerar previsões APENAS do último branco (estatisticamente correto) ──
  // Brancos anteriores já tiveram seu "próximo evento" realizado — usar
  // previsões deles junto com as do último branco mistura eventos distintos,
  // o que invalida a previsão. Só o último branco ainda aguarda o próximo.
  const ultimoBrancoIdx = idxBrancos[idxBrancos.length - 1];
  const ultimoBrancoHora = horas[ultimoBrancoIdx] || '--:--';
  const ehDuplo = (ultimoBrancoIdx > 0 && nums[ultimoBrancoIdx - 1] === 0) ||
                  (ultimoBrancoIdx < nums.length - 1 && nums[ultimoBrancoIdx + 1] === 0);

  const todasPrevisoes = calcularPrevisoesBranco(ultimoBrancoIdx, nums, horas);

  const vistosChave = new Set();
  const previsoesBruto = todasPrevisoes
    .filter(p => {
      const chave = `${p.horaPrevista}|${p.metodo}`;
      if (vistosChave.has(chave)) return false;
      vistosChave.add(chave);
      return true;
    })
    .sort((a, b) => (horaParaMin(a.horaPrevista) || 0) - (horaParaMin(b.horaPrevista) || 0));

  // ─── 3. Mediana dos intervalos entre brancos ────────────────────────────
  const intervalos = [];
  for (let i = 1; i < idxBrancos.length; i++) {
    const h1 = horaParaMin(horas[idxBrancos[i - 1]] || '--:--');
    const h2 = horaParaMin(horas[idxBrancos[i]] || '--:--');
    if (h1 !== null && h2 !== null) {
      const diff = h2 >= h1 ? h2 - h1 : h2 + 1440 - h1;
      if (diff > 0 && diff < 120) intervalos.push(diff);
    }
  }
  const mediana = intervalos.length > 0
    ? [...intervalos].sort((a, b) => a - b)[Math.floor(intervalos.length / 2)]
    : 5;

  // ─── 4. Ajustar para tempo real ─────────────────────────────────────────
  const horaAtualReal = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const dadosMin = horaParaMin(horas[horas.length - 1] || '--:--');
  const realMin = horaParaMin(horaAtualReal);
  let deltaMinutos = 0;
  if (dadosMin !== null && realMin !== null) {
    deltaMinutos = realMin >= dadosMin ? realMin - dadosMin : realMin + 1440 - dadosMin;
  }

  // Enriquecer com taxa e deslocar para tempo real
  const previsoesAjustadas = previsoesBruto.map(p => {
    const s = stats[p.tipo];
    return {
      horaPrevista: somarMinutos(p.horaPrevista, deltaMinutos),
      metodo: p.metodo,
      tipo: p.tipo,
      taxa: s && s.tentativas >= 5 ? Math.round((s.acertos / s.tentativas) * 100) : null,
      tentativas: s ? s.tentativas : 0
    };
  });

  const agoraMin = horaParaMin(horaAtualReal) || 0;

  // ─── 5. Hora real do último branco ──────────────────────────────────────
  let ultimoBrancoHoraReal = ultimoBrancoHora;
  let minutosPassados = 0;
  if (ultimoBrancoHora !== '--:--') {
    const bracoMinReal = ((horaParaMin(ultimoBrancoHora) || 0) + deltaMinutos) % 1440;
    minutosPassados = Math.max(0, agoraMin - bracoMinReal);
    if (deltaMinutos > 2) ultimoBrancoHoraReal = minParaHora(bracoMinReal);
  }

  return {
    ultimoBranco: { hora: ultimoBrancoHoraReal, tipo: ehDuplo ? 'DUPLO' : 'ÚNICO', minutosAtras: minutosPassados },
    previsoes: previsoesAjustadas,
    horaAtual: horaAtualReal,
    ranking,
    mediana
  };
}

module.exports = { analisarPrevisaoTempo };
