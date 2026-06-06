// Componente: Detector de REC
async function carregarRecDetector() {
  const el = document.getElementById('recDetectorContent');
  if (!el) return;
  try {
    const resp = await fetch('/api/rec-detector');
    const d = await resp.json();

    if (d.erro) {
      el.innerHTML = `<p style="color:var(--red);font-size:13px;padding:10px 0;">${d.erro}</p>`;
      return;
    }
    if (d.status === 'sem-dados') {
      el.innerHTML = `<p style="color:var(--text-soft);font-size:13px;">${d.mensagem}</p>`;
      return;
    }

    const maxBarra = d.previsao.previsaoMin + 12;
    const progresso = Math.min(100, (d.ultimoBranco.minutosAtras / maxBarra) * 100);
    const marcPrev = (d.previsao.previsaoMin / maxBarra) * 100;
    const marcStop = ((d.previsao.previsaoMin + 7) / maxBarra) * 100;

    const statusMap = {
      'seguro': '✅ Seguro',
      'atrasado': '⏳ Atrasou',
      'alerta': '⚠️ Alerta',
      'risco': '🔶 Risco 68%',
      'provavel': '🛑 Provável REC 77%',
      'quase-certo': '💀 REC 88%',
      'certeza': '💀 REC 91%',
      'confirmado': '💀 REC 100%'
    };

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${d.cor}22;color:${d.cor};border:1px solid ${d.cor}55">${statusMap[d.status] || d.status}</span>
        <span style="font-size:12px;color:var(--text-soft)">Último branco: ${d.ultimoBranco.hora} — ${d.ultimoBranco.minutosAtras}min atrás</span>
      </div>

      <div style="padding:16px;border-radius:12px;background:${d.cor}12;border:2px solid ${d.cor}44;margin:12px 0;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">${d.icone}</div>
        <div style="font-size:14px;font-weight:700;color:${d.cor}">${d.acao}</div>
        ${d.cadeiaViva ? '<div style="font-size:11px;color:#f59e0b;margin-top:6px">⚡ Cadeia viva — branco foi previsto pelo anterior</div>' : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:14px 0;">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-soft)">Previsto</div>
          <div style="font-size:18px;font-weight:800;color:#60a5fa">${d.previsao.previsaoMin}min</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-soft)">Passou</div>
          <div style="font-size:18px;font-weight:800;color:${d.cor}">${d.ultimoBranco.minutosAtras}min</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-soft)">Atraso</div>
          <div style="font-size:18px;font-weight:800;color:${d.atraso >= 7 ? '#ef4444' : d.atraso >= 4 ? '#f59e0b' : '#22c55e'}">+${d.atraso}min</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-soft)">Chance REC</div>
          <div style="font-size:18px;font-weight:800;color:${d.cor}">${d.chanceRec}%</div>
        </div>
      </div>

      <div style="margin:14px 0">
        <div style="font-size:11px;color:var(--text-soft);margin-bottom:6px;display:flex;justify-content:space-between">
          <span>0min</span>
          <span style="color:#60a5fa">Prev: ${d.previsao.previsaoMin}min</span>
          <span style="color:#ef4444">Stop: +7min</span>
        </div>
        <div style="position:relative;height:12px;border-radius:6px;background:var(--border);overflow:visible">
          <div style="position:absolute;left:0;top:0;height:100%;width:${progresso}%;border-radius:6px;background:${d.cor};transition:width 0.5s"></div>
          <div style="position:absolute;left:${marcPrev}%;top:-3px;width:2px;height:18px;background:#60a5fa;border-radius:1px"></div>
          <div style="position:absolute;left:${marcStop}%;top:-3px;width:2px;height:18px;background:#ef4444;border-radius:1px"></div>
        </div>
      </div>

      <div style="margin-top:14px;padding:10px;background:rgba(0,0,0,.2);border-radius:10px;border:1px solid var(--border)">
        <div style="font-size:10px;color:var(--text-soft);margin-bottom:6px;font-weight:700">Régua de risco (2000 resultados):</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:10px">
          <div style="padding:4px 6px;border-radius:6px;background:#052e16;color:#22c55e;text-align:center">+0-4min<br><b>~50%</b></div>
          <div style="padding:4px 6px;border-radius:6px;background:#451a03;color:#f59e0b;text-align:center">+5-6min<br><b>68-77%</b></div>
          <div style="padding:4px 6px;border-radius:6px;background:#450a0a;color:#ef4444;text-align:center">+7-8min<br><b>88-91%</b></div>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text-soft)">
        <span>T1(V+V)=${d.previsao.t1 || '--'}</span>
        <span>T2(|N1-N2|)=${d.previsao.t2 || '--'}</span>
        <span>Base: ${d.previsao.previsaoMin}min</span>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--red);font-size:13px;">Erro: ${e.message}</p>`;
  }
}
