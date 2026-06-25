# Padrão X — Previsão Temporal do Branco (v2 - Corrigido)

> Atualizado em 31/05/2026 com base em análise de 1000 rodadas reais.

## Teoria (Corrigida)

Quando o branco (0) sai, os números na posição **2ª e 3ª ANTES** dele (pulando o vizinho imediato) indicam em **quantas rodadas** o próximo branco vai aparecer.

**IMPORTANTE:** A unidade é RODADAS (~30 seg cada), NÃO minutos.

## Regra

```
Branco saiu na rodada R

N1 = número 2 posições ANTES do branco (pula o vizinho imediato)
N2 = número 3 posições ANTES do branco

Fórmula: MAX(N1, N2) = rodadas até o próximo branco
Tempo: rodadas × 0.5 min = minutos até próximo branco
```

## Exemplo Prático

```
Sequência: ..., 4(V), 3(V), 10(P), [BRANCO às 15:31], ...

N1 = 3  (2º antes — posição -2)
N2 = 4  (3º antes — posição -3)
OBS: O 10 (posição -1) é IGNORADO

MAX(3, 4) = 4 rodadas → ~2 min → próximo branco ~15:33
```

## Performance Validada

| Fórmula | Taxa ±3 rodadas | Lift vs acaso | Erro médio |
|---------|-----------------|---------------|------------|
| **MAX(2antes, 3antes)** | **35.3%** | **1.40x** | 9.4 rodadas |
| DIFF(2antes, 3antes) | 34.0% | 1.35x | 12.3 rodadas |
| MEDIA(2antes, 3antes) | 31.4% | 1.24x | 10.1 rodadas |

Baseline (acerto aleatório): 25.3%

## Filtro de Cor (INVERTIDO do original)

- **Cores DIFERENTES** entre N1 e N2 → taxa **47.6%** (melhor!)
- Mesma cor → taxa 26.7% (pior)

## Como Usar na Prática

1. Quando sair um branco, anote a rodada/horário
2. **PULE o número imediatamente antes** (posição -1)
3. Pegue o **2º e 3º números antes** do branco
4. Calcule **MAX(N1, N2)** = rodadas até o próximo branco
5. Converta: rodadas × 30 seg = tempo aproximado
6. Se N1 e N2 são de **cores diferentes**, a previsão é mais confiável

## Tolerâncias

| Tolerância | Significado |
|-----------|-------------|
| ±1 rodada (~30s) | Acerto exato |
| ±2 rodadas (~1min) | Acerto bom |
| ±3 rodadas (~1.5min) | Acerto aceitável (recomendado) |

## Números Bloqueadores (Anunciam Atraso)

Quando estes números aparecem nas 5 rodadas ANTES da posição prevista, o branco tende a **atrasar**:

| Número | Ratio vs acerto | Nível |
|--------|----------------|-------|
| **2** | 3.13x | ⚠️ Bloqueador forte |
| **3** | 3.13x | ⚠️ Bloqueador forte |
| **11** | 2.09x | ⚠️ Bloqueador |
| **4** | 1.96x | ⚠️ Bloqueador |
| **12** | 1.96x | ⚠️ Bloqueador |
| **9** | 1.88x | ⚠️ Bloqueador |

## Números Favoráveis (Anunciam que o Branco Vem)

| Número | Ratio | Significado |
|--------|-------|-------------|
| **14** | 0.00 | NUNCA apareceu antes de atraso |
| **8** | 0.45 | Favorece o branco vir |
| **1** | 0.52 | Favorece o branco vir |

## Número na Posição Exata da Previsão

Se na rodada prevista aparecer:
- **3, 6, 9, 13** → branco SEMPRE atrasou (100% das vezes)
- **14, 2, 8** → branco veio normalmente (sinal bom)

## Padrões de Cor que Anunciam Atraso

Padrão das 3 rodadas ANTES da posição prevista:

| Padrão | Resultado | Ação |
|--------|-----------|------|
| **PVP** (Preto-Verm-Preto) | 5 atrasos, 0 acertos | ❌ NÃO APOSTAR |
| **VVV** (3 Vermelhos) | 3 atrasos, 0 acertos | ❌ NÃO APOSTAR |
| **VVP** | 4 atrasos, 1 acerto | ⚠️ Cuidado |
| **PPP** (3 Pretos) | 4 atrasos, 1 acerto | ⚠️ Cuidado |
| **VBP** ou **PBV** (Branco no meio) | 0 atrasos, 6 acertos | ✅ APOSTAR |

## Se o Branco Não Veio na Hora Prevista

Não desista imediato! Probabilidade acumulada de vir depois:

| Rodadas extras | Tempo extra | Chance de já ter vindo |
|----------------|-------------|------------------------|
| +5 | ~2.5 min | 22% |
| +10 | ~5 min | **52%** |
| +15 | ~7.5 min | **65%** |
| +20 | ~10 min | 70% |
| +30 | ~15 min | 83% |

**Resumo:** Se não veio, espere +10 rodadas (~5 min). Metade das vezes ele vem nesse intervalo.

## Dados Gerais (1000 rodadas - 31/05/2026)

- Intervalo médio entre brancos: **8.1 min** (~16 rodadas)
- Mediana: 6 min (~12 rodadas)
- Mínimo: 1 min | Máximo: 26 min
- Frequência: 1 branco a cada ~16 rodadas

## Estratégia Completa

```
1. BRANCO saiu → anotar horário
2. Pegar N1 (2º antes) e N2 (3º antes)
3. Calcular MAX(N1, N2) = X rodadas
4. Horário previsto = agora + (X × 30seg)
5. VERIFICAR SINAIS:
   - Se nas rodadas antes da previsão aparecer 2, 3, 11 → CUIDADO
   - Se aparecer 14, 8, 1 → CONFIANÇA
   - Se padrão PVP ou VVV antes → ABORTAR
   - Se padrão com Branco no meio → IR COM TUDO
6. Se não veio na hora: esperar +10 rodadas (52% de chance)
7. Se passou +15 rodadas extras: provavelmente perdeu, aguardar próximo ciclo
```

## Script de Validação

Arquivo: `Planilha/curadoria-padrao-x.js`

```bash
cd Planilha
node curadoria-padrao-x.js
```

Requer arquivo Excel com dados na mesma pasta.
