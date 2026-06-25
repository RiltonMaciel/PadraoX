/**
 * BUSCA EXAUSTIVA — Qual condição prevê branco com ≥90% de acerto?
 * Testa centenas de combinações com dados reais (1000 rodadas com timestamp)
 */
const XLSX = require('xlsx');
const wb = XLSX.readFile('tipminer-dados-blaze-double (13).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);
const dados = raw.filter(r => typeof r['Número'] === 'number' && r['Horário']);
dados.reverse();

const nums = dados.map(d => d['Número']);
const horas = dados.map(d => {
  const [h,m,s] = d['Horário'].split(':').map(Number);
  const dia = parseInt(d.Data.split('/')[0]);
  return h*60+m+s/60 + (dia===30?1440:0);
});

const N = nums.length;
const resultados = [];

// Helper: distância até próximo branco a partir da posição i
function distProxBranco(i) {
  for (let j = i+1; j < N; j++) {
    if (nums[j] === 0) return j - i;
  }
  return 999;
}

// Helper: distância desde último branco até posição i
function distUltBranco(i) {
  for (let j = i-1; j >= 0; j--) {
    if (nums[j] === 0) return i - j;
  }
  return i;
}

// ===== TESTE A: Distância desde último branco >= X → branco em Y rodadas =====
for (let distMin = 10; distMin <= 50; distMin += 2) {
  for (let janela = 3; janela <= 20; janela++) {
    let hits = 0, total = 0;
    for (let i = 50; i < N - janela; i++) {
      if (distUltBranco(i) === distMin) { // exatamente nessa distância
        total++;
        if (distProxBranco(i) <= janela) hits++;
      }
    }
    if (total >= 5) {
      const taxa = hits/total*100;
      if (taxa >= 85) resultados.push({ cond: `Dist=${distMin} → branco em ${janela}`, taxa, hits, total, tipo: 'DIST' });
    }
  }
}

// ===== TESTE B: Último número = X → branco em Y rodadas =====
for (let num = 1; num <= 14; num++) {
  for (let janela = 1; janela <= 15; janela++) {
    let hits = 0, total = 0;
    for (let i = 50; i < N - janela; i++) {
      if (nums[i] === num && distUltBranco(i) >= 15) {
        total++;
        if (distProxBranco(i) <= janela) hits++;
      }
    }
    if (total >= 5) {
      const taxa = hits/total*100;
      if (taxa >= 85) resultados.push({ cond: `Num=${num} & dist>=15 → branco em ${janela}`, taxa, hits, total, tipo: 'NUM+DIST' });
    }
  }
}

// ===== TESTE C: Par [pen, ult] específico → branco em Y rodadas =====
for (let a = 1; a <= 14; a++) {
  for (let b = 1; b <= 14; b++) {
    for (let janela = 1; janela <= 10; janela++) {
      let hits = 0, total = 0;
      for (let i = 51; i < N - janela; i++) {
        if (nums[i] === b && nums[i-1] === a) {
          total++;
          if (distProxBranco(i) <= janela) hits++;
        }
      }
      if (total >= 4) {
        const taxa = hits/total*100;
        if (taxa >= 90) resultados.push({ cond: `Par[${a},${b}] → branco em ${janela}`, taxa, hits, total, tipo: 'PAR' });
      }
    }
  }
}

// ===== TESTE D: Streak de cor (X pretos seguidos OU X vermelhos) → branco em Y =====
for (let streak = 3; streak <= 8; streak++) {
  for (let janela = 1; janela <= 15; janela++) {
    // Preto
    let hitsP = 0, totalP = 0;
    for (let i = 50+streak; i < N - janela; i++) {
      let isStreak = true;
      for (let k = 0; k < streak; k++) {
        if (nums[i-k] < 8 || nums[i-k] > 14) { isStreak = false; break; }
      }
      if (isStreak) {
        totalP++;
        if (distProxBranco(i) <= janela) hitsP++;
      }
    }
    if (totalP >= 5) {
      const taxa = hitsP/totalP*100;
      if (taxa >= 85) resultados.push({ cond: `Streak ${streak}+ preto → branco em ${janela}`, taxa, hits: hitsP, total: totalP, tipo: 'STREAK' });
    }
    // Vermelho
    let hitsV = 0, totalV = 0;
    for (let i = 50+streak; i < N - janela; i++) {
      let isStreak = true;
      for (let k = 0; k < streak; k++) {
        if (nums[i-k] < 1 || nums[i-k] > 7) { isStreak = false; break; }
      }
      if (isStreak) {
        totalV++;
        if (distProxBranco(i) <= janela) hitsV++;
      }
    }
    if (totalV >= 5) {
      const taxa = hitsV/totalV*100;
      if (taxa >= 85) resultados.push({ cond: `Streak ${streak}+ verm → branco em ${janela}`, taxa, hits: hitsV, total: totalV, tipo: 'STREAK' });
    }
  }
}

// ===== TESTE E: Distância >= X E streak preto >= Y → branco em Z =====
for (let distMin = 12; distMin <= 40; distMin += 2) {
  for (let streak = 2; streak <= 6; streak++) {
    for (let janela = 1; janela <= 12; janela++) {
      let hits = 0, total = 0;
      for (let i = 50+streak; i < N - janela; i++) {
        if (distUltBranco(i) < distMin) continue;
        let isStreak = true;
        for (let k = 0; k < streak; k++) {
          if (nums[i-k] < 8 || nums[i-k] > 14) { isStreak = false; break; }
        }
        if (isStreak) {
          total++;
          if (distProxBranco(i) <= janela) hits++;
        }
      }
      if (total >= 4) {
        const taxa = hits/total*100;
        if (taxa >= 85) resultados.push({ cond: `Dist>=${distMin} & streak${streak}P → branco em ${janela}`, taxa, hits, total, tipo: 'COMBO' });
      }
    }
  }
}

// ===== TESTE F: Tempo em minutos desde último branco >= X → branco em Y rodadas =====
for (let minMin = 5; minMin <= 30; minMin += 1) {
  for (let janela = 1; janela <= 15; janela++) {
    let hits = 0, total = 0;
    for (let i = 50; i < N - janela; i++) {
      // Achar último branco e calcular tempo em minutos
      let ultBrancoIdx = -1;
      for (let j = i-1; j >= 0; j--) {
        if (nums[j] === 0) { ultBrancoIdx = j; break; }
      }
      if (ultBrancoIdx < 0) continue;
      const tempoMin = horas[i] - horas[ultBrancoIdx];
      if (Math.abs(tempoMin - minMin) < 0.5) { // exatamente X min (±30s)
        total++;
        if (distProxBranco(i) <= janela) hits++;
      }
    }
    if (total >= 5) {
      const taxa = hits/total*100;
      if (taxa >= 85) resultados.push({ cond: `Tempo=${minMin}min desde branco → próx em ${janela} rod`, taxa, hits, total, tipo: 'TEMPO' });
    }
  }
}

// ===== TESTE G: Número específico apareceu 2x nas últimas 4 → branco em Y =====
for (let num = 1; num <= 14; num++) {
  for (let janela = 1; janela <= 12; janela++) {
    let hits = 0, total = 0;
    for (let i = 53; i < N - janela; i++) {
      const last4 = nums.slice(i-3, i+1);
      if (last4.filter(x => x === num).length >= 2 && distUltBranco(i) >= 10) {
        total++;
        if (distProxBranco(i) <= janela) hits++;
      }
    }
    if (total >= 5) {
      const taxa = hits/total*100;
      if (taxa >= 85) resultados.push({ cond: `${num} aparece 2x/4 & dist>=10 → branco em ${janela}`, taxa, hits, total, tipo: 'REP' });
    }
  }
}

// ===== TESTE H: Minuto específico da hora → branco em Y rodadas =====
for (let minHora = 0; minHora < 60; minHora += 5) {
  for (let janela = 1; janela <= 10; janela++) {
    let hits = 0, total = 0;
    for (let i = 50; i < N - janela; i++) {
      const minAtual = Math.floor(horas[i]) % 60;
      if (minAtual >= minHora && minAtual < minHora + 5 && distUltBranco(i) >= 12) {
        total++;
        if (distProxBranco(i) <= janela) hits++;
      }
    }
    if (total >= 8) {
      const taxa = hits/total*100;
      if (taxa >= 85) resultados.push({ cond: `Min ${minHora}-${minHora+4} & dist>=12 → branco em ${janela}`, taxa, hits, total, tipo: 'HORA' });
    }
  }
}

// ===== ORDENAR E IMPRIMIR =====
resultados.sort((a,b) => {
  if (b.taxa !== a.taxa) return b.taxa - a.taxa;
  return b.total - a.total; // preferir mais amostras
});

// Remover duplicatas fracas (mesma condição com janela maior)
const unicos = [];
const vistos = new Set();
for (const r of resultados) {
  const base = r.cond.split('→')[0].trim();
  if (!vistos.has(base)) {
    unicos.push(r);
    vistos.add(base);
  }
}

console.log(`RESULTADOS — Condições com ≥85% de acerto\n`);
console.log(`${'Condição'.padEnd(55)} | Taxa     | Amostra`);
console.log(`${'─'.repeat(55)}-┼──────────┼────────`);

const top = unicos.slice(0, 40);
if (top.length === 0) {
  console.log('  NENHUMA condição atingiu 85% com amostra >= 4');
} else {
  for (const r of top) {
    const mark = r.taxa >= 90 ? ' ★' : '';
    console.log(`${r.cond.padEnd(55)} | ${r.taxa.toFixed(1).padStart(5)}%${mark} | ${r.hits}/${r.total}`);
  }
}

console.log(`\n─── RESUMO ───`);
const acima90 = unicos.filter(r => r.taxa >= 90);
const acima85 = unicos.filter(r => r.taxa >= 85);
console.log(`Condições ≥90%: ${acima90.length}`);
console.log(`Condições ≥85%: ${acima85.length}`);
if (acima90.length > 0) {
  console.log(`\nMELHOR: ${acima90[0].cond} → ${acima90[0].taxa.toFixed(1)}% (${acima90[0].hits}/${acima90[0].total})`);
}
