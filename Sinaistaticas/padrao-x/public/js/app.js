// App principal — orquestra todos os componentes
async function atualizarTudo() {
  await buscarDados();
  await carregarPadraoCadeia();
  await carregarPrevisaoTempo();
  await carregarRecDetector();
  await carregarBot();
}

// Auto-refresh a cada 10 segundos
setInterval(() => {
  cadeiaCountdown--;
  const timerEl = document.getElementById('cadeiaTimer');
  if (timerEl) timerEl.textContent = `Atualiza em ${cadeiaCountdown}s`;
  if (cadeiaCountdown <= 0) {
    cadeiaCountdown = 10;
    atualizarTudo();
  }
}, 1000);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initChat();
  atualizarTudo();
  iniciarRefreshResultados();
});
