// Componente: Previsão por Tempo
let ultimosHorariosTempo = [];

function copiarHorariosTempo() {
  if (ultimosHorariosTempo.length === 0) return;
  const texto = ultimosHorariosTempo.map(h => `${h} ⚪🖤`).join('\n');
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById('btnCopiarTempo');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar', 2000);
  });
}

async function carregarPrevisaoTempo() {
  const el = document.getElementById('previsaoTempoContent');
  try {
    const resp = await fetch('/api/previsao-tempo');
    const d = await resp.json();

    if (d.erro) {
      setHTML(el, `<p style="color:var(--red);font-size:13px;padding:10px 0;">${d.erro}</p>`);
      return;
    }

    // Info do último branco
    const infoHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:12px;color:var(--text-soft)">
          Último branco: <strong style="color:var(--text)">${d.ultimoBranco.hora}</strong> (${d.ultimoBranco.tipo}) — ${d.ultimoBranco.minutosAtras}min atrás | Hora atual: ${d.horaAtual}
        </span>
      </div>`;

    // Todos os horários previstos
    ultimosHorariosTempo = d.previsoes.map(p => p.horaPrevista);

    let horasHtml = `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">`;
    d.previsoes.forEach(p => {
      horasHtml += `
        <div style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.3);border-radius:12px;padding:12px 18px;text-align:center;min-width:90px;">
          <div style="font-size:24px;font-weight:800;color:#a78bfa">${p.horaPrevista}</div>
          <div style="font-size:9px;color:var(--text-soft);margin-top:3px">${p.metodo}</div>
        </div>`;
    });
    horasHtml += `</div>`;

    setHTML(el, infoHtml + horasHtml);
  } catch (e) {
    setHTML(el, `<p style="color:var(--red);font-size:13px;">${e.message}</p>`);
  }
}
