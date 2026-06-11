const path = require('path');
const fs = require('fs');
const { analisarPadraoX } = require('./analise');
const { analisarPadraoCadeia } = require('./padraoCadeia');
const { analisarPrevisaoTempo } = require('./previsaoTempo');
const { analisarRec } = require('./recDetector');

// Carregar frases
const frasesPath = path.join(__dirname, '..', 'data', 'frases.json');
const FRASES = JSON.parse(fs.readFileSync(frasesPath, 'utf-8'));

// Estado do bot (persistente em memória durante a sessão)
const botState = {
  banca: 100,
  bancaInicial: 100,
  perfil: 'normal', // normal, corajoso, agressivo
  historico: [], // { hora, tipo:'green'|'red'|'pulou', valor, resultado, frase }
  ativo: true, // bot roda 24h por padrão
  ultimaDecisao: null,
  sequenciaLoss: 0,
  galeAtivo: false,
  galeNivel: 0,
  totalGreen: 0,
  totalRed: 0,
  lucroTotal: 0,
  // Auto-bet tracking
  apostaAberta: null // { fingerprint, stake, timestamp, rodadasVistas, rodadasParaVerificar }
};

// Perfis
const PERFIS = {
  normal: {
    nome: 'Normal',
    stakeMin: 2, stakeMax: 5,
    galeMax: 0,
    galeConfiancaMin: 999, // nunca faz gale
    sinaisMinimos: 1,
    aceitaRecAlerta: false,
    stopLossPct: 0.30,
    personalidade: 'cauteloso'
  },
  corajoso: {
    nome: 'Corajoso',
    stakeMin: 5, stakeMax: 15,
    galeMax: 1,
    galeConfiancaMin: 60,
    sinaisMinimos: 1,
    aceitaRecAlerta: true,
    stopLossPct: 0.50,
    personalidade: 'motivado'
  },
  agressivo: {
    nome: 'Agressivo',
    stakeMin: 15, stakeMax: 30,
    galeMax: 2,
    galeConfiancaMin: 0, // sempre faz gale
    sinaisMinimos: 1,
    aceitaRecAlerta: true,
    stopLossPct: 0.70,
    personalidade: 'intenso'
  }
};

function fraseAleatoria(emocao) {
  const lista = FRASES[emocao] || FRASES['neutro'];
  return lista[Math.floor(Math.random() * lista.length)];
}

function calcularConfiancaGeral(padraoX, cadeia, tempo, rec) {
  let sinais = 0;
  let confiancaTotal = 0;

  // Padrão X — aceita iminente, atrasado, ou poucas rodadas restantes
  if (padraoX && !padraoX.erro && padraoX.previsao) {
    const pxConf = padraoX.confianca || 0;
    const status = padraoX.previsao.status;
    const restantes = padraoX.previsao.rodadasRestantes;
    if (status === 'iminente' || status === 'atrasado') {
      sinais++;
      confiancaTotal += Math.max(pxConf, 60);
    } else if (restantes <= 10) {
      sinais++;
      confiancaTotal += pxConf;
    }
  }

  // Cadeia — aceita iminente, proximo, atrasado, ou poucas rodadas
  if (cadeia && !cadeia.erro && cadeia.previsao) {
    const cConf = cadeia.confianca || 0;
    const status = cadeia.previsao.status;
    const restantes = cadeia.previsao.rodadasRestantes;
    if (status === 'iminente' || status === 'proximo' || status === 'atrasado') {
      sinais++;
      confiancaTotal += Math.max(cConf, 55);
    } else if (restantes <= 10) {
      sinais++;
      confiancaTotal += cConf;
    }
  }

  // Tempo — aceita iminente, proximo, ou atrasado
  if (tempo && !tempo.erro && tempo.status) {
    if (tempo.status === 'iminente' || tempo.status === 'proximo' || tempo.status === 'atrasado') {
      sinais++;
      confiancaTotal += 70;
    }
  }

  const confiancaMedia = sinais > 0 ? Math.round(confiancaTotal / sinais) : 0;
  return { sinais, confiancaMedia };
}

function calcularStake(perfil, confiancaMedia, sinais) {
  const p = PERFIS[perfil];
  // Interpolação linear baseada na confiança
  const fator = Math.min(1, Math.max(0, (confiancaMedia - 30) / 70)); // 30-100 -> 0-1
  let stake = p.stakeMin + (p.stakeMax - p.stakeMin) * fator;

  // Sinais extras aumentam stake
  if (sinais >= 3) stake = p.stakeMax;

  // Arredondar para valores padrão
  const valoresPermitidos = [2, 5, 15, 30];
  stake = valoresPermitidos.reduce((prev, curr) =>
    Math.abs(curr - stake) < Math.abs(prev - stake) ? curr : prev
  );

  // Não ultrapassar o máximo do perfil
  stake = Math.min(stake, p.stakeMax);
  return stake;
}

function analisarBot() {
  const state = require('../state');
  const perfil = PERFIS[botState.perfil];
  const padraoX = analisarPadraoX();
  const cadeia = analisarPadraoCadeia();
  const tempo = analisarPrevisaoTempo();
  const rec = analisarRec();

  // === AUTO-RESOLUÇÃO DE APOSTA ABERTA ===
  if (botState.apostaAberta && state.historicoGlobal.length > 0) {
    const aposta = botState.apostaAberta;
    const currentEnd = state.historicoGlobal.slice(-5).join(',');

    // Detectar se houve mudança nos dados desde a aposta
    if (currentEnd !== aposta.fingerprint) {
      // Dados mudaram! Encontrar quantas rodadas novas surgiram
      const fp = aposta.fingerprint.split(',').map(Number);
      let matchIdx = -1;

      // Procurar onde o fingerprint antigo está no array atual
      for (let i = state.historicoGlobal.length - 6; i >= Math.max(0, state.historicoGlobal.length - 50); i--) {
        const slice = state.historicoGlobal.slice(i, i + 5);
        if (slice.join(',') === aposta.fingerprint) {
          matchIdx = i;
          break;
        }
      }

      if (matchIdx >= 0) {
        // Rodadas novas = tudo depois do fingerprint
        const rodadasNovas = state.historicoGlobal.slice(matchIdx + 5);
        const rodadasDesdeAposta = rodadasNovas.length;
        const brancoApareceu = rodadasNovas.includes(0);

        if (brancoApareceu) {
          // GREEN! Branco saiu
          resolverAposta('green');
        } else if (rodadasDesdeAposta >= aposta.rodadasParaVerificar) {
          // RED — branco não saiu no prazo
          resolverAposta('red');
        } else {
          // Atualizar contagem
          aposta.rodadasVistas = rodadasDesdeAposta;
        }
      } else {
        // Fingerprint não encontrado (muitas rodadas passaram) — resolver como red
        if (Date.now() - aposta.timestamp > 4 * 60 * 1000) {
          resolverAposta('red');
        }
      }
    }
  }

  // Verificar stop-loss diário
  const perdaMaxima = botState.bancaInicial * perfil.stopLossPct;
  const perdaAtual = botState.bancaInicial - botState.banca;
  const stopLossAtingido = perdaAtual >= perdaMaxima && botState.banca < botState.bancaInicial;

  // Verificar REC
  const recStatus = rec && !rec.erro ? rec.status : 'seguro';
  const recPerigoso = ['provavel', 'quase-certo', 'certeza', 'confirmado'].includes(recStatus);
  const recAlerta = recStatus === 'alerta' || recStatus === 'risco';
  const recBloqueante = recPerigoso || (recAlerta && !perfil.aceitaRecAlerta);

  // Calcular confiança
  const { sinais, confiancaMedia } = calcularConfiancaGeral(padraoX, cadeia, tempo, rec);
  const sinaisSuficientes = sinais >= perfil.sinaisMinimos;

  // Decisão
  let decisao = 'aguardar';
  let emocao = 'neutro';
  let stake = 0;
  let justificativa = '';
  let pensamento = '';

  if (stopLossAtingido) {
    decisao = 'parado';
    emocao = 'triste';
    justificativa = `Stop-loss diário atingido (perdi ${perdaAtual.toFixed(0)} de ${perdaMaxima.toFixed(0)} permitidos)`;
    pensamento = 'Chega por hoje. O stop-loss existe pra me proteger. Amanhã eu volto.';
  } else if (botState.apostaAberta) {
    // Tem aposta aberta — aguardando resultado
    const rodadasEsperando = botState.apostaAberta.rodadasVistas || 0;
    decisao = 'apostando';
    stake = botState.apostaAberta.stake;
    emocao = 'ansioso';
    justificativa = `Aposta de R$${stake} aberta — aguardando branco (${rodadasEsperando}/${botState.apostaAberta.rodadasParaVerificar} rodadas)`;
    pensamento = `Apostei R$${stake} no branco. Já passaram ${rodadasEsperando} rodadas... vamo ver!`;
  } else if (recBloqueante) {
    decisao = 'recuar';
    emocao = 'medo';
    justificativa = `REC ${recStatus} — chance ${rec.chanceRec || '?'}%. Não entro!`;
    pensamento = `O detector de REC tá em "${recStatus}". Vou ficar na minha até passar.`;
  } else if (botState.galeAtivo && botState.galeNivel > 0) {
    // Gale em andamento
    stake = calcularStake(botState.perfil, confiancaMedia, sinais) * Math.pow(2, botState.galeNivel);
    stake = Math.min(stake, botState.banca);
    if (stake > botState.banca) {
      decisao = 'recuar';
      emocao = 'medo';
      justificativa = 'Gale cancelado — banca insuficiente';
      pensamento = 'Ia fazer gale mas a banca não aguenta. Melhor parar.';
      botState.galeAtivo = false;
      botState.galeNivel = 0;
    } else {
      decisao = 'apostar';
      emocao = 'determinado';
      justificativa = `Gale nível ${botState.galeNivel} — recuperando loss anterior`;
      pensamento = `Perdi a anterior, mas o cenário ainda é favorável. Gale ${botState.galeNivel}x com R$${stake}.`;
    }
  } else if (sinaisSuficientes && !recBloqueante) {
    decisao = 'apostar';
    stake = calcularStake(botState.perfil, confiancaMedia, sinais);
    stake = Math.min(stake, botState.banca);
    emocao = confiancaMedia >= 65 ? 'confiante' : 'ansioso';
    justificativa = `${sinais} sinal${sinais > 1 ? 'is' : ''} alinhado${sinais > 1 ? 's' : ''}, confiança ${confiancaMedia}%`;
    pensamento = sinais >= 3
      ? `Três indicadores concordando! Confiança ${confiancaMedia}%. Vou com R$${stake}.`
      : sinais >= 2
        ? `Dois sinais confirmam. Confiança ${confiancaMedia}%. Entrada de R$${stake}.`
        : `Um sinal forte! Confiança ${confiancaMedia}%. Vou arriscar R$${stake}.`;
  } else {
    decisao = 'aguardar';
    emocao = 'neutro';
    justificativa = 'Nenhum sinal claro no momento';
    pensamento = 'Tudo quieto. Vou ficar monitorando sem pressa.';
  }

  // Se acabou de ganhar
  if (botState.historico.length > 0) {
    const ultimo = botState.historico[botState.historico.length - 1];
    if (ultimo.tipo === 'green' && (Date.now() - (ultimo.timestamp || 0)) < 15000) {
      emocao = 'euforia';
    }
    if (ultimo.tipo === 'pulou-rec' && (Date.now() - (ultimo.timestamp || 0)) < 15000) {
      emocao = 'alivio';
    }
    // Sequência de loss
    if (botState.sequenciaLoss >= 2 && decisao !== 'apostar') {
      emocao = 'raiva';
    }
  }

  const frase = fraseAleatoria(emocao);

  // === AUTO-COLOCAR APOSTA ===
  if (decisao === 'apostar' && !botState.apostaAberta && stake > 0) {
    botState.apostaAberta = {
      fingerprint: state.historicoGlobal.slice(-5).join(','),
      stake,
      timestamp: Date.now(),
      rodadasVistas: 0,
      rodadasParaVerificar: 8 // aguarda até 8 rodadas para branco sair
    };
  }

  botState.ultimaDecisao = {
    decisao,
    emocao,
    frase,
    stake,
    justificativa,
    pensamento,
    sinais,
    confiancaMedia,
    recStatus,
    perfil: botState.perfil,
    perfilNome: perfil.nome
  };

  return {
    decisao,
    emocao,
    imagem: `/referencia/${emocao}.png`,
    frase,
    pensamento,
    stake,
    justificativa,
    sinais: {
      total: sinais,
      confiancaMedia,
      padraoX: padraoX && !padraoX.erro ? padraoX.previsao?.status : null,
      cadeia: cadeia && !cadeia.erro ? cadeia.previsao?.status : null,
      tempo: tempo && !tempo.erro ? tempo.status : null,
      rec: recStatus
    },
    banca: {
      atual: botState.banca,
      inicial: botState.bancaInicial,
      lucro: botState.banca - botState.bancaInicial,
      lucroPct: ((botState.banca - botState.bancaInicial) / botState.bancaInicial * 100).toFixed(1)
    },
    perfil: {
      id: botState.perfil,
      nome: perfil.nome,
      galeMax: perfil.galeMax,
      stopLossPct: perfil.stopLossPct * 100
    },
    stats: {
      totalGreen: botState.totalGreen,
      totalRed: botState.totalRed,
      winRate: (botState.totalGreen + botState.totalRed) > 0
        ? ((botState.totalGreen / (botState.totalGreen + botState.totalRed)) * 100).toFixed(0)
        : '0',
      sequenciaLoss: botState.sequenciaLoss,
      galeAtivo: botState.galeAtivo,
      galeNivel: botState.galeNivel
    },
    apostaAberta: botState.apostaAberta ? {
      stake: botState.apostaAberta.stake,
      rodadasEsperando: botState.apostaAberta.rodadasVistas || 0,
      rodadasMax: botState.apostaAberta.rodadasParaVerificar
    } : null,
    historico: botState.historico.slice(-20).reverse(),
    ativo: botState.ativo,
    stopLossAtingido
  };
}

// Resolver aposta internamente (chamado pela auto-resolução dentro de analisarBot)
function resolverAposta(tipo) {
  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const stake = botState.apostaAberta?.stake || botState.ultimaDecisao?.stake || 5;

  if (tipo === 'green') {
    const lucro = stake * 13;
    botState.banca += lucro;
    botState.totalGreen++;
    botState.sequenciaLoss = 0;
    botState.galeAtivo = false;
    botState.galeNivel = 0;
    botState.lucroTotal += lucro;
    botState.historico.push({
      hora, tipo: 'green', valor: lucro,
      frase: fraseAleatoria('euforia'),
      stake,
      timestamp: Date.now()
    });
  } else if (tipo === 'red') {
    botState.banca -= stake;
    botState.totalRed++;
    botState.sequenciaLoss++;
    botState.lucroTotal -= stake;

    const perfil = PERFIS[botState.perfil];
    if (botState.galeNivel < perfil.galeMax) {
      botState.galeAtivo = true;
      botState.galeNivel++;
    } else {
      botState.galeAtivo = false;
      botState.galeNivel = 0;
    }

    const emocaoRed = botState.sequenciaLoss >= 2 ? 'raiva' : 'triste';
    botState.historico.push({
      hora, tipo: 'red', valor: -stake,
      frase: fraseAleatoria(emocaoRed),
      stake,
      galeProximo: botState.galeAtivo,
      timestamp: Date.now()
    });
  }

  botState.apostaAberta = null;
}

// Simular resultado de uma aposta (chamado manualmente via API)
function registrarResultado(tipo) {
  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const stake = botState.apostaAberta?.stake || botState.ultimaDecisao?.stake || 5;

  if (tipo === 'green') {
    // Branco paga 14x: lucro líquido = stake × 13 (recebe 14x menos o que apostou)
    const lucro = stake * 13;
    botState.banca += lucro;
    botState.totalGreen++;
    botState.sequenciaLoss = 0;
    botState.galeAtivo = false;
    botState.galeNivel = 0;
    botState.lucroTotal += lucro;
    botState.historico.push({
      hora, tipo: 'green', valor: lucro,
      frase: fraseAleatoria('euforia'),
      stake,
      timestamp: Date.now()
    });
  } else if (tipo === 'red') {
    // Perdeu a aposta: perde o stake
    botState.banca -= stake;
    botState.totalRed++;
    botState.sequenciaLoss++;
    botState.lucroTotal -= stake;

    // Verificar gale
    const perfil = PERFIS[botState.perfil];
    if (botState.galeNivel < perfil.galeMax) {
      botState.galeAtivo = true;
      botState.galeNivel++;
    } else {
      botState.galeAtivo = false;
      botState.galeNivel = 0;
    }

    const emocaoRed = botState.sequenciaLoss >= 2 ? 'raiva' : 'triste';
    botState.historico.push({
      hora, tipo: 'red', valor: -stake,
      frase: fraseAleatoria(emocaoRed),
      stake,
      galeProximo: botState.galeAtivo,
      timestamp: Date.now()
    });
  } else if (tipo === 'pulou') {
    botState.historico.push({
      hora, tipo: 'pulou',
      frase: fraseAleatoria('pensativo'),
      timestamp: Date.now()
    });
  } else if (tipo === 'pulou-rec') {
    botState.historico.push({
      hora, tipo: 'pulou-rec',
      frase: fraseAleatoria('alivio'),
      timestamp: Date.now()
    });
  }

  botState.apostaAberta = null;
  return analisarBot();
}

function configurarBot(config) {
  if (config.banca !== undefined) {
    botState.banca = parseFloat(config.banca) || 100;
    botState.bancaInicial = botState.banca;
  }
  if (config.perfil && PERFIS[config.perfil]) {
    botState.perfil = config.perfil;
  }
  if (config.ativo !== undefined) {
    botState.ativo = config.ativo;
  }
  if (config.resetBanca) {
    botState.banca = botState.bancaInicial;
    botState.sequenciaLoss = 0;
    botState.galeAtivo = false;
    botState.galeNivel = 0;
    botState.apostaAberta = null;
  }
  if (config.limparHistorico) {
    botState.historico = [];
    botState.totalGreen = 0;
    botState.totalRed = 0;
    botState.lucroTotal = 0;
    botState.sequenciaLoss = 0;
    botState.apostaAberta = null;
  }
  return analisarBot();
}

module.exports = { analisarBot, registrarResultado, configurarBot, botState };
