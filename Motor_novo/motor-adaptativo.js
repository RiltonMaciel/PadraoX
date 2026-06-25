/**
 * MOTOR ADAPTATIVO — Blaze Double
 * 
 * Em vez de regras fixas, descobre automaticamente quais padrões
 * estão funcionando na janela atual (últimas N rodadas).
 * 
 * Uso:
 *   const motor = new MotorAdaptativo(historico, { janela: 500 });
 *   const sinal = motor.avaliar();
 */

class MotorAdaptativo {
  constructor(historico, opcoes = {}) {
    // historico = array de números (cronológico, mais antigo primeiro)
    this.historico = historico;
    this.janela = opcoes.janela || 500;
    this.zMinimo = opcoes.zMinimo || 1.96;
    this.amostraMinima = opcoes.amostraMinima || 15;
    this.padroesAtivos = null;
    this.ultimaCalibração = null;
  }

  // ========== CALIBRAR ==========
  // Descobre quais padrões estão significativos na janela atual
  calibrar() {
    const h = this.historico;
    const T = h.length;
    const inicio = Math.max(0, T - this.janela);
    const janela = h.slice(inicio);
    const J = janela.length;
    const brancos = janela.filter(n => n === 0).length;
    const baseRate = brancos / J;

    const padroes = [];

    // --- TESTE 1: Branco +1 após cada número ---
    for (let N = 0; N <= 14; N++) {
      let hits = 0, total = 0;
      for (let i = 0; i < J - 1; i++) {
        if (janela[i] === N) {
          total++;
          if (janela[i + 1] === 0) hits++;
        }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo) {
          padroes.push({
            tipo: 'apos_numero',
            parametro: N,
            taxa: hits / total,
            z,
            n: total,
            hits,
            descricao: `Branco +1 após ${N}`,
            direcao: z > 0 ? 'positivo' : 'negativo'
          });
        }
      }
    }

    // --- TESTE 2: Repetição 2x/3 de cada número ---
    for (let N = 1; N <= 14; N++) {
      let hits = 0, total = 0;
      for (let i = 3; i < J; i++) {
        const last3 = [janela[i - 1], janela[i - 2], janela[i - 3]];
        if (last3.filter(x => x === N).length >= 2) {
          total++;
          if (janela[i] === 0) hits++;
        }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo) {
          padroes.push({
            tipo: 'repeticao',
            parametro: N,
            taxa: hits / total,
            z,
            n: total,
            hits,
            descricao: `Rep ${N} (2x/3)`,
            direcao: z > 0 ? 'positivo' : 'negativo'
          });
        }
      }
    }

    // --- TESTE 3: Pares N+M nas últimas 4 ---
    for (let N = 0; N <= 14; N++) {
      for (let M = N + 1; M <= 14; M++) {
        let hits = 0, total = 0;
        for (let i = 4; i < J; i++) {
          const last4 = [janela[i - 1], janela[i - 2], janela[i - 3], janela[i - 4]];
          if (last4.includes(N) && last4.includes(M)) {
            total++;
            if (janela[i] === 0) hits++;
          }
        }
        if (total >= this.amostraMinima) {
          const z = this._zScore(hits, total, baseRate);
          if (Math.abs(z) >= this.zMinimo) {
            padroes.push({
              tipo: 'par',
              parametro: [N, M],
              taxa: hits / total,
              z,
              n: total,
              hits,
              descricao: `Par ${N}+${M} (últ4)`,
              direcao: z > 0 ? 'positivo' : 'negativo'
            });
          }
        }
      }
    }

    // --- TESTE 4: Distância do último branco (faixas) ---
    const faixas = [
      { min: 20, max: 29, label: 'Dist 20-29' },
      { min: 30, max: 39, label: 'Dist 30-39' },
      { min: 40, max: Infinity, label: 'Dist 40+' }
    ];

    // Calcular distâncias na janela
    const dists = new Array(J).fill(999);
    let lastB = -1;
    // Considerar brancos antes da janela para distância inicial
    for (let i = inicio - 1; i >= 0; i--) {
      if (h[i] === 0) { lastB = i - inicio; break; }
    }
    for (let i = 0; i < J; i++) {
      if (janela[i] === 0) lastB = i;
      dists[i] = lastB >= 0 ? i - lastB : 999;
    }

    for (const faixa of faixas) {
      let hits = 0, total = 0;
      for (let i = 0; i < J - 1; i++) {
        if (dists[i] >= faixa.min && dists[i] <= faixa.max) {
          total++;
          if (janela[i + 1] === 0) hits++;
        }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo) {
          padroes.push({
            tipo: 'distancia',
            parametro: faixa,
            taxa: hits / total,
            z,
            n: total,
            hits,
            descricao: faixa.label,
            direcao: z > 0 ? 'positivo' : 'negativo'
          });
        }
      }
    }

    // --- TESTE 5: Sequência de mesma cor ---
    for (const seqLen of [3, 4, 5]) {
      let hits = 0, total = 0;
      for (let i = seqLen; i < J; i++) {
        const prevNums = [];
        for (let j = 1; j <= seqLen; j++) prevNums.push(janela[i - j]);
        if (prevNums.every(n => n === 0)) continue; // ignora sequência de brancos
        const cores = prevNums.map(n => n === 0 ? 'B' : n <= 7 ? 'V' : 'P');
        if (cores.every(c => c === cores[0]) && cores[0] !== 'B') {
          total++;
          if (janela[i] === 0) hits++;
        }
      }
      if (total >= this.amostraMinima) {
        const z = this._zScore(hits, total, baseRate);
        if (Math.abs(z) >= this.zMinimo) {
          padroes.push({
            tipo: 'seq_cor',
            parametro: seqLen,
            taxa: hits / total,
            z,
            n: total,
            hits,
            descricao: `Seq ${seqLen}x mesma cor`,
            direcao: z > 0 ? 'positivo' : 'negativo'
          });
        }
      }
    }

    this.padroesAtivos = padroes.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    this.ultimaCalibração = {
      janela: J,
      baseRate,
      brancos,
      padroesEncontrados: padroes.length,
      timestamp: Date.now()
    };

    return this.padroesAtivos;
  }

  // ========== AVALIAR ==========
  // Dado o estado atual, retorna score e sinais ativos
  avaliar() {
    if (!this.padroesAtivos) this.calibrar();

    const h = this.historico;
    const T = h.length;
    const sinaisAtivos = [];
    let score = 0;

    for (const p of this.padroesAtivos) {
      let ativo = false;

      if (p.tipo === 'apos_numero') {
        // Último número é o parâmetro?
        if (h[T - 1] === p.parametro) ativo = true;
      }

      if (p.tipo === 'repeticao') {
        const last3 = h.slice(T - 3);
        if (last3.filter(x => x === p.parametro).length >= 2) ativo = true;
      }

      if (p.tipo === 'par') {
        const last4 = h.slice(T - 4);
        if (last4.includes(p.parametro[0]) && last4.includes(p.parametro[1])) ativo = true;
      }

      if (p.tipo === 'distancia') {
        // Calcular distância atual do último branco
        let dist = 0;
        for (let i = T - 1; i >= 0; i--) {
          if (h[i] === 0) { dist = T - 1 - i; break; }
          dist = T - i;
        }
        if (dist >= p.parametro.min && dist <= p.parametro.max) ativo = true;
      }

      if (p.tipo === 'seq_cor') {
        const prevNums = h.slice(T - p.parametro);
        const cores = prevNums.map(n => n === 0 ? 'B' : n <= 7 ? 'V' : 'P');
        if (cores.every(c => c === cores[0]) && cores[0] !== 'B') ativo = true;
      }

      if (ativo) {
        sinaisAtivos.push(p);
        // Peso proporcional ao Z-score
        if (p.direcao === 'positivo') {
          score += Math.min(p.z / 1.96, 3); // Cap em 3 pontos por sinal
        } else {
          score -= Math.min(Math.abs(p.z) / 1.96, 3);
        }
      }
    }

    // Decisão
    let decisao = 'AGUARDAR';
    let confianca = 0;

    if (sinaisAtivos.length === 0) {
      decisao = 'NEUTRO';
      confianca = 0;
    } else if (score >= 2) {
      decisao = 'APOSTAR';
      confianca = Math.min(score / 4 * 100, 100);
    } else if (score >= 1) {
      decisao = 'AGUARDAR (tendência positiva)';
      confianca = score / 4 * 100;
    } else if (score <= -1) {
      decisao = 'NÃO APOSTAR';
      confianca = Math.min(Math.abs(score) / 4 * 100, 100);
    }

    return {
      decisao,
      score: Math.round(score * 100) / 100,
      confianca: Math.round(confianca),
      sinaisAtivos,
      padroesTotais: this.padroesAtivos.length,
      calibracao: this.ultimaCalibração
    };
  }

  // ========== ADICIONAR RODADA ==========
  adicionarRodada(numero) {
    this.historico.push(numero);
    // Recalibrar a cada 50 rodadas novas
    if (!this.ultimaCalibração || this.historico.length - this.ultimaCalibração.janela > 50) {
      this.calibrar();
    }
  }

  // ========== Z-SCORE ==========
  _zScore(obs, n, p) {
    if (n === 0 || p === 0 || p === 1) return 0;
    return (obs / n - p) / Math.sqrt(p * (1 - p) / n);
  }

  // ========== RELATÓRIO ==========
  relatorio() {
    if (!this.padroesAtivos) this.calibrar();
    const cal = this.ultimaCalibração;
    const lines = [];
    lines.push(`=== MOTOR ADAPTATIVO ===`);
    lines.push(`Janela: ${cal.janela} rodadas | Base: ${(cal.baseRate * 100).toFixed(2)}% | Padrões: ${cal.padroesEncontrados}`);
    lines.push('');
    if (this.padroesAtivos.length === 0) {
      lines.push('Nenhum padrão significativo na janela atual.');
    } else {
      lines.push('Padrões ativos:');
      for (const p of this.padroesAtivos) {
        const dir = p.direcao === 'positivo' ? '🔥' : '🛡️';
        lines.push(`  ${dir} ${p.descricao}: ${(p.taxa * 100).toFixed(1)}% (${p.hits}/${p.n}) Z=${p.z.toFixed(2)}`);
      }
    }
    return lines.join('\n');
  }
}

module.exports = MotorAdaptativo;
