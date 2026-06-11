// Últimos Resultados — auto-refresh a cada 10s
let _resultadosTimer = null;

async function carregarUltimosResultados(limit) {
  limit = limit || 50;
  const el = document.getElementById('ultimosResultadosContent');
  if (!el) return;

  try {
    const resp = await fetch(`/api/ultimos-resultados?limit=${limit}`);
    const d = await resp.json();

    if (d.erro || !d.resultados || d.resultados.length === 0) {
      setHTML(el, '<p style="color:var(--text-soft);font-size:13px;">Sem dados disponíveis.</p>');
      return;
    }

    const countEl = document.getElementById('resultadosCount');
    if (countEl) countEl.textContent = `${d.exibindo} de ${d.total}`;

    const html = '<div class="resultados-grid">' + d.resultados.map(r => {
      const cls = r.cor === 'branco' ? 'cor-branco' : r.cor === 'vermelho' ? 'cor-vermelho' : 'cor-preto';
      return `<div class="resultado-item"><div class="resultado-ball ${cls}">${r.num}</div><span class="resultado-hora">${r.hora}</span></div>`;
    }).join('') + '</div>';

    setHTML(el, html);
  } catch (e) {
    console.error('Erro ao carregar resultados:', e);
  }
}

// Auto-refresh independente a cada 10s (não atrapalha o ciclo principal de 5s)
function iniciarRefreshResultados() {
  if (_resultadosTimer) return;
  carregarUltimosResultados(50);
  _resultadosTimer = setInterval(() => carregarUltimosResultados(50), 10000);
}

// Modal
function abrirModalResultados() {
  const modal = document.getElementById('modalResultados');
  if (modal) {
    modal.style.display = 'flex';
    carregarResultadosModal();
  }
}

function fecharModalResultados() {
  const modal = document.getElementById('modalResultados');
  if (modal) modal.style.display = 'none';
}

async function carregarResultadosModal() {
  const el = document.getElementById('modalResultadosContent');
  const select = document.getElementById('modalResultadosQtd');
  const limit = select ? parseInt(select.value) : 1000;

  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-soft);font-size:13px;">Carregando...</p>';

  try {
    const resp = await fetch(`/api/ultimos-resultados?limit=${limit}`);
    const d = await resp.json();

    if (d.erro || !d.resultados || d.resultados.length === 0) {
      el.innerHTML = '<p style="color:var(--text-soft);font-size:13px;">Sem dados.</p>';
      return;
    }

    const html = `
      <p style="font-size:12px;color:var(--text-soft);margin-bottom:12px;">Exibindo ${d.exibindo} de ${d.total} resultados (mais recente primeiro)</p>
      <div class="resultados-grid">${d.resultados.map(r => {
        const cls = r.cor === 'branco' ? 'cor-branco' : r.cor === 'vermelho' ? 'cor-vermelho' : 'cor-preto';
        return `<div class="resultado-item"><div class="resultado-ball ${cls}">${r.num}</div><span class="resultado-hora">${r.hora}</span></div>`;
      }).join('')}</div>`;

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--red);font-size:13px;">Erro: ${e.message}</p>`;
  }
}

// Fechar modal clicando fora
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalResultados');
  if (modal && e.target === modal) fecharModalResultados();
});
