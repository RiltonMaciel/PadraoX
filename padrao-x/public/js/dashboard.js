// Componente: Dashboard principal (previsões + sinais)
function copiarPrevisoes() {
  const rows = document.querySelectorAll('#previsaoLista .prev-row');
  if (rows.length === 0) return;
  const linhas = [];
  rows.forEach(row => {
    const horario = row.querySelector('.horario')?.textContent?.trim();
    if (horario) linhas.push(`${horario} - branco`);
  });
  const texto = linhas.join('\n');
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById('btnCopiar');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar', 2000);
  });
}

let _dadosJaCarregados = false;

async function buscarDados() {
  const dashboard = document.getElementById('dashboard');
  const loadingEl = document.getElementById('estadoLoading');
  const isFirstLoad = !_dadosJaCarregados;
  if (isFirstLoad) {
    document.getElementById('estadoInicial').style.display = 'none';
    loadingEl.style.display = 'block';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch('/api/buscar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 1000 }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await resp.json();

    if (data.sucesso) {
      setText('sidebarHora', data.ultimaBusca);
      document.getElementById('sidebarLive').style.display = 'flex';
      await carregarPrevisoes();
    } else {
      console.error(data.mensagem || 'Erro ao buscar dados');
    }
  } catch (e) {
    console.error('Erro de conexão: ' + e.message);
  } finally {
    if (isFirstLoad) {
      loadingEl.style.display = 'none';
      dashboard.style.display = 'block';
    }
    _dadosJaCarregados = true;
  }
}

async function carregarPrevisoes() {
  try {
    const qtd = document.getElementById('qtdRange').value;
    const resp = await fetch(`/api/previsoes?quantidade=${qtd}`);
    const d = await resp.json();

    if (d.erro) {
      document.getElementById('estadoLoading').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      setHTML('previsaoLista', `<p style="color:var(--red);padding:20px;">${d.erro}</p>`);
      return;
    }

    document.getElementById('estadoLoading').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    // Info cards
    setText('formulaInfo', d.formula);
    setText('ultimoBrancoInfo', d.ultimoBranco.hora);
    setText('rodadasAtrasInfo', `${d.ultimoBranco.rodadasAtras} rodadas atrás`);
    setText('medianaInfo', String(d.medianaIntervalo));

    // Lista de previsões
    const novoHtml = d.previsoes.map(p => {
      let rowClass = '';
      if (p.rodadasRestantes === 0) rowClass = 'agora';
      else if (p.rodadasRestantes <= 3) rowClass = 'iminente';

      const metodoTag = p.metodo === 'CADEIA'
        ? `<span style="font-size:10px;background:rgba(34,197,94,.12);color:var(--green);padding:2px 6px;border-radius:6px;font-weight:600;">CADEIA ${p.cadeiaSaltos}x</span>`
        : p.metodo === 'MAX'
        ? `<span style="font-size:10px;background:rgba(91,92,255,.12);color:var(--primary);padding:2px 6px;border-radius:6px;font-weight:600;">MAX</span>`
        : '';

      return `
        <div class="prev-row ${rowClass}">
          <span class="ordem">#${p.ordem}</span>
          <div class="ball-white">0</div>
          <span class="horario">${p.horario}</span>
          <span class="tempo-restante">${p.tempoRestante}</span>
          ${metodoTag}
          <span class="rodadas-info">em ${p.rodadasRestantes} rodadas</span>
        </div>
      `;
    }).join('');
    setHTML('previsaoLista', novoHtml);

    // Carregar sinais passados
    await carregarSinais();

  } catch (e) {
    console.error('Erro ao carregar previsões:', e);
  }
}

async function carregarSinais() {
  try {
    const resp = await fetch('/api/historico-sinais');
    const d = await resp.json();

    if (d.erro) {
      setHTML('sinaisLista', `<p style="color:var(--text-soft)">${d.erro}</p>`);
      return;
    }

    // Taxa de acerto
    const taxaEl = document.getElementById('taxaAcerto');
    const pct = parseFloat(d.stats.taxa);
    const taxaText = `${d.stats.acertos}/${d.stats.total} (${d.stats.taxa})`;
    if (taxaEl.textContent !== taxaText) {
      taxaEl.textContent = taxaText;
      taxaEl.style.background = pct >= 30 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
      taxaEl.style.color = pct >= 30 ? 'var(--green)' : 'var(--red)';
    }

    // Lista de sinais
    const novoHtml = d.sinais.map(s => {
      const icon = s.acertou ? '✅' : '❌';
      const resClass = s.acertou ? 'acertou' : 'errou';

      let resText;
      if (s.acertou) {
        resText = s.metodo === 'CADEIA' ? `CADEIA ±${Math.abs(s.erroCadeia)}` : 'MAX ✓';
      } else {
        resText = s.metodo === 'CADEIA' ? `+${s.erroCadeia} passou` : `${s.status}`;
      }

      const metodoTag = s.metodo === 'CADEIA'
        ? `<span style="font-size:10px;background:rgba(34,197,94,.08);color:var(--green);padding:1px 5px;border-radius:4px;">${s.cadeiaSaltos}x [${s.cadeiaNumeros}]</span>`
        : '';

      return `
        <div class="sinal-row">
          <span class="sinal-icon">${icon}</span>
          <span class="sinal-hora">${s.horaBranco}</span>
          <span class="sinal-formula">MAX(${s.n1},${s.n2})=${s.previsto}</span>
          ${metodoTag}
          <span class="sinal-resultado ${resClass}">${resText}</span>
        </div>
      `;
    }).join('');
    setHTML('sinaisLista', novoHtml);

  } catch (e) {
    console.error('Erro ao carregar sinais:', e);
  }
}
