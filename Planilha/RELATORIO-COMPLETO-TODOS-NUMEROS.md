# ANÁLISE COMPLETA — TODOS OS NÚMEROS (0 a 14)

**Dataset:** 20000 rodadas | **Brancos:** 1330 (6.65%) | **Data:** 2026-05-15

**Critério de significância:** Z-score ≥ 1.96 (p < 0.05)

**Regra de amostra:** Resultados com < 50 observações são marcados como inconclusivos.

---

## TABELA RESUMO — TODOS OS NÚMEROS

| # | Freq | Branco +1 | Z | Branco +3 | Z | Predecessor | Z | Rep 2x/3 | Z | Classif. | Eficácia |
|---|------|-----------|---|-----------|---|-------------|---|----------|---|----------|----------|
| **0** | 1330 (6.7%) | 6.1% | -0.82 | 15.9% | -2.61 | 6.1% | -0.82 | - | - | ⚪ NEUTRO | **56%** |
| **1** | 1363 (6.8%) | 5.8% | -1.27 | 18.0% | -0.64 | 5.9% | -1.27 | 7.0% (228) | 0.22 | ⚡ Tendência bloqueio (não significativa) | **19%** |
| **2** | 1295 (6.5%) | 6.7% | 0.10 | 17.0% | -1.54 | 6.5% | 0.10 | 4.2% (214) | -1.44 | ⚪ NEUTRO | **23%** |
| **3** | 1359 (6.8%) | 6.4% | -0.37 | 19.4% | 0.66 | 6.5% | -0.37 | 9.1% (265) | 1.57 | ⚪ NEUTRO | **24%** |
| **4** | 1361 (6.8%) | 7.4% | 1.14 | 19.2% | 0.50 | 7.6% | 1.14 | 4.5% (289) | -1.47 | ⚡ Tendência positiva (não significativa) | **25%** |
| **5** | 1366 (6.8%) | 7.8% | 1.75 | 21.2% | 2.39 | 8.0% | 1.76 | 9.1% (276) | 1.61 | ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | **56%** |
| **6** | 1339 (6.7%) | 5.8% | -1.21 | 17.2% | -1.39 | 5.9% | -1.21 | 4.1% (241) | -1.56 | ⚡ Tendência bloqueio (não significativa) | **24%** |
| **7** | 1305 (6.5%) | 7.3% | 0.91 | 19.9% | 1.18 | 7.1% | 0.91 | 5.8% (257) | -0.52 | ⚪ NEUTRO | **29%** |
| **8** | 1320 (6.6%) | 6.5% | -0.19 | 20.6% | 1.84 | 6.5% | -0.20 | 11.3% (247) | 2.96 | ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | **53%** |
| **9** | 1372 (6.9%) | 6.0% | -0.89 | 19.4% | 0.71 | 6.2% | -0.89 | 9.7% (279) | 2.03 | ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | **39%** |
| **10** | 1302 (6.5%) | 6.8% | 0.16 | 18.0% | -0.56 | 6.6% | 0.16 | 7.7% (208) | 0.60 | ⚪ NEUTRO | **26%** |
| **11** | 1318 (6.6%) | 6.5% | -0.18 | 18.1% | -0.48 | 6.5% | -0.18 | 4.9% (223) | -1.03 | ⚪ NEUTRO | **25%** |
| **12** | 1308 (6.5%) | 7.3% | 1.00 | 19.3% | 0.57 | 7.2% | 1.00 | 7.4% (231) | 0.43 | ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | **48%** |
| **13** | 1338 (6.7%) | 6.3% | -0.55 | 19.3% | 0.59 | 6.3% | -0.55 | 5.0% (238) | -1.00 | ⚪ NEUTRO | **17%** |
| **14** | 1324 (6.6%) | 6.9% | 0.44 | 19.3% | 0.64 | 6.9% | 0.44 | 7.7% (260) | 0.67 | ⚪ NEUTRO | **27%** |

---

## Número 0 (BRANCO)

**Frequência:** 1330/20000 (6.65%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 56%

### Branco após o número 0

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1330 | 81 | 6.1% | 6.7% | -0.82 | ns |
| +2 rod | 1330 | 152 | 11.4% | 12.9% | -1.56 | ns |
| +3 rod | 1330 | 211 | 15.9% | 18.7% | -2.61 | ** |
| +5 rod | 1330 | 380 | 28.6% | 29.1% | -0.43 | ns |

**Predecessor direto do branco:** 81/1330 (6.1%), esperado 6.7%, Z=-0.82 (ns)

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 0 | 0.0% | 6.7% |
| Gap ≤ 20 | 14160 | 0 | 0.0% | 6.7% |

**Em dist≥35:** Nenhuma aparição neste contexto.

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.1% | 1330 | -0.82 (ns) | ❌ NÃO |
| Branco +3 rod após N | 15.9% | 1330 | -2.61 (**) | ✅ SIM |
| Predecessor do branco | 6.1% | 1330 | -0.82 (ns) | ❌ NÃO |
| Em dist≥35 → branco | N/A | 0 ⚠️ | 0.00 (ns) | ❌ NÃO |

---

## Número 1 (Vermelho)

**Frequência:** 1363/20000 (6.82%) | **Classificação:** ⚡ Tendência bloqueio (não significativa) | **Eficácia:** 19%

### Branco após o número 1

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1363 | 79 | 5.8% | 6.7% | -1.27 | ns |
| +2 rod | 1363 | 174 | 12.8% | 12.9% | -0.10 | ns |
| +3 rod | 1363 | 245 | 18.0% | 18.7% | -0.64 | ns |
| +5 rod | 1363 | 396 | 29.1% | 29.1% | -0.05 | ns |

**Predecessor direto do branco:** 79/1330 (5.9%), esperado 6.8%, Z=-1.27 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 228 |
| Brancos | 16 |
| Taxa | 7.0% |
| Z-score | 0.22 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 77 | 6 | 7.8% | 0.40 | ns |
| Não-consec. | 151 | 10 | 6.6% | -0.01 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 308 | 6.8% | 6.8% |
| Gap ≤ 20 | 14160 | 1055 | 7.5% | 6.8% |

**Em dist≥35 → branco na próxima:** 5/103 = 4.9%, Z=-0.73 (ns)

### Melhor par

**1+4** nas últimas 4: 72/966 = 7.5%, Z=1.00 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 5.8% | 1363 | -1.27 (ns) | ❌ NÃO |
| Branco +3 rod após N | 18.0% | 1363 | -0.64 (ns) | ❌ NÃO |
| Predecessor do branco | 5.9% | 1330 | -1.27 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 7.0% | 228 | 0.22 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 4.9% | 103 | -0.73 (ns) | ❌ NÃO |
| Melhor par (1+4) | 7.5% | 966 | 1.00 (ns) | ❌ NÃO |

---

## Número 2 (Vermelho)

**Frequência:** 1295/20000 (6.48%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 23%

### Branco após o número 2

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1295 | 87 | 6.7% | 6.7% | 0.10 | ns |
| +2 rod | 1295 | 153 | 11.8% | 12.9% | -1.12 | ns |
| +3 rod | 1295 | 220 | 17.0% | 18.7% | -1.54 | ns |
| +5 rod | 1294 | 362 | 28.0% | 29.1% | -0.90 | ns |

**Predecessor direto do branco:** 87/1330 (6.5%), esperado 6.5%, Z=0.10 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 214 |
| Brancos | 9 |
| Taxa | 4.2% |
| Z-score | -1.44 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 75 | 3 | 4.0% | -0.92 | ns |
| Não-consec. | 139 | 6 | 4.3% | -1.10 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 327 | 7.3% | 6.5% |
| Gap ≤ 20 | 14160 | 968 | 6.8% | 6.5% |

**Em dist≥35 → branco na próxima:** 7/107 = 6.5%, Z=-0.04 (ns)

### Melhor par

**2+8** nas últimas 4: 62/930 = 6.7%, Z=0.02 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.7% | 1295 | 0.10 (ns) | ❌ NÃO |
| Branco +3 rod após N | 17.0% | 1295 | -1.54 (ns) | ❌ NÃO |
| Predecessor do branco | 6.5% | 1330 | 0.10 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 4.2% | 214 | -1.44 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 6.5% | 107 | -0.04 (ns) | ❌ NÃO |
| Melhor par (2+8) | 6.7% | 930 | 0.02 (ns) | ❌ NÃO |

---

## Número 3 (Vermelho)

**Frequência:** 1359/20000 (6.79%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 24%

### Branco após o número 3

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1359 | 87 | 6.4% | 6.7% | -0.37 | ns |
| +2 rod | 1359 | 176 | 13.0% | 12.9% | 0.10 | ns |
| +3 rod | 1359 | 263 | 19.4% | 18.7% | 0.66 | ns |
| +5 rod | 1359 | 419 | 30.8% | 29.1% | 1.40 | ns |

**Predecessor direto do branco:** 87/1330 (6.5%), esperado 6.8%, Z=-0.37 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 265 |
| Brancos | 24 |
| Taxa | 9.1% |
| Z-score | 1.57 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 88 | 11 | 12.5% | 2.20 | * |
| Não-consec. | 177 | 13 | 7.3% | 0.37 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 301 | 6.7% | 6.8% |
| Gap ≤ 20 | 14160 | 1058 | 7.5% | 6.8% |

**Em dist≥35 → branco na próxima:** 8/103 = 7.8%, Z=0.45 (ns)

### Melhor par

**3+4** nas últimas 4: 74/942 = 7.9%, Z=1.49 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.4% | 1359 | -0.37 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.4% | 1359 | 0.66 (ns) | ❌ NÃO |
| Predecessor do branco | 6.5% | 1330 | -0.37 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 9.1% | 265 | 1.57 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 7.8% | 103 | 0.45 (ns) | ❌ NÃO |
| Melhor par (3+4) | 7.9% | 942 | 1.49 (ns) | ❌ NÃO |

---

## Número 4 (Vermelho)

**Frequência:** 1361/20000 (6.80%) | **Classificação:** ⚡ Tendência positiva (não significativa) | **Eficácia:** 25%

### Branco após o número 4

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1361 | 101 | 7.4% | 6.7% | 1.14 | ns |
| +2 rod | 1361 | 167 | 12.3% | 12.9% | -0.65 | ns |
| +3 rod | 1361 | 261 | 19.2% | 18.7% | 0.50 | ns |
| +5 rod | 1361 | 399 | 29.3% | 29.1% | 0.17 | ns |

**Predecessor direto do branco:** 101/1330 (7.6%), esperado 6.8%, Z=1.14 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 289 |
| Brancos | 13 |
| Taxa | 4.5% |
| Z-score | -1.47 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 102 | 6 | 5.9% | -0.31 | ns |
| Não-consec. | 187 | 7 | 3.7% | -1.60 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 327 | 7.3% | 6.8% |
| Gap ≤ 20 | 14160 | 1034 | 7.3% | 6.8% |

**Em dist≥35 → branco na próxima:** 8/103 = 7.8%, Z=0.45 (ns)

### Melhor par

**4+11** nas últimas 4: 78/981 = 8.0%, Z=1.64 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 7.4% | 1361 | 1.14 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.2% | 1361 | 0.50 (ns) | ❌ NÃO |
| Predecessor do branco | 7.6% | 1330 | 1.14 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 4.5% | 289 | -1.47 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 7.8% | 103 | 0.45 (ns) | ❌ NÃO |
| Melhor par (4+11) | 8.0% | 981 | 1.64 (ns) | ❌ NÃO |

---

## Número 5 (Vermelho)

**Frequência:** 1366/20000 (6.83%) | **Classificação:** ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | **Eficácia:** 56%

### Branco após o número 5

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1366 | 107 | 7.8% | 6.7% | 1.75 | ns |
| +2 rod | 1365 | 196 | 14.4% | 12.9% | 1.66 | ns |
| +3 rod | 1365 | 289 | 21.2% | 18.7% | 2.39 | * |
| +5 rod | 1365 | 429 | 31.4% | 29.1% | 1.88 | ns |

**Predecessor direto do branco:** 107/1330 (8.0%), esperado 6.8%, Z=1.76 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 276 |
| Brancos | 25 |
| Taxa | 9.1% |
| Z-score | 1.61 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 100 | 10 | 10.0% | 1.34 | ns |
| Não-consec. | 176 | 15 | 8.5% | 1.00 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 342 | 7.6% | 6.8% |
| Gap ≤ 20 | 14160 | 1024 | 7.2% | 6.8% |

**Em dist≥35 → branco na próxima:** 11/125 = 8.8%, Z=0.96 (ns)

### Melhor par

**5+12** nas últimas 4: 83/947 = 8.8%, Z=2.61 (**)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 7.8% | 1366 | 1.75 (ns) | ❌ NÃO |
| Branco +3 rod após N | 21.2% | 1365 | 2.39 (*) | ✅ SIM |
| Predecessor do branco | 8.0% | 1330 | 1.76 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 9.1% | 276 | 1.61 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 8.8% | 125 | 0.96 (ns) | ❌ NÃO |
| Melhor par (5+12) | 8.8% | 947 | 2.61 (**) | ✅ SIM |

---

## Número 6 (Vermelho)

**Frequência:** 1339/20000 (6.69%) | **Classificação:** ⚡ Tendência bloqueio (não significativa) | **Eficácia:** 24%

### Branco após o número 6

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1339 | 78 | 5.8% | 6.7% | -1.21 | ns |
| +2 rod | 1339 | 163 | 12.2% | 12.9% | -0.75 | ns |
| +3 rod | 1339 | 230 | 17.2% | 18.7% | -1.39 | ns |
| +5 rod | 1339 | 410 | 30.6% | 29.1% | 1.21 | ns |

**Predecessor direto do branco:** 78/1330 (5.9%), esperado 6.7%, Z=-1.21 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 241 |
| Brancos | 10 |
| Taxa | 4.1% |
| Z-score | -1.56 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 79 | 3 | 3.8% | -1.02 | ns |
| Não-consec. | 162 | 7 | 4.3% | -1.19 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 326 | 7.2% | 6.7% |
| Gap ≤ 20 | 14160 | 1013 | 7.2% | 6.7% |

**Em dist≥35 → branco na próxima:** 10/112 = 8.9%, Z=0.97 (ns)

### Melhor par

**6+12** nas últimas 4: 73/946 = 7.7%, Z=1.32 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 5.8% | 1339 | -1.21 (ns) | ❌ NÃO |
| Branco +3 rod após N | 17.2% | 1339 | -1.39 (ns) | ❌ NÃO |
| Predecessor do branco | 5.9% | 1330 | -1.21 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 4.1% | 241 | -1.56 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 8.9% | 112 | 0.97 (ns) | ❌ NÃO |
| Melhor par (6+12) | 7.7% | 946 | 1.32 (ns) | ❌ NÃO |

---

## Número 7 (Vermelho)

**Frequência:** 1305/20000 (6.53%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 29%

### Branco após o número 7

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1305 | 95 | 7.3% | 6.7% | 0.91 | ns |
| +2 rod | 1305 | 180 | 13.8% | 12.9% | 1.01 | ns |
| +3 rod | 1305 | 260 | 19.9% | 18.7% | 1.18 | ns |
| +5 rod | 1305 | 401 | 30.7% | 29.1% | 1.28 | ns |

**Predecessor direto do branco:** 95/1330 (7.1%), esperado 6.5%, Z=0.91 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 257 |
| Brancos | 15 |
| Taxa | 5.8% |
| Z-score | -0.52 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 89 | 5 | 5.6% | -0.39 | ns |
| Não-consec. | 168 | 10 | 6.0% | -0.36 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 334 | 7.4% | 6.5% |
| Gap ≤ 20 | 14160 | 971 | 6.9% | 6.5% |

**Em dist≥35 → branco na próxima:** 7/105 = 6.7%, Z=0.01 (ns)

### Melhor par

**7+8** nas últimas 4: 78/951 = 8.2%, Z=1.92 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 7.3% | 1305 | 0.91 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.9% | 1305 | 1.18 (ns) | ❌ NÃO |
| Predecessor do branco | 7.1% | 1330 | 0.91 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 5.8% | 257 | -0.52 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 6.7% | 105 | 0.01 (ns) | ❌ NÃO |
| Melhor par (7+8) | 8.2% | 951 | 1.92 (ns) | ❌ NÃO |

---

## Número 8 (Preto)

**Frequência:** 1320/20000 (6.60%) | **Classificação:** ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | **Eficácia:** 53%

### Branco após o número 8

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1319 | 86 | 6.5% | 6.7% | -0.19 | ns |
| +2 rod | 1319 | 188 | 14.3% | 12.9% | 1.51 | ns |
| +3 rod | 1319 | 272 | 20.6% | 18.7% | 1.84 | ns |
| +5 rod | 1319 | 389 | 29.5% | 29.1% | 0.30 | ns |

**Predecessor direto do branco:** 86/1330 (6.5%), esperado 6.6%, Z=-0.20 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 247 |
| Brancos | 28 |
| Taxa | 11.3% |
| Z-score | 2.96 (**) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 93 | 14 | 15.1% | 3.25 | ** |
| Não-consec. | 154 | 14 | 9.1% | 1.22 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 318 | 7.1% | 6.6% |
| Gap ≤ 20 | 14160 | 1002 | 7.1% | 6.6% |

**Em dist≥35 → branco na próxima:** 6/109 = 5.5%, Z=-0.48 (ns)

### Melhor par

**8+7** nas últimas 4: 78/951 = 8.2%, Z=1.92 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.5% | 1319 | -0.19 (ns) | ❌ NÃO |
| Branco +3 rod após N | 20.6% | 1319 | 1.84 (ns) | ❌ NÃO |
| Predecessor do branco | 6.5% | 1330 | -0.20 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 11.3% | 247 | 2.96 (**) | ✅ SIM |
| Em dist≥35 → branco | 5.5% | 109 | -0.48 (ns) | ❌ NÃO |
| Melhor par (8+7) | 8.2% | 951 | 1.92 (ns) | ❌ NÃO |

---

## Número 9 (Preto)

**Frequência:** 1372/20000 (6.86%) | **Classificação:** ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | **Eficácia:** 39%

### Branco após o número 9

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1372 | 83 | 6.0% | 6.7% | -0.89 | ns |
| +2 rod | 1372 | 168 | 12.2% | 12.9% | -0.68 | ns |
| +3 rod | 1371 | 266 | 19.4% | 18.7% | 0.71 | ns |
| +5 rod | 1371 | 418 | 30.5% | 29.1% | 1.12 | ns |

**Predecessor direto do branco:** 83/1330 (6.2%), esperado 6.9%, Z=-0.89 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 279 |
| Brancos | 27 |
| Taxa | 9.7% |
| Z-score | 2.03 (*) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 98 | 7 | 7.1% | 0.20 | ns |
| Não-consec. | 181 | 20 | 11.0% | 2.38 | * |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 357 | 7.9% | 6.9% |
| Gap ≤ 20 | 14160 | 1015 | 7.2% | 6.9% |

**Em dist≥35 → branco na próxima:** 5/127 = 3.9%, Z=-1.23 (ns)

### Melhor par

**9+5** nas últimas 4: 74/976 = 7.6%, Z=1.17 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.0% | 1372 | -0.89 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.4% | 1371 | 0.71 (ns) | ❌ NÃO |
| Predecessor do branco | 6.2% | 1330 | -0.89 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 9.7% | 279 | 2.03 (*) | ✅ SIM |
| Em dist≥35 → branco | 3.9% | 127 | -1.23 (ns) | ❌ NÃO |
| Melhor par (9+5) | 7.6% | 976 | 1.17 (ns) | ❌ NÃO |

---

## Número 10 (Preto)

**Frequência:** 1302/20000 (6.51%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 26%

### Branco após o número 10

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1302 | 88 | 6.8% | 6.7% | 0.16 | ns |
| +2 rod | 1302 | 176 | 13.5% | 12.9% | 0.71 | ns |
| +3 rod | 1302 | 235 | 18.0% | 18.7% | -0.56 | ns |
| +5 rod | 1302 | 374 | 28.7% | 29.1% | -0.31 | ns |

**Predecessor direto do branco:** 88/1330 (6.6%), esperado 6.5%, Z=0.16 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 208 |
| Brancos | 16 |
| Taxa | 7.7% |
| Z-score | 0.60 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 63 | 6 | 9.5% | 0.92 | ns |
| Não-consec. | 145 | 10 | 6.9% | 0.12 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 327 | 7.3% | 6.5% |
| Gap ≤ 20 | 14160 | 975 | 6.9% | 6.5% |

**Em dist≥35 → branco na próxima:** 7/116 = 6.0%, Z=-0.27 (ns)

### Melhor par

**10+5** nas últimas 4: 72/889 = 8.1%, Z=1.73 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.8% | 1302 | 0.16 (ns) | ❌ NÃO |
| Branco +3 rod após N | 18.0% | 1302 | -0.56 (ns) | ❌ NÃO |
| Predecessor do branco | 6.6% | 1330 | 0.16 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 7.7% | 208 | 0.60 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 6.0% | 116 | -0.27 (ns) | ❌ NÃO |
| Melhor par (10+5) | 8.1% | 889 | 1.73 (ns) | ❌ NÃO |

---

## Número 11 (Preto)

**Frequência:** 1318/20000 (6.59%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 25%

### Branco após o número 11

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1318 | 86 | 6.5% | 6.7% | -0.18 | ns |
| +2 rod | 1318 | 159 | 12.1% | 12.9% | -0.86 | ns |
| +3 rod | 1318 | 239 | 18.1% | 18.7% | -0.48 | ns |
| +5 rod | 1318 | 373 | 28.3% | 29.1% | -0.65 | ns |

**Predecessor direto do branco:** 86/1330 (6.5%), esperado 6.6%, Z=-0.18 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 223 |
| Brancos | 11 |
| Taxa | 4.9% |
| Z-score | -1.03 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 87 | 5 | 5.7% | -0.34 | ns |
| Não-consec. | 136 | 6 | 4.4% | -1.05 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 320 | 7.1% | 6.6% |
| Gap ≤ 20 | 14160 | 998 | 7.0% | 6.6% |

**Em dist≥35 → branco na próxima:** 10/111 = 9.0%, Z=1.00 (ns)

### Melhor par

**11+4** nas últimas 4: 78/981 = 8.0%, Z=1.64 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.5% | 1318 | -0.18 (ns) | ❌ NÃO |
| Branco +3 rod após N | 18.1% | 1318 | -0.48 (ns) | ❌ NÃO |
| Predecessor do branco | 6.5% | 1330 | -0.18 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 4.9% | 223 | -1.03 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 9.0% | 111 | 1.00 (ns) | ❌ NÃO |
| Melhor par (11+4) | 8.0% | 981 | 1.64 (ns) | ❌ NÃO |

---

## Número 12 (Preto)

**Frequência:** 1308/20000 (6.54%) | **Classificação:** ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | **Eficácia:** 48%

### Branco após o número 12

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1308 | 96 | 7.3% | 6.7% | 1.00 | ns |
| +2 rod | 1308 | 177 | 13.5% | 12.9% | 0.73 | ns |
| +3 rod | 1308 | 252 | 19.3% | 18.7% | 0.57 | ns |
| +5 rod | 1308 | 374 | 28.6% | 29.1% | -0.41 | ns |

**Predecessor direto do branco:** 96/1330 (7.2%), esperado 6.5%, Z=1.00 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 231 |
| Brancos | 17 |
| Taxa | 7.4% |
| Z-score | 0.43 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 80 | 2 | 2.5% | -1.49 | ns |
| Não-consec. | 151 | 15 | 9.9% | 1.62 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 298 | 6.6% | 6.5% |
| Gap ≤ 20 | 14160 | 1010 | 7.1% | 6.5% |

**Em dist≥35 → branco na próxima:** 10/103 = 9.7%, Z=1.25 (ns)

### Melhor par

**12+5** nas últimas 4: 83/947 = 8.8%, Z=2.61 (**)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 7.3% | 1308 | 1.00 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.3% | 1308 | 0.57 (ns) | ❌ NÃO |
| Predecessor do branco | 7.2% | 1330 | 1.00 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 7.4% | 231 | 0.43 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 9.7% | 103 | 1.25 (ns) | ❌ NÃO |
| Melhor par (12+5) | 8.8% | 947 | 2.61 (**) | ✅ SIM |

---

## Número 13 (Preto)

**Frequência:** 1338/20000 (6.69%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 17%

### Branco após o número 13

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1338 | 84 | 6.3% | 6.7% | -0.55 | ns |
| +2 rod | 1338 | 171 | 12.8% | 12.9% | -0.08 | ns |
| +3 rod | 1338 | 258 | 19.3% | 18.7% | 0.59 | ns |
| +5 rod | 1338 | 400 | 29.9% | 29.1% | 0.63 | ns |

**Predecessor direto do branco:** 84/1330 (6.3%), esperado 6.7%, Z=-0.55 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 238 |
| Brancos | 12 |
| Taxa | 5.0% |
| Z-score | -1.00 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 76 | 5 | 6.6% | -0.02 | ns |
| Não-consec. | 162 | 7 | 4.3% | -1.19 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 300 | 6.7% | 6.7% |
| Gap ≤ 20 | 14160 | 1038 | 7.3% | 6.7% |

**Em dist≥35 → branco na próxima:** 5/104 = 4.8%, Z=-0.75 (ns)

### Melhor par

**13+4** nas últimas 4: 74/981 = 7.5%, Z=1.12 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.3% | 1338 | -0.55 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.3% | 1338 | 0.59 (ns) | ❌ NÃO |
| Predecessor do branco | 6.3% | 1330 | -0.55 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 5.0% | 238 | -1.00 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 4.8% | 104 | -0.75 (ns) | ❌ NÃO |
| Melhor par (13+4) | 7.5% | 981 | 1.12 (ns) | ❌ NÃO |

---

## Número 14 (Preto)

**Frequência:** 1324/20000 (6.62%) | **Classificação:** ⚪ NEUTRO | **Eficácia:** 27%

### Branco após o número 14

| Janela | Situações | Brancos | Taxa | Esperado | Z-score | Sig |
|--------|-----------|---------|------|----------|---------|-----|
| +1 rod | 1324 | 92 | 6.9% | 6.7% | 0.44 | ns |
| +2 rod | 1324 | 179 | 13.5% | 12.9% | 0.72 | ns |
| +3 rod | 1324 | 256 | 19.3% | 18.7% | 0.64 | ns |
| +5 rod | 1323 | 382 | 28.9% | 29.1% | -0.19 | ns |

**Predecessor direto do branco:** 92/1330 (6.9%), esperado 6.6%, Z=0.44 (ns)

### Repetição 2x nas últimas 3

| Métrica | Valor |
|---------|-------|
| Situações | 260 |
| Brancos | 20 |
| Taxa | 7.7% |
| Z-score | 0.67 (ns) |
| Amostra ≥50? | SIM |

**Consecutiva vs Não-consecutiva:**
| Tipo | Casos | Brancos | Taxa | Z | Sig |
|------|-------|---------|------|---|-----|
| Consecutiva | 90 | 5 | 5.6% | -0.42 | ns |
| Não-consec. | 170 | 15 | 8.8% | 1.14 | ns |

### Comportamento em gaps longos

| Contexto | Rodadas | Aparições | % | Freq geral |
|----------|---------|-----------|---|------------|
| Gap > 20 | 4510 | 325 | 7.2% | 6.6% |
| Gap ≤ 20 | 14160 | 999 | 7.1% | 6.6% |

**Em dist≥35 → branco na próxima:** 13/121 = 10.7%, Z=1.81 (ns)

### Melhor par

**14+10** nas últimas 4: 69/901 = 7.7%, Z=1.21 (ns)

### Bateria de testes

| Teste | Valor | Amostra | Z-score | Significativo? |
|-------|-------|---------|---------|----------------|
| Branco +1 rod após N | 6.9% | 1324 | 0.44 (ns) | ❌ NÃO |
| Branco +3 rod após N | 19.3% | 1324 | 0.64 (ns) | ❌ NÃO |
| Predecessor do branco | 6.9% | 1330 | 0.44 (ns) | ❌ NÃO |
| Repetição 2x/3 → branco | 7.7% | 260 | 0.67 (ns) | ❌ NÃO |
| Em dist≥35 → branco | 10.7% | 121 | 1.81 (ns) | ❌ NÃO |
| Melhor par (14+10) | 7.7% | 901 | 1.21 (ns) | ❌ NÃO |

---

## RANKING DE EFICÁCIA — TODOS OS NÚMEROS

> Eficácia = combinação de (1) proporção de testes estatisticamente significativos e (2) força do maior Z-score encontrado. Escala: 0% = nenhum sinal útil, 100% = todos os testes significativos com Z > 3.29.

| Rank | Número | Eficácia | Classificação | Detalhe chave |
|------|--------|----------|---------------|---------------|
| 1 | **0** (branco) | **56%** ███████████░░░░░░░░░ | ⚪ NEUTRO | Branco +3 rod após N: 15.9%, Z=-2.61 |
| 2 | **5** (verm) | **56%** ███████████░░░░░░░░░ | ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | Melhor par (5+12): 8.8%, Z=2.61 |
| 3 | **8** (preto) | **53%** ███████████░░░░░░░░░ | ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | Repetição 2x/3 → branco: 11.3%, Z=2.96 |
| 4 | **12** (preto) | **48%** ██████████░░░░░░░░░░ | ⚡ Tendência positiva (não significativa) + 🤝 PAR FORTE | Melhor par (12+5): 8.8%, Z=2.61 |
| 5 | **9** (preto) | **39%** ████████░░░░░░░░░░░░ | ⚪ NEUTRO + 🔄 REPETIÇÃO FORTE | Repetição 2x/3 → branco: 9.7%, Z=2.03 |
| 6 | **7** (verm) | **29%** ██████░░░░░░░░░░░░░░ | ⚪ NEUTRO | Melhor par (7+8): 8.2%, Z=1.92 |
| 7 | **14** (preto) | **27%** █████░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Em dist≥35 → branco: 10.7%, Z=1.81 |
| 8 | **10** (preto) | **26%** █████░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Melhor par (10+5): 8.1%, Z=1.73 |
| 9 | **4** (verm) | **25%** █████░░░░░░░░░░░░░░░ | ⚡ Tendência positiva (não significativa) | Melhor par (4+11): 8.0%, Z=1.64 |
| 10 | **11** (preto) | **25%** █████░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Melhor par (11+4): 8.0%, Z=1.64 |
| 11 | **3** (verm) | **24%** █████░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Repetição 2x/3 → branco: 9.1%, Z=1.57 |
| 12 | **6** (verm) | **24%** █████░░░░░░░░░░░░░░░ | ⚡ Tendência bloqueio (não significativa) | Repetição 2x/3 → branco: 4.1%, Z=-1.56 |
| 13 | **2** (verm) | **23%** █████░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Branco +3 rod após N: 17.0%, Z=-1.54 |
| 14 | **1** (verm) | **19%** ████░░░░░░░░░░░░░░░░ | ⚡ Tendência bloqueio (não significativa) | Predecessor do branco: 5.9%, Z=-1.27 |
| 15 | **13** (preto) | **17%** ███░░░░░░░░░░░░░░░░░ | ⚪ NEUTRO | Melhor par (13+4): 7.5%, Z=1.12 |

---

## CONCLUSÃO GERAL

### Estatísticas globais

| Métrica | Valor |
|---------|-------|
| Total de números analisados | 15 (0 a 14) |
| Total de testes realizados (amostra ≥10) | 87 |
| Testes com significância (Z≥1.96) | 6 (6.9%) |
| Números com pelo menos 1 teste significativo | 5/15 |
| Números sem NENHUM sinal | 10/15 |

### Eficácia geral da análise por número individual

| Métrica | Valor |
|---------|-------|
| Eficácia média | **32.7%** |
| Eficácia máxima | 56% (número 0) |
| Eficácia mínima | 17% |

### Veredicto final

🟡 **EFICÁCIA MODERADA (33%)**: Alguns números mostram sinais, mas a maioria é ruído. Usar com cautela e apenas os que têm Z≥1.96.

### Números que merecem atenção no novo motor

- **Número 0** (56%): Branco +3 rod após N Z=-2.61
- **Número 5** (56%): Branco +3 rod após N Z=2.39, Melhor par (5+12) Z=2.61
- **Número 8** (53%): Repetição 2x/3 → branco Z=2.96
- **Número 12** (48%): Melhor par (12+5) Z=2.61
- **Número 9** (39%): Repetição 2x/3 → branco Z=2.03
- **Número 7** (29%): Z-scores altos mas abaixo de 1.96
- **Número 14** (27%): Z-scores altos mas abaixo de 1.96
- **Número 10** (26%): Z-scores altos mas abaixo de 1.96
- **Número 4** (25%): Z-scores altos mas abaixo de 1.96
- **Número 11** (25%): Z-scores altos mas abaixo de 1.96
- **Número 3** (24%): Z-scores altos mas abaixo de 1.96
- **Número 6** (24%): Z-scores altos mas abaixo de 1.96
- **Número 2** (23%): Z-scores altos mas abaixo de 1.96

### O que os dados dizem vs o que o V4 usava

| Regra do V4 | Status neste dataset |
|-------------|---------------------|
| Par 11+12 nas últimas 4 (V4: 11.4%) | 6.8% (62/911), Z=0.19 (ns) |
| Distância ≥35 (V4: 8.6%) | 7.2% (112/1549), Z=0.92 (ns) |
| Repetição do 1 2x/3 (V4: 12.0%) | 7.0% (16/228), Z=0.22 (ns) |

---
*Relatório gerado em 2026-05-15T11:52:26.228Z*
*Dataset: 20000 rodadas | Base rate: 6.65% | Testes: 87 | Significativos: 6*