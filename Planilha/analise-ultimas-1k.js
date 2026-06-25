const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (4).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);

const allRows = raw.map(r => {
  const keys = Object.keys(r);
  const numKey = keys.find(k => /n[uú]mero|number|num/i.test(k)) || keys[0];
  const dataKey = keys.find(k => /data|date/i.test(k)) || keys[2];
  const horaKey = keys.find(k => /hor[aá]rio|time|hora/i.test(k)) || keys[3];
  return {
    num: parseInt(r[numKey]),
    data: String(r[dataKey] || ''),
    horario: String(r[horaKey] || '')
  };
}).filter(r => !isNaN(r.num) && r.num >= 0 && r.num <= 14);

allRows.reverse(); // cronológico (mais antigo primeiro)

// Pegar APENAS as últimas 1000 (mais recentes)
const JANELA = 1000;
const rows = allRows.slice(allRows.length - JANELA);
const T = rows.length;
const totalBrancos = rows.filter(r => r.num === 0).length;
const BASE_RATE = totalBrancos / T;

// Também calcular com 20k pra comparação
const T_full = allRows.length;
const BASE_RATE_FULL = allRows.filter(r => r.num === 0).length / T_full;

// ========== FUNÇÕES ==========
function zScore(obs, n, p) {
  if (n === 0) return 0;
  return (obs / n - p) / Math.sqrt(p * (1 - p) / n);
}
function sig(z) {
  const az = Math.abs(z);
  if (az >= 3.29) return '***';
  if (az >= 2.58) return '**';
  if (az >= 1.96) return '*';
  return 'ns';
}

// Distância do último branco
const distArr = new Array(T).fill(999);
let lastB = -1;
for (let i = 0; i < T; i++) {
  if (rows[i].num === 0) lastB = i;
  distArr[i] = lastB >= 0 ? i - lastB : 999;
}

const report = [];
function log(s) { report.push(s); }

log('# ANÁLISE — ÚLTIMAS 1.000 RODADAS (dados mais recentes)');
log(`\n**Dataset total:** ${T_full} rodadas | **Janela analisada:** ${T} mais recentes`);
log(`\n**Brancos na janela:** ${totalBrancos} (${(BASE_RATE * 100).toFixed(2)}%) | **Base 20k:** ${(BASE_RATE_FULL * 100).toFixed(2)}%`);
log(`\n**Período:** ${rows[0].data} ${rows[0].horario} → ${rows[T-1].data} ${rows[T-1].horario}`);
log(`\n**Critério:** Z-score ≥ 1.96 (p < 0.05) | Amostra mínima: 20 observações`);

// ========== ANÁLISE POR NÚMERO ==========
const numerosData = [];

for (let N = 0; N <= 14; N++) {
  const numInfo = { numero: N, testes: [] };

  numInfo.freq = rows.filter(r => r.num === N).length;
  numInfo.freqPct = numInfo.freq / T;

  // Branco após N (janelas 1, 3, 5)
  const janelaConfigs = [1, 3, 5];
  numInfo.brancoApos = {};
  for (const w of janelaConfigs) {
    let hits = 0, total = 0;
    for (let i = 0; i < T - w; i++) {
      if (rows[i].num === N) {
        total++;
        for (let j = 1; j <= w; j++) {
          if (rows[i + j].num === 0) { hits++; break; }
        }
      }
    }
    const espP = 1 - Math.pow(1 - BASE_RATE, w);
    numInfo.brancoApos[w] = { hits, total, rate: total > 0 ? hits / total : 0, z: zScore(hits, total, espP) };
  }

  // Predecessor direto
  let predCount = 0;
  for (let i = 1; i < T; i++) {
    if (rows[i].num === 0 && rows[i - 1].num === N) predCount++;
  }
  numInfo.predecessor = { count: predCount, total: totalBrancos, pct: predCount / totalBrancos, z: zScore(predCount, totalBrancos, numInfo.freqPct) };

  // Repetição 2x/3
  if (N !== 0) {
    let rH = 0, rT = 0;
    for (let i = 3; i < T; i++) {
      const last3 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num];
      if (last3.filter(x => x === N).length >= 2) {
        rT++; if (rows[i].num === 0) rH++;
      }
    }
    numInfo.rep2of3 = { hits: rH, total: rT, rate: rT > 0 ? rH / rT : 0, z: zScore(rH, rT, BASE_RATE) };
  }

  // N em dist>=25 → branco na próxima
  let dH = 0, dT = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === N && distArr[i] >= 25) {
      dT++; if (rows[i + 1].num === 0) dH++;
    }
  }
  numInfo.distAlta = { hits: dH, total: dT, rate: dT > 0 ? dH / dT : 0, z: zScore(dH, dT, BASE_RATE) };

  // Todos os pares N+X nas últimas 4
  numInfo.pares = [];
  if (N !== 0) {
    for (let partner = 0; partner <= 14; partner++) {
      if (partner === N) continue;
      let pH = 0, pT = 0;
      for (let i = 4; i < T; i++) {
        const last4 = [rows[i - 1].num, rows[i - 2].num, rows[i - 3].num, rows[i - 4].num];
        if (last4.includes(N) && last4.includes(partner)) {
          pT++; if (rows[i].num === 0) pH++;
        }
      }
      const pRate = pT > 0 ? pH / pT : 0;
      const pZ = zScore(pH, pT, BASE_RATE);
      numInfo.pares.push({ partner, hits: pH, total: pT, rate: pRate, z: pZ });
    }
    numInfo.pares.sort((a, b) => b.z - a.z);
  }

  numerosData.push(numInfo);
}

// ========== TABELA RESUMO ==========
log(`\n---\n\n## TABELA RESUMO\n`);
log(`| # | Freq | Branco +1 | Z | Branco +3 | Z | Pred | Z | Rep 2x/3 | Z | Melhor Par | Z |`);
log(`|---|------|-----------|---|-----------|---|------|---|----------|---|------------|---|`);

for (const n of numerosData) {
  const b1 = `${(n.brancoApos[1].rate * 100).toFixed(1)}%`;
  const b3 = `${(n.brancoApos[3].rate * 100).toFixed(1)}%`;
  const pred = `${(n.predecessor.pct * 100).toFixed(1)}%`;
  const rep = n.numero === 0 ? '-' : (n.rep2of3.total > 0 ? `${(n.rep2of3.rate * 100).toFixed(1)}% (${n.rep2of3.total})` : '0');
  const repZ = n.numero === 0 ? '-' : n.rep2of3.z.toFixed(2);
  const bestP = n.pares.length > 0 ? n.pares[0] : null;
  const parStr = bestP ? `${n.numero}+${bestP.partner} ${(bestP.rate * 100).toFixed(1)}%` : '-';
  const parZ = bestP ? bestP.z.toFixed(2) : '-';
  log(`| **${n.numero}** | ${n.freq} | ${b1} | ${n.brancoApos[1].z.toFixed(2)} | ${b3} | ${n.brancoApos[3].z.toFixed(2)} | ${pred} | ${n.predecessor.z.toFixed(2)} | ${rep} | ${repZ} | ${parStr} | ${parZ} |`);
}

// ========== COLETAR TODOS OS SINAIS SIGNIFICATIVOS ==========
log(`\n---\n\n## SINAIS SIGNIFICATIVOS (Z ≥ 1.96) NAS ÚLTIMAS 1.000 RODADAS\n`);

const sinais = [];

for (const n of numerosData) {
  // Branco +1
  if (Math.abs(n.brancoApos[1].z) >= 1.96 && n.brancoApos[1].total >= 20) {
    sinais.push({ tipo: `Branco +1 após ${n.numero}`, taxa: n.brancoApos[1].rate, n: n.brancoApos[1].total, hits: n.brancoApos[1].hits, z: n.brancoApos[1].z, dir: n.brancoApos[1].z > 0 ? '🔥' : '🛡️' });
  }
  // Branco +3
  if (Math.abs(n.brancoApos[3].z) >= 1.96 && n.brancoApos[3].total >= 20) {
    sinais.push({ tipo: `Branco +3 após ${n.numero}`, taxa: n.brancoApos[3].rate, n: n.brancoApos[3].total, hits: n.brancoApos[3].hits, z: n.brancoApos[3].z, dir: n.brancoApos[3].z > 0 ? '🔥' : '🛡️' });
  }
  // Predecessor
  if (Math.abs(n.predecessor.z) >= 1.96) {
    sinais.push({ tipo: `${n.numero} como predecessor`, taxa: n.predecessor.pct, n: n.predecessor.total, hits: n.predecessor.count, z: n.predecessor.z, dir: n.predecessor.z > 0 ? '🔥' : '🛡️' });
  }
  // Repetição
  if (n.numero !== 0 && n.rep2of3 && Math.abs(n.rep2of3.z) >= 1.96 && n.rep2of3.total >= 10) {
    sinais.push({ tipo: `Rep ${n.numero} (2x/3)`, taxa: n.rep2of3.rate, n: n.rep2of3.total, hits: n.rep2of3.hits, z: n.rep2of3.z, dir: n.rep2of3.z > 0 ? '🔥' : '🛡️' });
  }
  // Dist alta
  if (Math.abs(n.distAlta.z) >= 1.96 && n.distAlta.total >= 10) {
    sinais.push({ tipo: `${n.numero} em dist≥25 → branco`, taxa: n.distAlta.rate, n: n.distAlta.total, hits: n.distAlta.hits, z: n.distAlta.z, dir: n.distAlta.z > 0 ? '🔥' : '🛡️' });
  }
  // Pares
  for (const p of n.pares) {
    if (Math.abs(p.z) >= 1.96 && p.total >= 20) {
      sinais.push({ tipo: `Par ${n.numero}+${p.partner} (últ4)`, taxa: p.rate, n: p.total, hits: p.hits, z: p.z, dir: p.z > 0 ? '🔥' : '🛡️' });
    }
  }
}

sinais.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

// Deduplicar pares (6+9 = 9+6)
const seen = new Set();
const sinaisUnicos = [];
for (const s of sinais) {
  const match = s.tipo.match(/Par (\d+)\+(\d+)/);
  if (match) {
    const key = [Math.min(match[1], match[2]), Math.max(match[1], match[2])].join('+');
    if (seen.has(key)) continue;
    seen.add(key);
  }
  sinaisUnicos.push(s);
}

if (sinaisUnicos.length === 0) {
  log(`**Nenhum sinal atingiu Z ≥ 1.96 nesta janela de 1.000 rodadas.**`);
} else {
  log(`| # | Sinal | Dir | Taxa | Hits/N | Z-score | Sig |`);
  log(`|---|-------|-----|------|--------|---------|-----|`);
  let idx = 1;
  for (const s of sinaisUnicos) {
    log(`| ${idx} | ${s.tipo} | ${s.dir} | ${(s.taxa * 100).toFixed(1)}% | ${s.hits}/${s.n} | **${s.z.toFixed(2)}** | ${sig(s.z)} |`);
    idx++;
  }
}

// ========== COMPARAÇÃO COM 20K ==========
log(`\n---\n\n## COMPARAÇÃO: ÚLTIMAS 1K vs TOTAL 20K\n`);
log(`> Se um padrão aparece nas últimas 1k E nos 20k, é **consistente**. Se aparece só em 1k, pode ser recente. Se aparece só em 20k, pode ter mudado.\n`);

// Recomputar sinais nos 20k
const distArr20k = new Array(T_full).fill(999);
let lastB20k = -1;
for (let i = 0; i < T_full; i++) {
  if (allRows[i].num === 0) lastB20k = i;
  distArr20k[i] = lastB20k >= 0 ? i - lastB20k : 999;
}

// Sinais do 20k: repetições e pares mais relevantes
const compare = [];

// Repetições 2x/3 nos 20k
for (let N = 1; N <= 14; N++) {
  let rH = 0, rT = 0;
  for (let i = 3; i < T_full; i++) {
    const last3 = [allRows[i - 1].num, allRows[i - 2].num, allRows[i - 3].num];
    if (last3.filter(x => x === N).length >= 2) {
      rT++; if (allRows[i].num === 0) rH++;
    }
  }
  const z20k = zScore(rH, rT, BASE_RATE_FULL);

  // Pegar da janela 1k
  const n1k = numerosData.find(x => x.numero === N);
  const z1k = n1k.rep2of3 ? n1k.rep2of3.z : 0;
  const rate1k = n1k.rep2of3 ? n1k.rep2of3.rate : 0;
  const n1k_total = n1k.rep2of3 ? n1k.rep2of3.total : 0;

  compare.push({
    padrao: `Rep ${N} (2x/3)`,
    taxa20k: rT > 0 ? (rH / rT * 100).toFixed(1) + '%' : 'N/A',
    z20k: z20k.toFixed(2),
    sig20k: sig(z20k),
    taxa1k: n1k_total > 0 ? (rate1k * 100).toFixed(1) + '%' : 'N/A',
    z1k: z1k.toFixed(2),
    sig1k: sig(z1k),
    n20k: rT,
    n1k: n1k_total,
    consistente: (Math.abs(z20k) >= 1.96 && Math.abs(z1k) >= 1.5) ? '✅' :
      (Math.abs(z20k) >= 1.96 || Math.abs(z1k) >= 1.96) ? '⚠️' : '❌'
  });
}

// Pares relevantes nos 20k (só os que deram sinal em algum dos dois)
const paresChecar = [];
for (const s of sinaisUnicos) {
  const m = s.tipo.match(/Par (\d+)\+(\d+)/);
  if (m) paresChecar.push([parseInt(m[1]), parseInt(m[2])]);
}
// Adicionar os do 20k que eram significativos
const paresCandidatos20k = [[5, 12], [7, 8], [8, 5]];
for (const p of paresCandidatos20k) {
  if (!paresChecar.some(x => (x[0] === p[0] && x[1] === p[1]) || (x[0] === p[1] && x[1] === p[0]))) {
    paresChecar.push(p);
  }
}

for (const [a, b] of paresChecar) {
  // 20k
  let h20 = 0, t20 = 0;
  for (let i = 4; i < T_full; i++) {
    const last4 = [allRows[i - 1].num, allRows[i - 2].num, allRows[i - 3].num, allRows[i - 4].num];
    if (last4.includes(a) && last4.includes(b)) {
      t20++; if (allRows[i].num === 0) h20++;
    }
  }
  const z20 = zScore(h20, t20, BASE_RATE_FULL);

  // 1k
  const nData = numerosData.find(x => x.numero === a);
  const par1k = nData && nData.pares ? nData.pares.find(p => p.partner === b) : null;

  compare.push({
    padrao: `Par ${a}+${b}`,
    taxa20k: t20 > 0 ? (h20 / t20 * 100).toFixed(1) + '%' : 'N/A',
    z20k: z20.toFixed(2),
    sig20k: sig(z20),
    taxa1k: par1k && par1k.total > 0 ? (par1k.rate * 100).toFixed(1) + '%' : 'N/A',
    z1k: par1k ? par1k.z.toFixed(2) : '0.00',
    sig1k: par1k ? sig(par1k.z) : 'ns',
    n20k: t20,
    n1k: par1k ? par1k.total : 0,
    consistente: (Math.abs(z20) >= 1.96 && par1k && Math.abs(par1k.z) >= 1.5) ? '✅' :
      (Math.abs(z20) >= 1.96 || (par1k && Math.abs(par1k.z) >= 1.96)) ? '⚠️' : '❌'
  });
}

log(`| Padrão | Taxa 20k | Z 20k | Sig | Taxa 1k | Z 1k | Sig | Consistente? |`);
log(`|--------|----------|-------|-----|---------|------|-----|-------------|`);
compare.sort((a, b) => {
  const order = { '✅': 0, '⚠️': 1, '❌': 2 };
  return (order[a.consistente] ?? 2) - (order[b.consistente] ?? 2) || Math.abs(parseFloat(b.z1k)) - Math.abs(parseFloat(a.z1k));
});
for (const c of compare) {
  log(`| ${c.padrao} | ${c.taxa20k} (${c.n20k}) | ${c.z20k} | ${c.sig20k} | ${c.taxa1k} (${c.n1k}) | ${c.z1k} | ${c.sig1k} | ${c.consistente} |`);
}

// ========== ÍNDICE DE EFICÁCIA ==========
log(`\n---\n\n## ÍNDICE DE EFICÁCIA\n`);

const totalTestes = sinaisUnicos.length > 0 ? 87 : 87; // mesma bateria
const sigCount1k = sinaisUnicos.length;
const consistentes = compare.filter(c => c.consistente === '✅').length;

log(`| Métrica | Últimas 1k | Total 20k |`);
log(`|---------|------------|-----------|`);
log(`| Rodadas | ${T} | ${T_full} |`);
log(`| Taxa base branco | ${(BASE_RATE * 100).toFixed(2)}% | ${(BASE_RATE_FULL * 100).toFixed(2)}% |`);
log(`| Sinais com Z≥1.96 | ${sigCount1k} | 6 |`);
log(`| Padrões consistentes (1k E 20k) | **${consistentes}** | - |`);

const eficacia = consistentes > 0 
  ? Math.round((consistentes / compare.filter(c => c.consistente !== '❌').length) * 100) 
  : 0;

log(`\n### Eficácia de consistência: **${eficacia}%**`);
log(`\n> Este índice mede quantos padrões se mantêm tanto nos 20k históricos quanto nas últimas 1.000 rodadas. Padrões consistentes são os mais confiáveis para o motor.`);

// ========== VEREDICTO ==========
log(`\n---\n\n## VEREDICTO FINAL\n`);
log(`### Padrões para o novo motor (apenas consistentes ou fortes na janela atual)\n`);

const paraMotor = sinaisUnicos.filter(s => s.z >= 1.96);
const consistentesNames = compare.filter(c => c.consistente === '✅').map(c => c.padrao);

if (paraMotor.length === 0 && consistentes === 0) {
  log(`⚠️ **Nenhum padrão consistente encontrado.** Os padrões mudam rápido. Recomendação: monitorar com janela deslizante.`);
} else {
  log(`| Padrão | Taxa atual (1k) | Z atual | Consistente com 20k? | Recomendação |`);
  log(`|--------|-----------------|---------|----------------------|-------------|`);
  for (const s of paraMotor) {
    const isConsist = consistentesNames.some(name => s.tipo.includes(name.replace('Par ', '').replace('Rep ', '')));
    log(`| ${s.tipo} | ${(s.taxa * 100).toFixed(1)}% (${s.hits}/${s.n}) | ${s.z.toFixed(2)} | ${isConsist ? '✅ SIM' : '⚠️ Só atual'} | ${isConsist ? '**USAR NO MOTOR**' : 'Monitorar'} |`);
  }
}

log(`\n### O que NÃO usar\n`);
const mortos = compare.filter(c => c.consistente === '❌' && (Math.abs(parseFloat(c.z20k)) >= 1.5 || Math.abs(parseFloat(c.z1k)) >= 1.5));
if (mortos.length > 0) {
  for (const m of mortos) {
    log(`- ❌ **${m.padrao}**: era ${m.taxa20k} nos 20k mas ${m.taxa1k} agora — **padrão morto ou invertido**`);
  }
} else {
  log(`Nenhum padrão forte foi invalidado.`);
}

log(`\n---\n*Relatório gerado em ${new Date().toISOString()}*`);
log(`*Janela: últimas ${T} rodadas | Base rate: ${(BASE_RATE * 100).toFixed(2)}%*`);

// ========== SALVAR ==========
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'RELATORIO-ULTIMAS-1K.md'), output, 'utf-8');
console.log(output);
console.log('\n\n✅ Relatório salvo em: RELATORIO-ULTIMAS-1K.md');
