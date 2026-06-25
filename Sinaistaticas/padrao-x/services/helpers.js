// Constantes e funções auxiliares do Padrão X
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

function corNome(n) {
  if (n === 0) return 'Branco';
  if (n <= 7) return 'Vermelho';
  return 'Preto';
}

function formatarTempo(segundos) {
  if (segundos <= 0) return 'AGORA';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.round(segundos % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function somarMinutos(horaStr, min) {
  if (horaStr === '--:--') return '--:--';
  const [h, m] = horaStr.split(':').map(Number);
  const total = (h * 60 + m + min) % 1440;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

module.exports = {
  BLOQUEADORES, FAVORAVEIS, BLOQUEADORES_EXATOS, FAVORAVEIS_EXATOS,
  PADROES_ALERTA, PADROES_BOM,
  corLetra, corNome, formatarTempo, somarMinutos
};
