const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const Iron = require('@hapi/iron');
const { v5: uuidv5 } = require('uuid');
const XLSX = require('xlsx');
const { exec } = require('child_process');

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== TIPMINER API ==========
const TIPMINER_PW = '70c74c04-7426-4ab5-b9e6-14820a97a4d7';
const GAME_PID = '0194b478-7a59-73aa-96aa-2217057b286c';

function tipMinerKey(uuid) {
  const k = uuid.length >= 32 ? uuid : [uuid, TIPMINER_PW].join('').slice(0, 32);
  return uuidv5(k, uuid);
}

async function fetchTipMinerAPI(limit) {
  const url = `https://www.tipminer.com/api/v3/history/double/${GAME_PID}?timezone=America/Sao_Paulo&limit=${limit}&subject=filter`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'stack': 'redux', 'referer': 'https://www.tipminer.com' },
    timeout: 20000
  });
  if (!r.ok) throw new Error(`TipMiner HTTP ${r.status}`);
  const json = await r.json();
  const xcrypt = r.headers.get('X-Crypt');
  if (!xcrypt || !json.data) return Array.isArray(json) ? json : [];
  const seal = json.data.split('~')[0];
  const pw = tipMinerKey(GAME_PID);
  const decrypted = await Iron.unseal(seal, { '1': pw }, Iron.defaults);
  const parsed = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
  return Array.isArray(parsed) ? parsed : [];
}

// Pasta de saída dos arquivos Excel
const OUTPUT_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ========== ENDPOINT: EXPORTAR EXCEL ==========
app.post('/api/exportar', async (req, res) => {
  const { limit } = req.body;
  const lim = [200, 500, 1000, 2000].includes(limit) ? limit : 500;

  try {
    const rounds = await fetchTipMinerAPI(lim);
    if (!rounds || rounds.length === 0) {
      return res.json({ erro: 'Nenhum dado retornado pela API TipMiner.' });
    }

    // Montar dados para planilha
    const dados = rounds.map((r, idx) => {
      const num = parseInt(r.result);
      const cor = num === 0 ? 'Branco' : num <= 7 ? 'Vermelho' : 'Preto';
      const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp || '';
      let hora = '--:--';
      let data = '';
      if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) {
        hora = ts.slice(0, 5);
      } else if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          data = d.toLocaleDateString('pt-BR');
        }
      }
      return {
        '#': idx + 1,
        'Número': num,
        'Cor': cor,
        'Hora': hora,
        'Data': data || ''
      };
    });

    // Gerar Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);

    // Largura das colunas
    ws['!cols'] = [
      { wch: 6 },  // #
      { wch: 8 },  // Número
      { wch: 12 }, // Cor
      { wch: 8 },  // Hora
      { wch: 12 }  // Data
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

    // Nome do arquivo com timestamp
    const agora = new Date();
    const nomeArquivo = `blaze-double_${lim}resultados_${agora.toISOString().slice(0, 10)}_${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.xlsx`;
    const caminhoCompleto = path.join(OUTPUT_DIR, nomeArquivo);

    XLSX.writeFile(wb, caminhoCompleto);

    res.json({
      sucesso: true,
      arquivo: nomeArquivo,
      caminho: caminhoCompleto,
      rodadas: rounds.length,
      mensagem: `${rounds.length} resultados exportados com sucesso!`
    });
  } catch (err) {
    res.json({ erro: `Erro: ${err.message}` });
  }
});

// Abrir pasta de exports no explorador
app.post('/api/abrir-pasta', (req, res) => {
  exec(`explorer "${OUTPUT_DIR}"`);
  res.json({ sucesso: true });
});

// Listar arquivos gerados
app.get('/api/arquivos', (req, res) => {
  try {
    const arquivos = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => {
        const stat = fs.statSync(path.join(OUTPUT_DIR, f));
        return { nome: f, tamanho: (stat.size / 1024).toFixed(1) + ' KB', data: stat.mtime.toLocaleString('pt-BR') };
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
    res.json(arquivos);
  } catch (e) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  Blaze Excel Exporter rodando!           ║`);
  console.log(`  ║  http://localhost:${PORT}                   ║`);
  console.log(`  ║  Pasta: ${OUTPUT_DIR}`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
