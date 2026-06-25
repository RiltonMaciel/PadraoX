// Componente: Padrão Cadeia
let cadeiaCountdown = 10;

async function carregarPadraoCadeia() {
  const el = document.getElementById('padraoCadeiaContent');
  try {
    const resp = await fetch('/api/padrao-cadeia');
    const d = await resp.json();

    if (d.erro) {
      el.innerHTML = `<p style="color:var(--red);font-size:13px;padding:10px 0;">${d.erro}</p>`;
      return;
    }

    const statusText = {
      aguardando: '⏳ Aguardando',
      proximo: '📡 Próximo',
      iminente: '🔥 IMINENTE',
      atrasado: '⚠️ Atrasado'
    }[d.previsao.status] || d.previsao.status;

    const confColor = d.confianca > 65 ? 'var(--green)' : d.confianca > 40 ? 'var(--yellow)' : 'var(--red)';

    // Cadeia visual
    let cadeiaHtml = '';
    if (d.cadeia.saltos.length > 0) {
      cadeiaHtml = `<div class="cadeia-flow">`;
      cadeiaHtml += `<div class="cadeia-step"><div class="cadeia-num c-branco">0</div></div>`;
      cadeiaHtml += `<span class="cadeia-arrow">+${d.padraoX.max}→</span>`;
      d.cadeia.saltos.forEach((s, i) => {
        const isLast = i === d.cadeia.saltos.length - 1;
        const cls = isLast ? (s.num >= 8 ? 'c-risco' : 'c-alvo') : (s.num >= 8 ? 'c-risco' : 'c-normal');
        cadeiaHtml += `<div class="cadeia-step"><div class="cadeia-num ${cls}">${s.num}</div>`;
        if (!isLast) cadeiaHtml += `<span class="cadeia-arrow">→</span>`;
        cadeiaHtml += `</div>`;
      });
      cadeiaHtml += `<span class="cadeia-arrow">→</span>`;
      cadeiaHtml += `<div class="cadeia-step"><div class="cadeia-num c-branco">?</div></div>`;
      cadeiaHtml += `</div>`;
    } else if (d.padraoX.alvoJaPassou) {
      cadeiaHtml = `<div class="cadeia-flow"><span style="color:var(--green);font-size:13px;font-weight:600;">Alvo direto — sem cadeia necessária</span></div>`;
    } else {
      cadeiaHtml = `<div class="cadeia-flow"><span style="color:var(--text-soft);font-size:13px;">Aguardando posição alvo ser alcançada...</span></div>`;
    }

    // Tempo
    const tempoMin = Math.floor(d.previsao.tempoEstimadoSeg / 60);
    const tempoSeg = d.previsao.tempoEstimadoSeg % 60;
    const tempoStr = tempoMin > 0 ? `~${tempoMin}m ${tempoSeg}s` : `~${tempoSeg}s`;

    // Overshoot
    let overshootHtml = '';
    if (d.previsao.riscoOvershoot) {
      overshootHtml = `<div class="cadeia-overshoot">⚠️ Último número = ${d.previsao.ultimoNumCadeia} (alto). Risco de overshoot — branco pode estar 1 casa ANTES.</div>`;
    }

    // Histórico
    let histHtml = '';
    if (d.historicoCadeia && d.historicoCadeia.length > 0) {
      histHtml = `<div class="cadeia-hist"><h4>Histórico da Cadeia</h4>`;
      d.historicoCadeia.forEach(h => {
        const icon = h.acertou ? '✅' : '❌';
        const cor = h.acertou ? 'var(--green)' : 'var(--red)';
        const info = h.tipo === 'CADEIA' ? `${h.saltos}x [${h.cadeia}]` : 'direto';
        histHtml += `<div class="cadeia-hist-row">
          <span style="color:${cor}">${icon}</span>
          <span style="color:var(--text-soft)">${h.hora}</span>
          <span>${info}</span>
          <span style="color:var(--text-soft);margin-left:auto">erro:${h.erro > 0 ? '+' : ''}${h.erro}</span>
        </div>`;
      });
      histHtml += `</div>`;
    }

    const novoCadeiaHtml = `
      <div class="cadeia-info-grid">
        <div class="cadeia-info-item">
          <label>Status</label>
          <span style="font-size:14px;color:${d.previsao.status==='iminente'?'var(--yellow)':d.previsao.status==='atrasado'?'var(--red)':'var(--text)'}">${statusText}</span>
        </div>
        <div class="cadeia-info-item">
          <label>MAX(${d.padraoX.n1},${d.padraoX.n2})</label>
          <span style="color:var(--primary)">${d.padraoX.max}</span>
        </div>
        <div class="cadeia-info-item">
          <label>Branco em</label>
          <span style="color:var(--green)">${d.previsao.rodadasRestantes}</span>
        </div>
        <div class="cadeia-info-item">
          <label>Ou (X-1)</label>
          <span style="color:var(--yellow)">${d.previsao.rodadasRestantesMinus1}</span>
        </div>
      </div>

      ${cadeiaHtml}

      <div class="cadeia-confianca">
        <div class="cadeia-confianca-fill" style="width:${d.confianca}%;background:${confColor}"></div>
      </div>
      <div class="cadeia-confianca-label">
        <span>Confiança (${d.cadeia.totalSaltos} salto${d.cadeia.totalSaltos!==1?'s':''})</span>
        <span style="color:${confColor};font-weight:700">${d.confianca}%</span>
      </div>

      ${overshootHtml}

      <div class="cadeia-dica">
        💡 ${d.previsao.status === 'iminente' ? 'Branco pode sair AGORA! Cubra posições X e X-1.' :
             d.previsao.status === 'atrasado' ? 'Cadeia já atingiu o alvo. Branco iminente ou já saiu.' :
             d.previsao.riscoOvershoot ? 'Número alto na cadeia — fique atento 1 casa antes.' :
             `Tempo estimado: ${tempoStr}. Cadeia com ${d.cadeia.totalSaltos} salto(s).`}
      </div>

      ${histHtml}
    `;
    setHTML(el, novoCadeiaHtml);
  } catch (e) {
    setHTML(el, `<p style="color:var(--red);font-size:13px;">${e.message}</p>`);
  }
}
