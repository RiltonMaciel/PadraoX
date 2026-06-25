const MAX_HISTORY = 50;
const onlineUsers = new Map();
const chatHistory = [];

function setupChat(io) {
  io.on('connection', (socket) => {
    socket.on('entrar', (nome) => {
      const nomeClean = String(nome || '').trim().slice(0, 20);
      if (!nomeClean) return;
      onlineUsers.set(socket.id, nomeClean);
      io.emit('usuarios', { total: onlineUsers.size, lista: [...onlineUsers.values()] });
      socket.emit('historico-chat', chatHistory);
      io.emit('sistema', { texto: `${nomeClean} entrou no chat` });
    });

    socket.on('mensagem', (texto) => {
      const nome = onlineUsers.get(socket.id);
      if (!nome || !texto) return;
      const msg = {
        nome,
        texto: String(texto).slice(0, 300),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      };
      chatHistory.push(msg);
      if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
      io.emit('mensagem', msg);
    });

    socket.on('disconnect', () => {
      const nome = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      io.emit('usuarios', { total: onlineUsers.size, lista: [...onlineUsers.values()] });
      if (nome) io.emit('sistema', { texto: `${nome} saiu do chat` });
    });
  });
}

module.exports = { setupChat };
