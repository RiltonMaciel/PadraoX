# ANÁLISE PROFUNDA — NÚMERO 1

**Dataset:** 1000 rodadas | **Taxa base branco:** 6.80%

---

## 1. PERFIL ESTATÍSTICO BÁSICO

| Métrica | Valor |
|---------|-------|
| Frequência absoluta | 64 |
| Frequência relativa | 6.40% |
| Esperado (1/15) | 67 (6.67%) |
| Desvio | -3 |

### Distribuição por dia

| Dia | Rodadas | Aparições do 1 | % |
|-----|---------|----------------|---|
| 14/05/2026 | 36 | 4 | 11.1% |
| 15/05/2026 | 964 | 60 | 6.2% |

### Distribuição por hora

| Hora | Rodadas | Aparições do 1 | % |
|------|---------|----------------|---|
| 00h | 120 | 8 | 6.7% |
| 01h | 119 | 11 | 9.2% |
| 02h | 120 | 5 | 4.2% |
| 03h | 120 | 6 | 5.0% |
| 04h | 119 | 8 | 6.7% |
| 05h | 120 | 6 | 5.0% |
| 06h | 120 | 8 | 6.7% |
| 07h | 119 | 8 | 6.7% |
| 23h | 36 | 4 | 11.1% |

### Gaps entre aparições do 1

| Métrica | Valor |
|---------|-------|
| Gap médio | 15.3 rodadas |
| Gap mediano | 14 rodadas |
| Gap máximo | 78 rodadas |
| Gap esperado (1/freq) | 15.6 rodadas |

---

## 2. RELAÇÃO COM O BRANCO

### Branco após o número 1

| Janela | Vezes que 1 saiu | Branco na janela | Taxa | Esperado | Z-score | Sig |
|--------|------------------|------------------|------|----------|---------|-----|
| +1 rod | 64 | 6 | 9.4% | 6.8% | 0.82 (ns) |
| +2 rod | 64 | 11 | 17.2% | 13.1% | 0.96 (ns) |
| +3 rod | 64 | 12 | 18.8% | 19.0% | -0.06 (ns) |
| +5 rod | 64 | 17 | 26.6% | 29.7% | -0.55 (ns) |

### O 1 como predecessor direto do branco

| Métrica | Valor |
|---------|-------|
| Brancos com 1 como predecessor | 6/68 (8.8%) |
| Esperado (freq do 1) | 6.4% |
| Z-score | 0.82 (ns) |

---

## 3. COMPORTAMENTO EM REPETIÇÃO

### Repetição: 1 aparece 2x nas últimas 3 rodadas

| Métrica | Valor |
|---------|-------|
| Situações (1 aparece 2x/3) | 7 |
| Brancos nessa situação | 1 |
| Taxa | 14.3% |
| Taxa base | 6.80% |
| Z-score | 0.79 (ns) |
| Amostra suficiente (≥50)? | NÃO — resultado inconclusivo |

### Repetição: 1 aparece 3x nas últimas 3 (tripla)

| Métrica | Valor |
|---------|-------|
| Situações (1,1,1) | 0 |
| Brancos | 0 |
| Taxa | N/A |
| Amostra suficiente? | NÃO (0 casos) — resultado inconclusivo |

### Consecutiva (1,1) vs Não-consecutiva (1,X,1)

| Tipo | Situações | Brancos | Taxa | Z-score | Sig |
|------|-----------|---------|------|---------|-----|
| Consecutiva (…,1,1,?) | 2 | 1 | 50.0% | 2.43 | * |
| Não-consecutiva (1,X,1,?) | 5 | 0 | 0.0% | -0.60 | ns |

⚠️ Amostras < 50 podem ser inconclusivas.

---

## 4. COMPORTAMENTO EM GAPS LONGOS

### Frequência do 1 em gaps longos (dist > 20) vs curtos

| Contexto | Rodadas | Aparições do 1 | % do 1 | Freq geral |
|----------|---------|----------------|--------|------------|
| Gap > 20 | 246 | 15 | 6.1% | 6.4% |
| Gap ≤ 20 | 686 | 49 | 7.1% | 6.4% |

### 1 aparece em dist ≥ X: taxa de branco na próxima rodada

| Dist mín | Vezes que 1 saiu | Branco na próxima | Taxa | Base | Z-score | Sig |
|----------|------------------|-------------------|------|------|---------|-----|
| ≥20 | 18 | 2 | 11.1% | 6.8% | 0.73 | ns |
| ≥25 | 11 | 1 | 9.1% | 6.8% | 0.30 | ns |
| ≥30 | 8 | 1 | 12.5% | 6.8% | 0.64 | ns |
| ≥35 | 7 | 1 | 14.3% | 6.8% | 0.79 | ns |
| ≥40 | 4 | 0 | 0.0% | 6.8% | -0.54 | ns |

### 1 aparece em dist ≥ X: branco em até 3 rodadas

| Dist mín | Situações | Branco em ≤3 | Taxa | Esperado | Z-score | Sig |
|----------|-----------|--------------|------|----------|---------|-----|
| ≥20 | 18 | 4 | 22.2% | 19.0% | 0.34 | ns |
| ≥25 | 11 | 2 | 18.2% | 19.0% | -0.07 | ns |
| ≥30 | 8 | 2 | 25.0% | 19.0% | 0.43 | ns |
| ≥35 | 7 | 2 | 28.6% | 19.0% | 0.64 | ns |
| ≥40 | 4 | 0 | 0.0% | 19.0% | -0.97 | ns |

---

## 5. INTERAÇÃO COM OUTROS NÚMEROS (pares nas últimas 4)

### Pares 1+X nas últimas 4 rodadas → taxa de branco na rodada seguinte

| Par | Situações | Brancos | Taxa | vs Base | Z-score | Sig | Amostra |
|-----|-----------|---------|------|---------|---------|-----|---------|
| 1+ 4 | 47 | 5 | 10.6% | +3.8pp | 1.05 | ns | ⚠️ <50 |
| 1+ 3 | 47 | 4 | 8.5% | +1.7pp | 0.47 | ns | ⚠️ <50 |
| 1+ 6 | 49 | 4 | 8.2% | +1.4pp | 0.38 | ns | ⚠️ <50 |
| 1+10 | 51 | 4 | 7.8% | +1.0pp | 0.30 | ns | ✅ 51 |
| 1+11 | 39 | 3 | 7.7% | +0.9pp | 0.22 | ns | ⚠️ <50 |
| 1+13 | 41 | 3 | 7.3% | +0.5pp | 0.13 | ns | ⚠️ <50 |
| 1+ 9 | 34 | 2 | 5.9% | -0.9pp | -0.21 | ns | ⚠️ <50 |
| 1+ 7 | 44 | 2 | 4.5% | -2.3pp | -0.59 | ns | ⚠️ <50 |
| 1+14 | 67 | 3 | 4.5% | -2.3pp | -0.76 | ns | ✅ 67 |
| 1+12 | 52 | 2 | 3.8% | -3.0pp | -0.85 | ns | ✅ 52 |
| 1+ 5 | 53 | 2 | 3.8% | -3.0pp | -0.88 | ns | ✅ 53 |
| 1+ 8 | 28 | 1 | 3.6% | -3.2pp | -0.68 | ns | ⚠️ <50 |
| 1+ 2 | 50 | 1 | 2.0% | -4.8pp | -1.35 | ns | ✅ 50 |

### Destaques

- **Par 1+11**: 3/39 = 7.7%, Z=0.22 (ns) ⚠️ amostra pequena
- **Par 1+12**: 2/52 = 3.8%, Z=-0.85 (ns)
- **Par 1+13**: 3/41 = 7.3%, Z=0.13 (ns) ⚠️ amostra pequena

### Pares com taxa > 8% (potencialmente relevantes)

- **1+4**: 10.6% (5/47), Z=1.05 (ns)
- **1+3**: 8.5% (4/47), Z=0.47 (ns)
- **1+6**: 8.2% (4/49), Z=0.38 (ns)

---

## 6. CONCLUSÃO SOBRE O NÚMERO 1

### Quadro resumo

| Teste | Resultado | Z-score | Veredicto |
|-------|-----------|---------|-----------|
| Frequência geral | 6.4% (esperado 6.7%) | - | Normal |
| Branco logo após o 1 | 9.4% (base 6.8%) | 0.82 (ns) | NEUTRO |
| Repetição 2x/3 → branco | 14.3% | 0.79 (ns) | ❌ Não significativo |
| Predecessor direto | 8.8% (esp 6.4%) | 0.82 (ns) | Não significativo |

### Classificação

**Classificação primária:** NEUTRO como predecessor individual
> O 1 sozinho não altera significativamente a taxa de branco na rodada seguinte.

### Contextos onde o 1 é relevante

- ❌ **Repetição 2x/3**: Taxa 14.3%, Z=0.79. **NÃO é estatisticamente significativo com estes dados.**
- ❌ **Melhor par: 1+4**: 10.6%, Z=1.05. Nenhum par com significância.

### Validação do V4

O modelo V4 utiliza "Repetição do 1 (2x nas últimas 3)" como sinal de entrada.
- ⚠️ **NÃO CONFIRMADO neste dataset**: Z=0.79 (abaixo de 1.96). O padrão pode ter sido overfitting do dataset anterior ou a amostra de repetições é pequena demais (7 casos).

---
*Relatório gerado automaticamente em 2026-05-15T11:35:11.385Z*
*Dataset: 1000 rodadas | Base rate: 6.80%*