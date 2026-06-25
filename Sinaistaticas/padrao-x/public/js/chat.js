// Componente: Chat em tempo real
let meuNome = '';
let chatAberto = false;
let msgsPendentes = 0;
let socket;

function initChat() {
  socket = io();

  document.getElementById('btnEntrar').onclick = entrarChat;
  document.getElementById('inputNome').addEventListener('keydown', e => { if (e.key === 'Enter') entrarChat(); });
  document.getElementById('chatTxt').addEventListener('keydown', e => { if (e.key === 'Enter') enviarMsg(); });

  // Se o usuário já entrou antes, pula o modal
  const nomeSalvo = localStorage.getItem('chat-nome');
  if (nomeSalvo) {
    meuNome = nomeSalvo;
    document.getElementById('modalNome').style.display = 'none';
    document.getElementById('chatWidget').style.display = 'block';
    socket.emit('entrar', meuNome);
  }

  socket.on('mensagem', (msg) => {
    const isMeu = msg.nome === meuNome;
    addMsg(`<div class="chat-msg ${isMeu ? 'meu' : 'outro'}"><span class="chat-nome">${msg.nome} • ${msg.hora}</span>${msg.texto}</div>`);
    if (!chatAberto && !isMeu) { msgsPendentes++; atualizarBadge(); }
  });

  socket.on('sistema', (data) => {
    addMsg(`<div class="chat-msg-sistema">${data.texto}</div>`);
  });

  socket.on('usuarios', (data) => {
    document.getElementById('chatOnline').textContent = `${data.total} online`;
  });

  socket.on('historico-chat', (msgs) => {
    msgs.forEach(msg => {
      const isMeu = msg.nome === meuNome;
      addMsg(`<div class="chat-msg ${isMeu ? 'meu' : 'outro'}"><span class="chat-nome">${msg.nome} • ${msg.hora}</span>${msg.texto}</div>`);
    });
  });
}

function entrarChat() {
  const nome = document.getElementById('inputNome').value.trim();
  if (!nome) return;
  meuNome = nome;
  localStorage.setItem('chat-nome', meuNome);
  document.getElementById('modalNome').style.display = 'none';
  document.getElementById('chatWidget').style.display = 'block';
  socket.emit('entrar', meuNome);
}

function toggleChat() {
  chatAberto = !chatAberto;
  document.getElementById('chatBox').classList.toggle('open', chatAberto);
  if (chatAberto) { msgsPendentes = 0; atualizarBadge(); }
}

function atualizarBadge() {
  const b = document.getElementById('chatBadge');
  if (msgsPendentes > 0) { b.style.display = 'flex'; b.textContent = msgsPendentes; }
  else { b.style.display = 'none'; }
}

function enviarMsg() {
  const input = document.getElementById('chatTxt');
  const texto = input.value.trim();
  if (!texto) return;
  socket.emit('mensagem', texto);
  input.value = '';
}

function addMsg(html) {
  const msgs = document.getElementById('chatMsgs');
  msgs.insertAdjacentHTML('beforeend', html);
  msgs.scrollTop = msgs.scrollHeight;
}
