// Serviço: Histórico retroativo de previsões por tempo
const state = require('../state');

// ─── Utilidades locais ────────────────────────────────────────────────────────
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

function somarMin(horaStr, min) {
  const base = horaParaMin(horaStr);
  if (base === null) return '--:--';
  return minParaHora(base + min);
}

function diffAbsMin(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 1440 - d);
}

const RODADA_MIN = 0.5;

// ─── Gerar previsões de um branco — Padrão X conforme DESCOBERTAS.md ─────────
function gerarPrevisoesBranco(bIdx, nums, horas) {
  const bHora = horas[bIdx] || '--:--';
  if (bHora === '--:--') return [];

  // N1 = 1º não-branco antes, N2 = 2º não-branco antes
  const naoBrancos = [];
  for (let k = bIdx - 1; k >= 0 && naoBrancos.length < 3; k--) {
    if (nums[k] !== 0) naoBrancos.push({ num: nums[k], idx: k });
  }
  if (naoBrancos.length < 2) return [];

  const N1 = naoBrancos[0].num;
  const N2 = naoBrancos[1].num;
  const N3 = naoBrancos.length >= 3 ? naoBrancos[2].num : null;

  const raw = [];
  const visto = new Set();

  const add = (rodadas, metodo) => {
    if (rodadas > 0 && rodadas <= 80 && !visto.has(rodadas)) {
      visto.add(rodadas);
      raw.push({ rodadas, metodo });
    }
  };

  add(Math.max(N1, N2), `PX-MAX(${N1},${N2})=${Math.max(N1,N2)}`);
  add(Math.min(N1, N2), `PX-MIN(${N1},${N2})=${Math.min(N1,N2)}`);
  add(N1 + N2,          `PX-SOMA(${N1}+${N2})=${N1+N2}`);
  add(N1,               `PX-N1=${N1}`);
  add(N2,               `PX-N2=${N2}`);
  if (N3 !== null) add(Math.max(N1, N3), `PX-MAX(${N1},${N3})=${Math.max(N1,N3)} (N1,N3)`);

  // Cadeia a partir do alvo PX-MAX
  const alvoIdx = bIdx + Math.max(N1, N2);
  if (alvoIdx < nums.length) {
    let pos = alvoIdx;
    let passos = 0;
    const trail = [];
    while (pos < nums.length && passos < 6) {
      const n = nums[pos];
      trail.push(n);
      if (n === 0) break;
      pos += n;
      passos++;
    }
    const rodCadeia = pos - bIdx;
    if (rodCadeia > Math.max(N1, N2) && rodCadeia <= 80) {
      add(rodCadeia, `Cadeia(${trail.join('→')})=${rodCadeia}`);
    }
  }

  return raw.map(r => ({
    horaPrevista: somarMin(bHora, Math.round(r.rodadas * RODADA_MIN)),
    metodo: r.metodo,
    brancoBaseHora: bHora
  }));
}

// ─── Calcular histórico retroativo ───────────────────────────────────────────
function calcularHistoricoRetroativo() {
  const nums  = state.historicoGlobal;
  const horas = state.horariosGlobal;
  if (!nums || nums.length < 10) return [];

  const idxBrancos = [];
  for (let i = 0; i < nums.length; i++) if (nums[i] === 0) idxBrancos.push(i);
  if (idxBrancos.length < 2) return [];

  // Delta: diferença entre hora dos dados e hora real atual
  const horaAtualReal = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });
  const dadosMin = horaParaMin(horas[horas.length - 1] || '--:--');
  const realMin  = horaParaMin(horaAtualReal);
  let delta = 0;
  if (dadosMin !== null && realMin !== null) {
    delta = realMin >= dadosMin ? realMin - dadosMin : realMin + 1440 - dadosMin;
  }

  const historico = [];

  for (let bi = 0; bi < idxBrancos.length - 1; bi++) {
    const bIdx     = idxBrancos[bi];
    const nextBIdx = idxBrancos[bi + 1];

    // Hora real do branco seguinte (para exibição)
    const nextHoraDados = horas[nextBIdx] || '--:--';
    const nextMinDados  = horaParaMin(nextHoraDados);
    const nextHoraReal  = nextMinDados !== null
      ? minParaHora((nextMinDados + delta + 1440) % 1440)
      : '--:--';

    gerarPrevisoesBranco(bIdx, nums, horas).forEach(p => {
      const pMinDados = horaParaMin(p.horaPrevista);

      // Acerto: branco real veio no horário previsto ±1 min (em tempo dos dados)
      const acerto = pMinDados !== null && nextMinDados !== null
        && diffAbsMin(pMinDados, nextMinDados) <= 1;

      const diff = pMinDados !== null && nextMinDados !== null
        ? nextMinDados - pMinDados
        : null;

      // Converter horaPrevista para real time (para exibição)
      const horaPrevistaReal = pMinDados !== null
        ? minParaHora((pMinDados + delta + 1440) % 1440)
        : '--:--';

      historico.push({
        horaPrevista: horaPrevistaReal,
        metodo:       p.metodo,
        brancoReal:   nextHoraReal,
        acerto,
        diffMin:      diff  // positivo = branco veio depois, negativo = antes
      });
    });
  }

  // Mais recentes primeiro (últimos pares de brancos aparecem primeiro)
  return historico.reverse();
}

module.exports = { calcularHistoricoRetroativo };
