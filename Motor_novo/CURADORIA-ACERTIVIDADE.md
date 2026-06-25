# CURADORIA — ACERTIVIDADE DO MOTOR ADAPTATIVO

**Dataset:** 20000 rodadas | **Janela:** 500 | **Rodadas avaliadas:** 19500

**Total de brancos no período:** 1286 | **Base rate:** 6.65%

---

## 1. MATRIZ DE CONFUSÃO

|  | Veio Branco | Não veio Branco | Total |
|--|-------------|-----------------|-------|
| **Motor: APOSTAR** | ✅ 36 (acertos) | ❌ 519 (erros) | 555 |
| **Motor: NÃO apostar** | 😢 1250 (brancos perdidos) | ✅ 17695 (correto) | 18945 |
| **Total** | 1286 brancos | 18214 não-brancos | 19500 |

---

## 2. MÉTRICAS DE ACERTIVIDADE

| Métrica | Valor | O que significa |
|---------|-------|-----------------|
| **Precisão** | **6.49%** | De cada 100 vezes que o motor disse "APOSTAR", 6.5 veio branco |
| **Recall (Cobertura)** | **2.80%** | De 1286 brancos que aconteceram, o motor "pegou" 36 (2.8%) |
| **F1-Score** | **3.91%** | Equilíbrio entre precisão e cobertura |
| **Brancos perdidos** | **1250** de 1286 | 97.2% dos brancos passaram sem sinal |
| **Falsos alarmes** | **519** de 555 apostas | 93.5% das apostas erraram |
| **Base rate (aleatório)** | 6.65% | Se apostasse TODAS as rodadas |
| **Break-even** | 7.14% | Mínimo para lucrar (1/14) |

### Interpretação

❌ **Precisão ABAIXO do break-even** (6.49% < 7.14%) — motor não filtra bem o suficiente.
⚠️ **Cobertura baixa** — pega apenas 2.8% dos brancos.

---

## 3. PRECISÃO POR FORÇA DO SINAL

### Por Score

| Score | Apostas | Acertos | Precisão | vs Break-even |
|-------|---------|---------|----------|---------------|
| 5.7 | 1 | 0 | **0.0%** | ❌ |
| 5.3 | 1 | 0 | **0.0%** | ❌ |
| 5.0 | 1 | 0 | **0.0%** | ❌ |
| 4.9 | 1 | 0 | **0.0%** | ❌ |
| 4.7 | 8 | 1 | **12.5%** | ✅ |
| 4.6 | 1 | 0 | **0.0%** | ❌ |
| 4.5 | 3 | 0 | **0.0%** | ❌ |
| 4.4 | 5 | 0 | **0.0%** | ❌ |
| 4.3 | 5 | 0 | **0.0%** | ❌ |
| 4.1 | 3 | 0 | **0.0%** | ❌ |
| 4.0 | 4 | 0 | **0.0%** | ❌ |
| 3.9 | 3 | 0 | **0.0%** | ❌ |
| 3.8 | 3 | 1 | **33.3%** | ✅ |
| 3.7 | 12 | 3 | **25.0%** | ✅ |
| 3.6 | 12 | 0 | **0.0%** | ❌ |
| 3.5 | 14 | 1 | **7.1%** | ✅ |
| 3.4 | 5 | 0 | **0.0%** | ❌ |
| 3.3 | 8 | 0 | **0.0%** | ❌ |
| 3.2 | 12 | 1 | **8.3%** | ✅ |
| 3.1 | 20 | 1 | **5.0%** | ❌ |
| 3.0 | 27 | 2 | **7.4%** | ✅ |
| 2.9 | 19 | 0 | **0.0%** | ❌ |
| 2.8 | 47 | 3 | **6.4%** | ❌ |
| 2.7 | 31 | 2 | **6.5%** | ❌ |
| 2.6 | 48 | 1 | **2.1%** | ❌ |
| 2.5 | 45 | 5 | **11.1%** | ✅ |
| 2.4 | 57 | 4 | **7.0%** | ❌ |
| 2.3 | 42 | 1 | **2.4%** | ❌ |
| 2.2 | 31 | 3 | **9.7%** | ✅ |
| 2.1 | 54 | 6 | **11.1%** | ✅ |
| 2.0 | 32 | 1 | **3.1%** | ❌ |

### Por Quantidade de Sinais Ativos

| Sinais ativos | Apostas | Acertos | Precisão | vs Break-even |
|---------------|---------|---------|----------|---------------|
| 4 sinal(is) | 4 | 0 | **0.0%** | ❌ |
| 3 sinal(is) | 56 | 5 | **8.9%** | ✅ |
| 2 sinal(is) | 424 | 27 | **6.4%** | ❌ |
| 1 sinal(is) | 71 | 4 | **5.6%** | ❌ |

### Melhor filtro encontrado

| Filtro | Apostas | Acertos | Precisão | ROI |
|--------|---------|---------|----------|-----|
| **≥3 sinais** | 60 | 5 | **8.3%** | **+16.7%** |

✅ **Encontrado filtro LUCRATIVO!** Com "≥3 sinais", a precisão sobe para 8.3% e o ROI é positivo.

---

## 4. DETALHE DOS ACERTOS (quando o motor disse APOSTAR e veio branco)

| # | Rodada | Score | Sinais | Padrões ativos |
|---|--------|-------|--------|----------------|
| 1 | 2686 | 2.3 | 2 | Par 4+6 (últ4) | Par 4+8 (últ4) |
| 2 | 3621 | 2.6 | 2 | Par 13+14 (últ4) | Par 9+13 (últ4) |
| 3 | 4084 | 2.1 | 2 | Par 0+11 (últ4) | Par 2+11 (últ4) |
| 4 | 4085 | 2.1 | 2 | Par 0+11 (últ4) | Par 2+11 (últ4) |
| 5 | 4846 | 2.4 | 2 | Par 2+13 (últ4) | Dist 30-39 |
| 6 | 4986 | 4.7 | 3 | Par 1+2 (últ4) | Par 2+13 (últ4) | Par 2+3 (últ4) |
| 7 | 5703 | 2.4 | 2 | Par 10+13 (últ4) | Par 3+10 (últ4) |
| 8 | 6012 | 2.2 | 2 | Par 1+7 (últ4) | Par 7+10 (últ4) |
| 9 | 6213 | 3.5 | 3 | Par 7+12 (últ4) | Par 10+12 (últ4) | Branco +1 após 12 |
| 10 | 6383 | 2.8 | 2 | Par 10+13 (últ4) | Par 3+13 (últ4) |
| 11 | 6645 | 2.1 | 1 | Branco +1 após 12 |
| 12 | 6919 | 2.5 | 2 | Par 12+14 (últ4) | Branco +1 após 12 |
| 13 | 7298 | 2.5 | 2 | Par 7+8 (últ4) | Par 0+7 (últ4) |
| 14 | 7477 | 3.7 | 3 | Par 6+7 (últ4) | Par 0+7 (últ4) | Par 7+8 (últ4) |
| 15 | 7478 | 3.7 | 3 | Par 6+7 (últ4) | Par 0+7 (últ4) | Par 7+8 (últ4) |
| 16 | 7616 | 3.1 | 2 | Par 0+7 (últ4) | Par 7+8 (últ4) |
| 17 | 7645 | 2.0 | 1 | Par 0+7 (últ4) |
| 18 | 7791 | 3.1 | 2 | Par 0+7 (últ4) | Par 1+7 (últ4) |
| 19 | 8435 | 2.8 | 2 | Par 0+2 (últ4) | Par 4+5 (últ4) |
| 20 | 8720 | 2.2 | 2 | Par 5+9 (últ4) | Par 9+13 (últ4) |
| 21 | 10939 | 2.4 | 2 | Dist 40+ | Par 8+13 (últ4) |
| 22 | 13724 | 3.0 | 2 | Par 7+9 (últ4) | Par 9+11 (últ4) |
| 23 | 14210 | 2.1 | 2 | Par 2+12 (últ4) | Branco +1 após 12 |
| 24 | 14271 | 3.8 | 3 | Branco +1 após 12 | Par 1+12 (últ4) | Par 9+12 (últ4) |
| 25 | 14486 | 2.5 | 2 | Par 1+4 (últ4) | Par 4+5 (últ4) |
| 26 | 14523 | 2.7 | 2 | Par 5+9 (últ4) | Branco +1 após 9 |
| 27 | 14699 | 3.7 | 2 | Par 5+9 (últ4) | Branco +1 após 9 |
| 28 | 14775 | 2.1 | 1 | Branco +1 após 9 |
| 29 | 14829 | 3.0 | 2 | Par 5+9 (últ4) | Par 8+9 (últ4) |
| 30 | 14948 | 2.8 | 2 | Par 5+9 (últ4) | Par 5+7 (últ4) |
| 31 | 15399 | 2.6 | 2 | Par 5+10 (últ4) | Par 5+9 (últ4) |
| 32 | 15671 | 2.4 | 2 | Branco +1 após 5 | Par 5+6 (últ4) |
| 33 | 15675 | 2.5 | 2 | Par 0+9 (últ4) | Par 9+10 (últ4) |
| 34 | 15994 | 2.2 | 2 | Branco +1 após 5 | Par 4+8 (últ4) |
| 35 | 16018 | 2.5 | 2 | Par 4+8 (últ4) | Par 4+11 (últ4) |
| 36 | 17205 | 2.1 | 1 | Dist 40+ |

---

## 5. BRANCOS PERDIDOS (motor não tinha sinal)


Total: 1250 brancos perdidos de 1286 (97.2%)

| Decisão do motor | Brancos perdidos |
|------------------|-----------------|
| NEUTRO | 1017 (81.4%) |
| AGUARDAR (tendência positiva) | 230 (18.4%) |
| NÃO APOSTAR | 2 (0.2%) |
| AGUARDAR | 1 (0.1%) |

### Score que o motor tinha quando o branco veio (e não apostou)

| Score | Brancos perdidos | % do total perdido |
|-------|-----------------|-------------------|
| 1.9 | 3 | 0.2% |
| 1.8 | 6 | 0.5% |
| 1.7 | 2 | 0.2% |
| 1.6 | 16 | 1.3% |
| 1.5 | 18 | 1.4% |
| 1.4 | 22 | 1.8% |
| 1.3 | 28 | 2.2% |
| 1.2 | 45 | 3.6% |
| 1.1 | 58 | 4.6% |
| 1 | 32 | 2.6% |
| 0.2 | 1 | 0.1% |
| 0 | 1017 | 81.4% |
| -1 | 2 | 0.2% |

---

## 6. RESUMO FINAL DE ACERTIVIDADE

| Pergunta | Resposta |
|----------|---------|
| Quando o motor diz APOSTAR, acerta? | **6.5%** das vezes (36/555) |
| Dos brancos que vieram, o motor previu quantos? | **2.8%** (36 de 1286) |
| O motor é melhor que apostar aleatório? | ❌ Não (6.5% vs 6.7%) |
| O motor é lucrativo? | ❌ Não (precisa >7.14%, tem 6.5%) |
| Existe filtro que torna lucrativo? | ✅ **≥3 sinais** → 8.3% precisão, ROI 16.7% |

---
*Curadoria gerada em 2026-05-15T12:03:49.850Z*