const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const state = require('./state');
const apiRoutes = require('./routes/api');
const { setupChat } = require('./routes/chat');
const { fetchTipMinerAPI } = require('./services/tipminer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/referencia', express.static(path.join(__dirname, '..', '..', 'referencia')));

// Rotas da API
app.use('/api', apiRoutes);

// Chat via Socket.io
setupChat(io);

// Iniciar servidor
server.listen(PORT, () => {
  console.log('Padrao X rodando em http://localhost:' + PORT);

  // Auto-fetch na inicializacao
  (async () => {
    try {
      console.log('[Startup] Buscando dados do TipMiner...');
      const rounds = await fetchTipMinerAPI(1000);
      if (rounds.length > 0) {
        state.historicoGlobal = rounds.map(r => {
          const n = parseInt(r.result);
          return isNaN(n) ? 0 : n;
        }).reverse();

        state.horariosGlobal = rounds.map(r => {
          const ts = r.time || r.date || r.created_at || r.createdAt || r.timestamp;
          if (ts) {
            if (typeof ts === 'string' && /^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
            const d = new Date(ts);
            if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          }
          return '--:--';
        }).reverse();

        state.ultimaBusca = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });
        console.log('[Startup] ' + state.historicoGlobal.length + ' rodadas carregadas com sucesso.');
      } else {
        console.log('[Startup] TipMiner retornou 0 resultados.');
      }
    } catch (e) {
      console.error('[Startup] Falha ao buscar TipMiner:', e.message);
    }
  })();
});
