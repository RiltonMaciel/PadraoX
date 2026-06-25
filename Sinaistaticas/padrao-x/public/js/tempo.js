// Componente: Previsão por Tempo
let ultimosHorariosTempo = [];
let _previsoesTempoCache = []; // array completo de objetos {horaPrevista, metodo, tipo}
let _historicoCache = [];
let _filtroAtivo = 'todos';

function toggleCopiarTempo(e) {
  e.stopPropagation();
  const dd = document.getElementById('dropdownCopiarTempo');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function executarCopiarTempo() {
  if (_previsoesTempoCache.length === 0) return;

  const comV      = document.getElementById('tpyComV').checked;
  const comP      = document.getElementById('tpyComP').checked;
  const comAVG    = document.getElementById('tpyComAVG').checked;
  const comDiff   = document.getElementById('tpyComDiff').checked;
  const comCiclo  = document.getElementById('tpyComCiclo').checked;
  const comMetodo = document.getElementById('tpyComMetodo').checked;

  const filtrados = _previsoesTempoCache.filter(p => {
    if (p.tipo === 'CICLO') return comCiclo;
    const m = p.metodo || '';
    const temV   = /^V\d/i.test(m);
    const temP   = /^P\d/i.test(m) || /\+P\d/i.test(m);
    const temAVG = /^AVG/i.test(m);
    const temDiff= /^\|/.test(m);
    const outra  = !temV && !temP && !temAVG && !temDiff;
    if (temV   && comV)   return true;
    if (temP   && comP)   return true;
    if (temAVG && comAVG) return true;
    if (temDiff&& comDiff)return true;
    if (outra)            return true;
    return false;
  });

  if (filtrados.length === 0) {
    const btn = document.getElementById('btnCopiarTempo');
    btn.textContent = '❌ Nenhum';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
    document.getElementById('dropdownCopiarTempo').style.display = 'none';
    return;
  }

  const linhas = filtrados.map(p =>
    comMetodo ? `${p.horaPrevista} | ${p.metodo} ⚪🖤` : `${p.horaPrevista} ⚪🖤`
  );

  navigator.clipboard.writeText(linhas.join('\n')).then(() => {
    const btn = document.getElementById('btnCopiarTempo');
    btn.textContent = `✅ ${filtrados.length} copiados`;
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2500);
    document.getElementById('dropdownCopiarTempo').style.display = 'none';
  });
}

// mantida por compatibilidade (não usada mais)
function copiarHorariosTempo() { executarCopiarTempo(); }

function horaParaMinFront(h) {
  if (!h || h === '--:--') return null;
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

function badgeTaxa(taxa, tentativas) {
  if (taxa === null || tentativas < 5) {
    return { cor: '#7c8ca5', label: '—', title: tentativas > 0 ? `${tentativas} tentativas (mín. 5)` : 'Sem dados' };
  }
  if (taxa >= 50) return { cor: '#00ff95', label: `${taxa}%`, title: `${taxa}% de acerto (${tentativas} tentativas)` };
  if (taxa >= 30) return { cor: '#ffcc4d', label: `${taxa}%`, title: `${taxa}% de acerto (${tentativas} tentativas)` };
  return { cor: '#ff5667', label: `${taxa}%`, title: `${taxa}% de acerto (${tentativas} tentativas)` };
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

    // Mostra todas as previsões (passadas + futuras), marcando as passadas
    const agoraMin = horaParaMinFront(d.horaAtual) || 0;
    const futuras = d.previsoes; // sem filtro — mostra todas

    // Info do último branco
    const infoHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:12px;color:var(--text-soft)">
          Último branco: <strong style="color:var(--text)">${d.ultimoBranco.hora}</strong> (${d.ultimoBranco.tipo}) — ${d.ultimoBranco.minutosAtras}min atrás | Hora atual: ${d.horaAtual}
        </span>
      </div>`;

    ultimosHorariosTempo = futuras.map(p => p.horaPrevista);
    _previsoesTempoCache = futuras;

    // Cards de previsão
    let horasHtml = `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">`;
    futuras.forEach(p => {
      const pMin = horaParaMinFront(p.horaPrevista) || 0;
      const passou = pMin < agoraMin - 1;
      const badge = badgeTaxa(p.taxa, p.tentativas);
      const ehCiclo = p.tipo === 'CICLO';
      const borderColor = passou ? 'rgba(100,116,139,.2)' : ehCiclo ? 'rgba(100,116,139,.35)' : 'rgba(167,139,250,.3)';
      const bgColor     = passou ? 'rgba(100,116,139,.03)' : ehCiclo ? 'rgba(100,116,139,.06)' : 'rgba(167,139,250,.08)';
      const horaColor   = passou ? '#4b5563' : ehCiclo ? '#94a3b8' : '#a78bfa';
      const passouLabel = passou ? '<div style="position:absolute;top:5px;left:7px;font-size:9px;color:#4b5563">✓</div>' : '';
      const riscado     = passou ? 'text-decoration:line-through;' : '';
      horasHtml += `
        <div title="${badge.title}" style="background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:10px 16px 8px;text-align:center;min-width:85px;position:relative;opacity:${passou ? '0.45' : '1'}">
          ${passouLabel}
          <div style="position:absolute;top:5px;right:6px;font-size:9px;font-weight:700;color:${badge.cor}">${badge.label}</div>
          <div style="font-size:22px;font-weight:800;color:${horaColor};line-height:1.1;${riscado}">${p.horaPrevista}</div>
          <div style="font-size:9px;color:var(--text-soft);margin-top:4px">${p.metodo}</div>
        </div>`;
    });
    horasHtml += `</div>`;

    // Ranking de fórmulas
    let rankingHtml = '';
    if (d.ranking && d.ranking.length > 0) {
      rankingHtml = `
        <div style="margin-top:18px;border-top:1px solid rgba(167,139,250,.15);padding-top:12px;">
          <div style="font-size:10px;font-weight:600;color:var(--text-soft);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Ranking de Fórmulas (±1min)</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">`;
      d.ranking.forEach(r => {
        const badge = badgeTaxa(r.taxa, r.tentativas);
        rankingHtml += `
            <div title="${badge.title}" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:5px 9px;font-size:10px;display:flex;align-items:center;gap:5px;">
              <span style="color:var(--text)">${r.nome}</span>
              <span style="font-weight:700;color:${badge.cor}">${badge.label}</span>
              <span style="color:var(--text-soft);font-size:9px">${r.acertos}/${r.tentativas}</span>
            </div>`;
      });
      rankingHtml += `</div></div>`;
    }

    setHTML(el, infoHtml + horasHtml + rankingHtml);
  } catch (e) {
    setHTML(el, `<p style="color:var(--red);font-size:13px;">${e.message}</p>`);
  }
}

// ─── Modal de Histórico de Previsões ─────────────────────────────────────────

async function abrirHistoricoPrevisoes() {
  const modal = document.getElementById('modalHistoricoPrevisoes');
  modal.style.display = 'flex';
  document.getElementById('historicoPrevisoesList').innerHTML =
    '<p style="color:var(--text-soft);font-size:13px;">Carregando...</p>';

  try {
    const resp = await fetch('/api/historico-previsoes');
    _historicoCache = await resp.json();
    _filtroAtivo = 'todos';
    _renderizarHistorico();
  } catch (e) {
    document.getElementById('historicoPrevisoesList').innerHTML =
      `<p style="color:var(--red);font-size:13px;">Erro: ${e.message}</p>`;
  }
}

function fecharHistoricoPrevisoes() {
  document.getElementById('modalHistoricoPrevisoes').style.display = 'none';
}

function filtrarHistorico(filtro) {
  _filtroAtivo = filtro;
  ['Todos','Acertos','Falhas'].forEach(f => {
    const btn = document.getElementById('filtroHist' + f);
    if (btn) btn.style.background = filtro === f.toLowerCase()
      ? (f === 'Acertos' ? 'rgba(0,255,149,.12)' : f === 'Falhas' ? 'rgba(255,86,103,.12)' : 'rgba(167,139,250,.15)')
      : 'transparent';
  });
  _renderizarHistorico();
}

function _renderizarHistorico() {
  const lista = document.getElementById('historicoPrevisoesList');
  const summary = document.getElementById('historicoPrevisoesSummary');

  if (!_historicoCache || _historicoCache.length === 0) {
    lista.innerHTML = '<p style="color:var(--text-soft);font-size:13px;padding:20px 0;text-align:center;">Nenhum dado �?" precisa de pelo menos 2 brancos no histórico.</p>';
    summary.innerHTML = '';
    return;
  }

  const total   = _historicoCache.length;
  const acertos = _historicoCache.filter(h => h.acerto).length;
  const taxa    = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const taxaCor = taxa >= 50 ? '#00ff95' : taxa >= 30 ? '#ffcc4d' : '#ff5667';

  summary.innerHTML = `
    <span style="margin-right:14px;">Total: <strong style="color:var(--text)">${total}</strong></span>
    <span style="margin-right:14px;">�o. Acertos: <strong style="color:#00ff95">${acertos}</strong></span>
    <span style="margin-right:14px;">�O Falhas: <strong style="color:#ff5667">${total - acertos}</strong></span>
    <span>Taxa geral: <strong style="color:${taxaCor}">${taxa}%</strong></span>`;

  const filtrados = _filtroAtivo === 'acertos' ? _historicoCache.filter(h => h.acerto)
                  : _filtroAtivo === 'falhas'   ? _historicoCache.filter(h => !h.acerto)
                  : _historicoCache;

  if (filtrados.length === 0) {
    lista.innerHTML = '<p style="color:var(--text-soft);font-size:13px;padding:20px 0;text-align:center;">Nenhum resultado nesse filtro.</p>';
    return;
  }

  let html = `
    <div style="display:grid;grid-template-columns:80px 1fr 80px 70px;gap:0;font-size:10px;font-weight:600;color:var(--text-soft);padding:0 0 8px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.04em;">
      <span>Previsto</span><span>Cálculo</span><span>Branco real</span><span style="text-align:center">Resultado</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">`;

  filtrados.forEach(h => {
    const cor    = h.acerto ? '#00ff95' : '#ff5667';
    const icone  = h.acerto ? '✅' : '❌';
    const bgRow  = h.acerto ? 'rgba(0,255,149,.04)' : 'rgba(255,86,103,.04)';
    let diffTxt = '';
    if (h.diffMin !== null && h.diffMin !== undefined) {
      if (h.diffMin === 0)      diffTxt = 'exato';
      else if (h.diffMin > 0)   diffTxt = `branco veio +${h.diffMin}min depois`;
      else                      diffTxt = `branco veio ${Math.abs(h.diffMin)}min antes`;
    }

    html += `
      <div style="display:grid;grid-template-columns:80px 1fr 80px 70px;gap:0;background:${bgRow};border:1px solid ${h.acerto ? 'rgba(0,255,149,.1)' : 'rgba(255,86,103,.08)'};border-radius:8px;padding:8px 10px;align-items:center;">
        <span style="font-size:16px;font-weight:800;color:#a78bfa">${h.horaPrevista}</span>
        <span style="font-size:11px;color:var(--text-soft)">${h.metodo}</span>
        <div style="font-size:13px;">
          <span style="font-weight:700;color:var(--text);display:block">${h.brancoReal !== '--' ? h.brancoReal : '—'}</span>
          ${diffTxt ? `<span style="font-size:9px;color:${cor}">${diffTxt}</span>` : ''}
        </div>
        <span style="text-align:center;font-size:16px">${icone}</span>
      </div>`;
  });

  html += '</div>';
  lista.innerHTML = html;
}

// Fechar modais/dropdowns clicando fora
document.addEventListener('click', e => {
  const modal = document.getElementById('modalHistoricoPrevisoes');
  if (modal && e.target === modal) fecharHistoricoPrevisoes();

  // Fechar dropdown do histórico
  const ddHist = document.getElementById('dropdownCopiarHistorico');
  const btnHist = document.getElementById('btnCopiarHistorico');
  if (ddHist && ddHist.style.display !== 'none' && !ddHist.contains(e.target) && e.target !== btnHist) {
    ddHist.style.display = 'none';
  }

  // Fechar dropdown do tempo
  const ddTempo = document.getElementById('dropdownCopiarTempo');
  const btnTempo = document.getElementById('btnCopiarTempo');
  if (ddTempo && ddTempo.style.display !== 'none' && !ddTempo.contains(e.target) && e.target !== btnTempo) {
    ddTempo.style.display = 'none';
  }
});

function toggleCopiarHistorico(e) {
  e.stopPropagation();
  const dd = document.getElementById('dropdownCopiarHistorico');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function executarCopiarHistorico() {
  if (!_historicoCache || _historicoCache.length === 0) return;

  const comV      = document.getElementById('cpyComV').checked;
  const comP      = document.getElementById('cpyComP').checked;
  const comAVG    = document.getElementById('cpyComAVG').checked;
  const comDiff   = document.getElementById('cpyComDiff').checked;
  const soAcertos = document.getElementById('cpySoAcertos').checked;
  const comDesvio = document.getElementById('cpyComDesvio').checked;

  // Filtra pelo tipo de fórmula selecionado
  const filtrados = _historicoCache.filter(h => {
    if (soAcertos && !h.acerto) return false;
    const m = h.metodo || '';
    // Pelo menos uma categoria de fórmula deve estar marcada
    const temV    = /^V\d/i.test(m);
    const temP    = /^P\d/i.test(m) || /\+P\d/i.test(m);
    const temAVG  = /^AVG/i.test(m);
    const temDiff = /^\|/.test(m);
    const outra   = !temV && !temP && !temAVG && !temDiff;

    if (temV    && comV)    return true;
    if (temP    && comP)    return true;
    if (temAVG  && comAVG)  return true;
    if (temDiff && comDiff) return true;
    if (outra) return true; // fórmulas mistas (MULT, DIV2) sempre incluídas
    return false;
  });

  if (filtrados.length === 0) {
    const btn = document.getElementById('btnCopiarHistorico');
    btn.textContent = '❌ Nenhum';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
    document.getElementById('dropdownCopiarHistorico').style.display = 'none';
    return;
  }

  const linhas = filtrados.map(h => {
    const resultado = h.acerto ? '✅' : '❌';
    let desvio = '';
    if (comDesvio && h.diffMin !== null && h.diffMin !== undefined) {
      if (h.diffMin === 0)        desvio = ' (exato)';
      else if (h.diffMin > 0)     desvio = ` (+${h.diffMin}min depois)`;
      else                        desvio = ` (${Math.abs(h.diffMin)}min antes)`;
    }
    return `${h.horaPrevista} | ${h.metodo} → ${h.brancoReal}${desvio} ${resultado}`;
  });

  const texto = linhas.join('\n');
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById('btnCopiarHistorico');
    btn.textContent = `✅ ${filtrados.length} copiados`;
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2500);
    document.getElementById('dropdownCopiarHistorico').style.display = 'none';
  });
}

