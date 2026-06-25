const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ========== CARREGAR DADOS ==========
const wb = XLSX.readFile(path.join(__dirname, 'tipminer-dados-blaze-double (3).xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws);

// Normalizar colunas
const rows = raw.map(r => {
  const keys = Object.keys(r);
  const numKey = keys.find(k => /n[uú]mero|number|num/i.test(k)) || keys[0];
  const corKey = keys.find(k => /cor|color/i.test(k)) || keys[1];
  const dataKey = keys.find(k => /data|date/i.test(k)) || keys[2];
  const horaKey = keys.find(k => /hor[aá]rio|time|hora/i.test(k)) || keys[3];
  return {
    num: parseInt(r[numKey]),
    cor: String(r[corKey] || ''),
    data: String(r[dataKey] || ''),
    horario: String(r[horaKey] || '')
  };
}).filter(r => !isNaN(r.num) && r.num >= 0 && r.num <= 14);

// Dados vêm do mais recente ao mais antigo — inverter para cronológico
rows.reverse();
const T = rows.length;
const totalBrancos = rows.filter(r => r.num === 0).length;
const BASE_RATE = totalBrancos / T;

console.log(`Dataset: ${T} rodadas | Brancos: ${totalBrancos} (${(BASE_RATE*100).toFixed(2)}%)\n`);

// ========== FUNÇÕES AUXILIARES ==========
function zScore(obs, n, p) {
  if (n === 0) return 0;
  return (obs/n - p) / Math.sqrt(p * (1 - p) / n);
}

function sig(z) {
  const az = Math.abs(z);
  if (az >= 3.29) return '***';
  if (az >= 2.58) return '**';
  if (az >= 1.96) return '*';
  return 'ns';
}

const report = [];
function log(s) { report.push(s); console.log(s); }

// ========== 1. PERFIL ESTATÍSTICO BÁSICO ==========
log('# ANÁLISE PROFUNDA — NÚMERO 1');
log(`\n**Dataset:** ${T} rodadas | **Taxa base branco:** ${(BASE_RATE*100).toFixed(2)}%`);
log(`\n---\n\n## 1. PERFIL ESTATÍSTICO BÁSICO\n`);

const count1 = rows.filter(r => r.num === 1).length;
const freq1 = count1 / T;
const esperado = T / 15;
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Frequência absoluta | ${count1} |`);
log(`| Frequência relativa | ${(freq1*100).toFixed(2)}% |`);
log(`| Esperado (1/15) | ${esperado.toFixed(0)} (${(100/15).toFixed(2)}%) |`);
log(`| Desvio | ${count1 > esperado ? '+' : ''}${(count1 - esperado).toFixed(0)} |`);

// Distribuição por dia
log(`\n### Distribuição por dia\n`);
const porDia = {};
rows.forEach(r => {
  const d = String(r.data).substring(0, 10);
  if (!porDia[d]) porDia[d] = { total: 0, n1: 0 };
  porDia[d].total++;
  if (r.num === 1) porDia[d].n1++;
});
log(`| Dia | Rodadas | Aparições do 1 | % |`);
log(`|-----|---------|----------------|---|`);
for (const [dia, v] of Object.entries(porDia).sort()) {
  log(`| ${dia} | ${v.total} | ${v.n1} | ${(v.n1/v.total*100).toFixed(1)}% |`);
}

// Distribuição por hora
log(`\n### Distribuição por hora\n`);
const porHora = {};
rows.forEach(r => {
  const h = String(r.horario).substring(0, 2);
  if (!porHora[h]) porHora[h] = { total: 0, n1: 0 };
  porHora[h].total++;
  if (r.num === 1) porHora[h].n1++;
});
log(`| Hora | Rodadas | Aparições do 1 | % |`);
log(`|------|---------|----------------|---|`);
for (const [h, v] of Object.entries(porHora).sort()) {
  if (v.total > 10) log(`| ${h}h | ${v.total} | ${v.n1} | ${(v.n1/v.total*100).toFixed(1)}% |`);
}

// Gaps entre aparições do 1
log(`\n### Gaps entre aparições do 1\n`);
const gaps1 = [];
let lastIdx = -1;
for (let i = 0; i < T; i++) {
  if (rows[i].num === 1) {
    if (lastIdx >= 0) gaps1.push(i - lastIdx);
    lastIdx = i;
  }
}
gaps1.sort((a, b) => a - b);
const mediaGap = gaps1.reduce((a, b) => a + b, 0) / gaps1.length;
const medianaGap = gaps1[Math.floor(gaps1.length / 2)];
const maxGap = gaps1[gaps1.length - 1];
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Gap médio | ${mediaGap.toFixed(1)} rodadas |`);
log(`| Gap mediano | ${medianaGap} rodadas |`);
log(`| Gap máximo | ${maxGap} rodadas |`);
log(`| Gap esperado (1/freq) | ${(1/freq1).toFixed(1)} rodadas |`);

// ========== 2. RELAÇÃO COM O BRANCO ==========
log(`\n---\n\n## 2. RELAÇÃO COM O BRANCO\n`);

log(`### Branco após o número 1\n`);
const janelas = [1, 2, 3, 5];
log(`| Janela | Vezes que 1 saiu | Branco na janela | Taxa | Esperado | Z-score | Sig |`);
log(`|--------|------------------|------------------|------|----------|---------|-----|`);

for (const w of janelas) {
  let hits = 0, total = 0;
  for (let i = 0; i < T - w; i++) {
    if (rows[i].num === 1) {
      total++;
      let found = false;
      for (let j = 1; j <= w; j++) {
        if (rows[i + j].num === 0) { found = true; break; }
      }
      if (found) hits++;
    }
  }
  const espP = 1 - Math.pow(1 - BASE_RATE, w);
  const z = zScore(hits, total, espP);
  log(`| +${w} rod | ${total} | ${hits} | ${(hits/total*100).toFixed(1)}% | ${(espP*100).toFixed(1)}% | ${z.toFixed(2)} (${sig(z)}) |`);
}

// Predecessor direto do branco
log(`\n### O 1 como predecessor direto do branco\n`);
let predCount = 0, predTotal = 0;
for (let i = 1; i < T; i++) {
  if (rows[i].num === 0) {
    predTotal++;
    if (rows[i - 1].num === 1) predCount++;
  }
}
const predPct = predCount / predTotal * 100;
const predEsp = freq1 * 100;
const predZ = zScore(predCount, predTotal, freq1);
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Brancos com 1 como predecessor | ${predCount}/${predTotal} (${predPct.toFixed(1)}%) |`);
log(`| Esperado (freq do 1) | ${predEsp.toFixed(1)}% |`);
log(`| Z-score | ${predZ.toFixed(2)} (${sig(predZ)}) |`);

// ========== 3. COMPORTAMENTO EM REPETIÇÃO ==========
log(`\n---\n\n## 3. COMPORTAMENTO EM REPETIÇÃO\n`);

log(`### Repetição: 1 aparece 2x nas últimas 3 rodadas\n`);
let rep2of3_hits = 0, rep2of3_total = 0;
for (let i = 3; i < T; i++) {
  const last3 = [rows[i-1].num, rows[i-2].num, rows[i-3].num];
  const count = last3.filter(x => x === 1).length;
  if (count >= 2) {
    rep2of3_total++;
    if (rows[i].num === 0) rep2of3_hits++;
  }
}
const rep2of3_z = zScore(rep2of3_hits, rep2of3_total, BASE_RATE);
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Situações (1 aparece 2x/3) | ${rep2of3_total} |`);
log(`| Brancos nessa situação | ${rep2of3_hits} |`);
log(`| Taxa | ${rep2of3_total > 0 ? (rep2of3_hits/rep2of3_total*100).toFixed(1)+'%' : 'N/A'} |`);
log(`| Taxa base | ${(BASE_RATE*100).toFixed(2)}% |`);
log(`| Z-score | ${rep2of3_z.toFixed(2)} (${sig(rep2of3_z)}) |`);
log(`| Amostra suficiente (≥50)? | ${rep2of3_total >= 50 ? 'SIM' : 'NÃO — resultado inconclusivo'} |`);

// 3x nas últimas 3
log(`\n### Repetição: 1 aparece 3x nas últimas 3 (tripla)\n`);
let rep3of3_hits = 0, rep3of3_total = 0;
for (let i = 3; i < T; i++) {
  const last3 = [rows[i-1].num, rows[i-2].num, rows[i-3].num];
  if (last3.every(x => x === 1)) {
    rep3of3_total++;
    if (rows[i].num === 0) rep3of3_hits++;
  }
}
log(`| Métrica | Valor |`);
log(`|---------|-------|`);
log(`| Situações (1,1,1) | ${rep3of3_total} |`);
log(`| Brancos | ${rep3of3_hits} |`);
log(`| Taxa | ${rep3of3_total > 0 ? (rep3of3_hits/rep3of3_total*100).toFixed(1)+'%' : 'N/A'} |`);
log(`| Amostra suficiente? | ${rep3of3_total >= 50 ? 'SIM' : 'NÃO (' + rep3of3_total + ' casos) — resultado inconclusivo'} |`);

// Consecutiva vs não-consecutiva
log(`\n### Consecutiva (1,1) vs Não-consecutiva (1,X,1)\n`);
let consec_hits = 0, consec_total = 0;
let nonConsec_hits = 0, nonConsec_total = 0;

for (let i = 3; i < T; i++) {
  const last3 = [rows[i-1].num, rows[i-2].num, rows[i-3].num];
  const count = last3.filter(x => x === 1).length;
  if (count >= 2) {
    if (rows[i-1].num === 1 && rows[i-2].num === 1) {
      consec_total++;
      if (rows[i].num === 0) consec_hits++;
    } else {
      nonConsec_total++;
      if (rows[i].num === 0) nonConsec_hits++;
    }
  }
}
log(`| Tipo | Situações | Brancos | Taxa | Z-score | Sig |`);
log(`|------|-----------|---------|------|---------|-----|`);
const cz = zScore(consec_hits, consec_total, BASE_RATE);
const ncz = zScore(nonConsec_hits, nonConsec_total, BASE_RATE);
log(`| Consecutiva (…,1,1,?) | ${consec_total} | ${consec_hits} | ${consec_total>0?(consec_hits/consec_total*100).toFixed(1)+'%':'N/A'} | ${cz.toFixed(2)} | ${sig(cz)} |`);
log(`| Não-consecutiva (1,X,1,?) | ${nonConsec_total} | ${nonConsec_hits} | ${nonConsec_total>0?(nonConsec_hits/nonConsec_total*100).toFixed(1)+'%':'N/A'} | ${ncz.toFixed(2)} | ${sig(ncz)} |`);
if (consec_total < 50 || nonConsec_total < 50) log(`\n⚠️ Amostras < 50 podem ser inconclusivas.`);

// ========== 4. COMPORTAMENTO EM GAPS LONGOS ==========
log(`\n---\n\n## 4. COMPORTAMENTO EM GAPS LONGOS\n`);

const distArr = new Array(T).fill(999);
let lastBranco = -1;
for (let i = 0; i < T; i++) {
  if (rows[i].num === 0) lastBranco = i;
  distArr[i] = lastBranco >= 0 ? i - lastBranco : 999;
}

log(`### Frequência do 1 em gaps longos (dist > 20) vs curtos\n`);
let n1_gapLongo = 0, total_gapLongo = 0;
let n1_gapCurto = 0, total_gapCurto = 0;
for (let i = 0; i < T; i++) {
  if (rows[i].num === 0) continue;
  if (distArr[i] > 20) {
    total_gapLongo++;
    if (rows[i].num === 1) n1_gapLongo++;
  } else {
    total_gapCurto++;
    if (rows[i].num === 1) n1_gapCurto++;
  }
}
log(`| Contexto | Rodadas | Aparições do 1 | % do 1 | Freq geral |`);
log(`|----------|---------|----------------|--------|------------|`);
log(`| Gap > 20 | ${total_gapLongo} | ${n1_gapLongo} | ${(n1_gapLongo/total_gapLongo*100).toFixed(1)}% | ${(freq1*100).toFixed(1)}% |`);
log(`| Gap ≤ 20 | ${total_gapCurto} | ${n1_gapCurto} | ${(n1_gapCurto/total_gapCurto*100).toFixed(1)}% | ${(freq1*100).toFixed(1)}% |`);

log(`\n### 1 aparece em dist ≥ X: taxa de branco na próxima rodada\n`);
const thresholds = [20, 25, 30, 35, 40];
log(`| Dist mín | Vezes que 1 saiu | Branco na próxima | Taxa | Base | Z-score | Sig |`);
log(`|----------|------------------|-------------------|------|------|---------|-----|`);
for (const thr of thresholds) {
  let hits = 0, tot = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === 1 && distArr[i] >= thr) {
      tot++;
      if (rows[i + 1].num === 0) hits++;
    }
  }
  const z = zScore(hits, tot, BASE_RATE);
  log(`| ≥${thr} | ${tot} | ${hits} | ${tot>0?(hits/tot*100).toFixed(1)+'%':'N/A'} | ${(BASE_RATE*100).toFixed(1)}% | ${z.toFixed(2)} | ${sig(z)} |`);
}

// Branco em até 3 rodadas após 1 em gap longo
log(`\n### 1 aparece em dist ≥ X: branco em até 3 rodadas\n`);
log(`| Dist mín | Situações | Branco em ≤3 | Taxa | Esperado | Z-score | Sig |`);
log(`|----------|-----------|--------------|------|----------|---------|-----|`);
for (const thr of thresholds) {
  let hits = 0, tot = 0;
  const espP = 1 - Math.pow(1 - BASE_RATE, 3);
  for (let i = 0; i < T - 3; i++) {
    if (rows[i].num === 1 && distArr[i] >= thr) {
      tot++;
      if (rows[i+1].num===0 || rows[i+2].num===0 || rows[i+3].num===0) hits++;
    }
  }
  const z = zScore(hits, tot, espP);
  log(`| ≥${thr} | ${tot} | ${hits} | ${tot>0?(hits/tot*100).toFixed(1)+'%':'N/A'} | ${(espP*100).toFixed(1)}% | ${z.toFixed(2)} | ${sig(z)} |`);
}

// ========== 5. INTERAÇÃO COM OUTROS NÚMEROS ==========
log(`\n---\n\n## 5. INTERAÇÃO COM OUTROS NÚMEROS (pares nas últimas 4)\n`);

log(`### Pares 1+X nas últimas 4 rodadas → taxa de branco na rodada seguinte\n`);
log(`| Par | Situações | Brancos | Taxa | vs Base | Z-score | Sig | Amostra |`);
log(`|-----|-----------|---------|------|---------|---------|-----|---------|`);

const pairResults = [];
for (let partner = 2; partner <= 14; partner++) {
  let hits = 0, tot = 0;
  for (let i = 4; i < T; i++) {
    const last4 = [rows[i-1].num, rows[i-2].num, rows[i-3].num, rows[i-4].num];
    if (last4.includes(1) && last4.includes(partner)) {
      tot++;
      if (rows[i].num === 0) hits++;
    }
  }
  const rate = tot > 0 ? hits / tot : 0;
  const z = zScore(hits, tot, BASE_RATE);
  pairResults.push({ partner, tot, hits, rate, z });
}
pairResults.sort((a, b) => b.rate - a.rate);
for (const p of pairResults) {
  const warn = p.tot < 50 ? '⚠️ <50' : `✅ ${p.tot}`;
  log(`| 1+${String(p.partner).padStart(2)} | ${p.tot} | ${p.hits} | ${(p.rate*100).toFixed(1)}% | ${p.rate > BASE_RATE ? '+' : ''}${((p.rate - BASE_RATE)*100).toFixed(1)}pp | ${p.z.toFixed(2)} | ${sig(p.z)} | ${warn} |`);
}

// Destaques
log(`\n### Destaques\n`);
for (const target of [11, 12, 13]) {
  const p = pairResults.find(x => x.partner === target);
  log(`- **Par 1+${target}**: ${p.hits}/${p.tot} = ${(p.rate*100).toFixed(1)}%, Z=${p.z.toFixed(2)} (${sig(p.z)})${p.tot < 50 ? ' ⚠️ amostra pequena' : ''}`);
}

// Pares com taxa > 8%
log(`\n### Pares com taxa > 8% (potencialmente relevantes)\n`);
const relevantes = pairResults.filter(p => p.rate > 0.08 && p.tot >= 30);
if (relevantes.length === 0) {
  log(`Nenhum par 1+X atingiu taxa > 8% com amostra ≥ 30.`);
} else {
  for (const p of relevantes) {
    log(`- **1+${p.partner}**: ${(p.rate*100).toFixed(1)}% (${p.hits}/${p.tot}), Z=${p.z.toFixed(2)} (${sig(p.z)})`);
  }
}

// ========== 6. CONCLUSÃO ==========
log(`\n---\n\n## 6. CONCLUSÃO SOBRE O NÚMERO 1\n`);

// Auto-classificação baseada nos dados
const afterRate = (() => {
  let h = 0, t = 0;
  for (let i = 0; i < T - 1; i++) {
    if (rows[i].num === 1) { t++; if (rows[i+1].num === 0) h++; }
  }
  return { rate: t > 0 ? h / t : 0, hits: h, total: t };
})();
const afterZ = zScore(afterRate.hits, afterRate.total, BASE_RATE);

log(`### Quadro resumo\n`);
log(`| Teste | Resultado | Z-score | Veredicto |`);
log(`|-------|-----------|---------|-----------|`);
log(`| Frequência geral | ${(freq1*100).toFixed(1)}% (esperado ${(100/15).toFixed(1)}%) | - | ${Math.abs(freq1 - 1/15) < 0.01 ? 'Normal' : freq1 > 1/15 ? 'Acima do esperado' : 'Abaixo do esperado'} |`);
log(`| Branco logo após o 1 | ${(afterRate.rate*100).toFixed(1)}% (base ${(BASE_RATE*100).toFixed(1)}%) | ${afterZ.toFixed(2)} (${sig(afterZ)}) | ${Math.abs(afterZ) >= 1.96 ? (afterRate.rate > BASE_RATE ? '🔥 ELEVADO' : '🛡️ REDUZIDO') : 'NEUTRO'} |`);
log(`| Repetição 2x/3 → branco | ${rep2of3_total > 0 ? (rep2of3_hits/rep2of3_total*100).toFixed(1)+'%' : 'N/A'} | ${rep2of3_z.toFixed(2)} (${sig(rep2of3_z)}) | ${Math.abs(rep2of3_z) >= 1.96 ? '✅ SIGNIFICATIVO' : '❌ Não significativo'} |`);
log(`| Predecessor direto | ${predPct.toFixed(1)}% (esp ${predEsp.toFixed(1)}%) | ${predZ.toFixed(2)} (${sig(predZ)}) | ${Math.abs(predZ) >= 1.96 ? 'SIGNIFICATIVO' : 'Não significativo'} |`);

log(`\n### Classificação\n`);
// Determinar classificação
let classificacao = 'NEUTRO';
let explicacao = '';
if (afterZ >= 1.96) {
  classificacao = 'BRANCO DISFARÇADO (leve)';
  explicacao = 'O branco tende a aparecer mais após o 1 — efeito pequeno mas mensurável.';
} else if (afterZ <= -1.96) {
  classificacao = 'SEGURADOR / BLOQUEADOR (leve)';
  explicacao = 'O branco tende a NÃO aparecer após o 1 — efeito de supressão.';
} else {
  classificacao = 'NEUTRO como predecessor individual';
  explicacao = 'O 1 sozinho não altera significativamente a taxa de branco na rodada seguinte.';
}
log(`**Classificação primária:** ${classificacao}`);
log(`> ${explicacao}`);

log(`\n### Contextos onde o 1 é relevante\n`);
if (rep2of3_total > 0 && Math.abs(rep2of3_z) >= 1.96) {
  log(`- ✅ **Repetição 2x/3**: Quando o 1 aparece 2 vezes nas últimas 3 rodadas, a taxa de branco é ${(rep2of3_hits/rep2of3_total*100).toFixed(1)}% (Z=${rep2of3_z.toFixed(2)}). **SINAL VÁLIDO.**`);
} else {
  log(`- ❌ **Repetição 2x/3**: Taxa ${rep2of3_total > 0 ? (rep2of3_hits/rep2of3_total*100).toFixed(1)+'%' : 'N/A'}, Z=${rep2of3_z.toFixed(2)}. **NÃO é estatisticamente significativo com estes dados.**`);
}

// Melhor par
const bestPair = pairResults.filter(p => p.tot >= 30).sort((a, b) => b.z - a.z)[0];
if (bestPair && bestPair.z >= 1.96) {
  log(`- ✅ **Melhor par: 1+${bestPair.partner}**: ${(bestPair.rate*100).toFixed(1)}% (${bestPair.hits}/${bestPair.tot}), Z=${bestPair.z.toFixed(2)}.`);
} else if (bestPair) {
  log(`- ❌ **Melhor par: 1+${bestPair.partner}**: ${(bestPair.rate*100).toFixed(1)}%, Z=${bestPair.z.toFixed(2)}. Nenhum par com significância.`);
}

log(`\n### Validação do V4\n`);
log(`O modelo V4 utiliza "Repetição do 1 (2x nas últimas 3)" como sinal de entrada.`);
if (rep2of3_total > 0 && Math.abs(rep2of3_z) >= 1.96) {
  log(`- ✅ **CONFIRMADO**: ${(rep2of3_hits/rep2of3_total*100).toFixed(1)}% com Z=${rep2of3_z.toFixed(2)} — o padrão se mantém neste dataset.`);
} else {
  log(`- ⚠️ **NÃO CONFIRMADO neste dataset**: Z=${rep2of3_z.toFixed(2)} (abaixo de 1.96). O padrão pode ter sido overfitting do dataset anterior ou a amostra de repetições é pequena demais (${rep2of3_total} casos).`);
}

log(`\n---\n*Relatório gerado automaticamente em ${new Date().toISOString()}*`);
log(`*Dataset: ${T} rodadas | Base rate: ${(BASE_RATE*100).toFixed(2)}%*`);

// ========== SALVAR ==========
const output = report.join('\n');
fs.writeFileSync(path.join(__dirname, 'RELATORIO-NUMERO-1.md'), output, 'utf-8');
console.log('\n\n✅ Relatório salvo em: RELATORIO-NUMERO-1.md');
