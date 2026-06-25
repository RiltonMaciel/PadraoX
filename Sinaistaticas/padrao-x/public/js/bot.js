// Bot — Apostador Virtual com personalidade

async function carregarBot() {
  const el = document.getElementById('botContent');
  if (!el) return;
  try {
    const resp = await fetch('/api/bot-status');
    const d = await resp.json();
    renderizarBot(d);
  } catch (e) {
    if (el) el.innerHTML = `<p style="color:var(--red);font-size:14px;">Erro: ${e.message}</p>`;
  }
}

function renderizarBot(d) {
  const el = document.getElementById('botContent');
  if (!el) return;

  const lucroColor = d.banca.lucro >= 0 ? '#22c55e' : '#ef4444';
  const lucroSign = d.banca.lucro >= 0 ? '+' : '';

  const animacaoMap = {
    euforia: 'bot-bounce', medo: 'bot-shake', raiva: 'bot-shake',
    ansioso: 'bot-pulse', confiante: 'bot-bounce', alivio: 'bot-float',
    triste: 'bot-droop', pensativo: 'bot-float', neutro: '', determinado: 'bot-pulse'
  };
  const animClass = animacaoMap[d.emocao] || '';

  const balaoStyle = d.decisao === 'apostar'
    ? 'border-color:#22c55e;background:rgba(34,197,94,.08);'
    : d.decisao === 'recuar'
      ? 'border-color:#ef4444;background:rgba(239,68,68,.08);'
      : 'border-color:var(--border,#1e293b);background:rgba(255,255,255,.03);';

  const decisaoMap = {
    apostar: { txt: '💰 APOSTANDO', cor: '#22c55e' },
    aguardar: { txt: '⏳ AGUARDANDO', cor: '#94a3b8' },
    recuar: { txt: '🛑 RECUANDO', cor: '#ef4444' },
    parado: { txt: '⛔ STOP-LOSS', cor: '#ef4444' }
  };
  const dec = decisaoMap[d.decisao] || decisaoMap.aguardar;

  let histHtml = '';
  if (d.historico && d.historico.length > 0) {
    histHtml = d.historico.slice(0, 10).map(h => {
      const icon = h.tipo === 'green' ? '✅' : h.tipo === 'red' ? '❌' : h.tipo === 'pulou-rec' ? '🛡️' : '⏭️';
      const cor = h.tipo === 'green' ? '#22c55e' : h.tipo === 'red' ? '#ef4444' : '#94a3b8';
      const valor = h.valor ? (h.valor > 0 ? `+R$${h.valor.toFixed(0)}` : `R$${h.valor.toFixed(0)}`) : '';
      const casasInfo = h.casas ? ` em ${h.casas} casa${h.casas > 1 ? 's' : ''}` : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;">
        <span style="font-size:16px;">${icon}</span>
        <span style="color:${cor};font-weight:700;min-width:55px;">${h.hora}</span>
        <span style="color:#94a3b8;flex:1;font-size:12px;">${h.frase || ''}${casasInfo ? `<span style="color:${cor};font-weight:600;"> ${casasInfo}</span>` : ''}</span>
        <span style="color:${cor};font-weight:800;font-size:14px;">${valor}</span>
      </div>`;
    }).join('');
  }

  el.innerHTML = `
    <div class="bot-config-bar">
      <div class="bot-config-item">
        <label>Banca:</label>
        <input id="botBancaInput" type="number" value="${d.banca.inicial}" min="10" step="10">
      </div>
      <div class="bot-config-item">
        <label>Perfil:</label>
        <select id="botPerfilSelect" onchange="mudarPerfilBot()">
          <option value="normal" ${d.perfil.id === 'normal' ? 'selected' : ''}>🐢 Normal</option>
          <option value="corajoso" ${d.perfil.id === 'corajoso' ? 'selected' : ''}>🦁 Corajoso</option>
          <option value="agressivo" ${d.perfil.id === 'agressivo' ? 'selected' : ''}>🔥 Agressivo</option>
        </select>
      </div>
      <button onclick="configurarBancaBot()" class="bot-btn-apply">Aplicar</button>
      <button onclick="toggleBot()" class="bot-btn-toggle ${d.ativo ? 'ativo' : ''}">${d.ativo ? '⏹ Parar' : '▶ Iniciar'}</button>
    </div>

    <div class="bot-main-area">
      <div class="bot-avatar-box">
        <img src="${d.imagem}" alt="${d.emocao}" class="bot-img ${animClass}" onerror="this.src='/referencia/neutro.png'">
        <span class="bot-emocao-label">${d.emocao}</span>
      </div>
      <div class="bot-balao-box">
        <div class="bot-balao" style="${balaoStyle}">
          <div class="bot-fala">"${d.frase}"</div>
          <div class="bot-pensamento">${d.pensamento}</div>
        </div>
      </div>
    </div>

    <div class="bot-status-row">
      <span class="bot-decisao-badge" style="color:${dec.cor};background:${dec.cor}15;border-color:${dec.cor}55;">${dec.txt}</span>
      ${d.stake > 0 ? `<span class="bot-stake">R$ ${d.stake.toFixed(0)}</span>` : ''}
      ${d.stats.galeAtivo ? `<span class="bot-gale-badge">GALE ${d.stats.galeNivel}x</span>` : ''}
      <span class="bot-justificativa">${d.justificativa}</span>
    </div>

    <div class="bot-stats-grid">
      <div class="bot-stat-card">
        <div class="bot-stat-label">Banca</div>
        <div class="bot-stat-value">R$${d.banca.atual.toFixed(0)}</div>
      </div>
      <div class="bot-stat-card">
        <div class="bot-stat-label">Lucro</div>
        <div class="bot-stat-value" style="color:${lucroColor};">${lucroSign}R$${Math.abs(d.banca.lucro).toFixed(0)}</div>
      </div>
      <div class="bot-stat-card">
        <div class="bot-stat-label">Win Rate</div>
        <div class="bot-stat-value" style="color:#22c55e;">${d.stats.winRate}%</div>
      </div>
      <div class="bot-stat-card">
        <div class="bot-stat-label">Entradas</div>
        <div class="bot-stat-value">${d.stats.totalGreen + d.stats.totalRed}</div>
      </div>
    </div>

    <div class="bot-sinais-row">
      <span class="bot-sinal ${d.sinais.padraoX === 'iminente' ? 'on' : ''}">🎯 PX: ${d.sinais.padraoX || 'off'}</span>
      <span class="bot-sinal ${['iminente','proximo'].includes(d.sinais.cadeia) ? 'on' : ''}">🔗 Cadeia: ${d.sinais.cadeia || 'off'}</span>
      <span class="bot-sinal ${['iminente','proximo'].includes(d.sinais.tempo) ? 'on' : ''}">⏱ Tempo: ${d.sinais.tempo || 'off'}</span>
      <span class="bot-sinal ${d.sinais.rec === 'seguro' ? 'on' : 'danger'}">🛑 REC: ${d.sinais.rec}</span>
    </div>

    <div class="bot-acoes-row">
      <span class="bot-acoes-label">Resultado:</span>
      <button onclick="registrarResultadoBot('green')" class="bot-btn-green">✅ Green</button>
      <button onclick="registrarResultadoBot('red')" class="bot-btn-red">❌ Red</button>
      <button onclick="registrarResultadoBot('pulou')" class="bot-btn-skip">⏭ Pulou</button>
      <div class="bot-acoes-extra">
        <button onclick="resetarBancaBot()" class="bot-btn-warn">🔄 Banca</button>
        <button onclick="limparHistoricoBot()" class="bot-btn-danger">🗑 Hist.</button>
      </div>
    </div>

    ${histHtml ? `
    <div class="bot-historico">
      <div class="bot-historico-title">Histórico de Entradas</div>
      ${histHtml}
    </div>` : '<div style="font-size:14px;color:var(--text-soft);text-align:center;padding:30px;">Nenhuma entrada registrada ainda.</div>'}
  `;
}

async function configurarBancaBot() {
  const banca = document.getElementById('botBancaInput')?.value;
  const perfil = document.getElementById('botPerfilSelect')?.value;
  await fetch('/api/bot-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ banca: parseFloat(banca), perfil })
  });
  carregarBot();
}

async function mudarPerfilBot() {
  const perfil = document.getElementById('botPerfilSelect')?.value;
  await fetch('/api/bot-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil })
  });
  carregarBot();
}

async function toggleBot() {
  const resp = await fetch('/api/bot-status');
  const d = await resp.json();
  await fetch('/api/bot-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo: !d.ativo })
  });
  carregarBot();
}

async function registrarResultadoBot(tipo) {
  await fetch('/api/bot-resultado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo })
  });
  carregarBot();
}

async function resetarBancaBot() {
  await fetch('/api/bot-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetBanca: true })
  });
  carregarBot();
}

async function limparHistoricoBot() {
  await fetch('/api/bot-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limparHistorico: true })
  });
  carregarBot();
}
