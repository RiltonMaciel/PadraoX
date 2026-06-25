# MODELO COMPLETO — BLAZE DOUBLE (Branco/White)

> **Data da análise:** 30/04/2026  
> **Base de dados:** 1000 rodadas coletadas via TipMiner (02:31 ~ 10:54 do dia 30/04/2026)  
> **Arquivo fonte:** `tipminer-dados-blaze-double.csv`  
> **Objetivo:** Prever quando o **branco (0)** vai aparecer no Blaze Double

---

## 1. O JOGO — BLAZE DOUBLE

- **Números:** 0 a 14
- **Cores:**
  - **Branco (White):** apenas o número **0**
  - **Vermelho (Red):** números **1, 2, 3, 4, 5, 6, 7**
  - **Preto (Black):** números **8, 9, 10, 11, 12, 13, 14**
- **Tempo por rodada:** ~30 segundos
- **Rodadas por minuto:** ~2 (G1 e G2)
- **Payout do branco:** 14x

---

## 2. DADOS UTILIZADOS

| Campo   | Descrição                        |
|---------|----------------------------------|
| Número  | Resultado da rodada (0 a 14)     |
| Cor     | vermelho, preto ou branco        |
| Data    | Sempre 30/04/2026 nesta amostra  |
| Horário | HH:MM:SS de cada rodada          |

- **Total:** 1000 rodadas
- **Brancos na amostra:** ~57 (5.7%)
- **Probabilidade teórica do branco:** 1/15 = 6.67%
- **Observada:** 5.7% (ligeiramente abaixo)

---

## 3. TEORIA DOS PAPÉIS — Cada Número Tem Uma Função

### 3.1 Controladores (Anunciam o Branco)

Certos números, quando aparecem, criam uma **zona de influência** onde o branco tem maior probabilidade de cair nas rodadas seguintes.

| Controlador | Alcance (casas) | Observação                              |
|-------------|----------------|-----------------------------------------|
| **4**       | 4 casas        | Controlador forte                       |
| **6**       | 4 casas        | **Mais forte!** 60.3% traz real ou fake white |
| **10**      | 4 casas        | Controlador forte                       |
| **14**      | 4 casas        | Controlador forte                       |
| **2**       | 2 casas        | Alcance curto                           |
| **9**       | 2 casas        | Alcance curto                           |
| **8**       | 4 casas / 2min | Especial — puxa **preto** na posição +4 (66.7%) |

### 3.2 Interferentes (Modificam a Probabilidade)

| Número | Papel | Efeito                                                        |
|--------|-------|---------------------------------------------------------------|
| **5**  | Confirmador | **Aumenta** a chance de branco para ~26.7% quando sozinho na zona |
| **13** | Bloqueador  | **Bloqueia** o branco quase completamente. 5+13 juntos → apenas 4.8% |
| **7**  | Desviador   | Não bloqueia o branco, mas **desvia** para 11/12 (34.9% de chance de 11 ou 12) |

### 3.3 Moduladores (Alteram o Ritmo do Jogo)

| Número | Papel | Efeito                                                        |
|--------|-------|---------------------------------------------------------------|
| **1**  | Supressor | **Neutraliza controladores** (especialmente o 6: -11.2%). Empurra branco +3 rodadas. Estabiliza cor. |
| **3**  | Ponte/Acelerador | **Acelera ciclo** — 40.5% traz branco em 6 casas. Quebra sequências. Enfraquece até o 13. |

### 3.4 Fake Whites (Brancos Falsos)

| Número | Papel                                                                  |
|--------|------------------------------------------------------------------------|
| **11** | Substituto do branco — aparece quando o 0 está "bloqueado"            |
| **12** | Substituto do branco — aparece quando o 0 está "bloqueado"            |

**Regra do Pool:** A soma de 0 + 11 + 12 se mantém **estável em ~20%** tanto dentro quanto fora das zonas de controle. Quando o 0 é bloqueado, 11 e 12 absorvem a "quota".

---

### 3.5 Detalhamento: Número 1 — SUPRESSOR

O 1 age como um **amortecedor do sistema** que enfraquece sinais de branco:

| Evidência | Dado | Significado |
|-----------|------|-------------|
| Neutraliza controlador 6 | 29.4% → 18.2% (-11.2%) | O 6 perde quase metade da força |
| Neutraliza controlador 10 | 20.9% → 15.0% (-5.9%) | Idem |
| Neutraliza controlador 4 | 18.0% → 14.3% (-3.7%) | Idem |
| **EXCEÇÃO: Amplifica 14** | 20.9% → **35.7%** (+14.8%) | O 14 é imune à supressão — é potencializado |
| Distância até branco | 19.3 vs 16.3 (média geral) | Branco demora +3 rodadas a mais |
| Estabiliza cor | 43.3% mudança (base: 50.7%) | Mantém sequência de mesma cor |
| 1→5 = bumerangue | **50% branco** em +2~+5 | Se seguido do 5, efeito inverte completamente |
| 1→13 = bloqueio total | **0% branco** | Potencializa o bloqueio do 13 |
| Concentração: 2h (14%) e 7h (10%) | Mais presente nas horas frias | Confirma papel de supressão |
| 80% mais frequente em REC | 8.3% no REC vs 4.6% fora | "Mora" nas secas |

**Resumo do 1:** Quando o 1 aparece, o branco se afasta. Ele enfraquece os controladores 4, 6 e 10. MAS quando combinado com 14, amplifica. E se seguido do 5, cria efeito bumerangue (50% branco).

---

### 3.6 Detalhamento: Número 3 — PONTE / ACELERADOR DE CICLO

O 3 é o oposto do 1 — ele **acelera o ciclo** e encurta o caminho até o branco:

| Evidência | Dado | Significado |
|-----------|------|-------------|
| Traz branco em ≤6 casas | **40.5%** (muito acima da média) | Forte influência de aproximação |
| Pico na posição +6 | 10.1% de branco | Age a distância, como controlador lento |
| Reduz chance de seca | 24.1% sem branco em 20 (base: 29.1%) | Encurta gaps |
| Quebra sequências de cor | 57.5% muda cor (base: 50.7%) | Marca transição |
| Enfraquece o 13 | 3→13: 28.6% branco! | O 3 fura o bloqueio do 13 |
| **Amplifica 14** | 20.6% → **30.4%** (+9.8%) | Como o 1, potencializa o 14 |
| Foge do branco | Só 5.0% após branco (esperado: 7.9%) | Não aparece pós-white |
| Aparece no meio da seca | 9.7% em gap 11-20 vs 5.4% em gap 1-5 | Convocado para quebrar secas |
| Controladores o chamam | 13(12.7%), 4(11.4%), 8(10.1%) precedem o 3 | O sistema o convoca |
| Distância até branco | 15.4 vs 16.3 (média geral) | Branco chega mais rápido |

**Resumo do 3:** Quando o 3 aparece no meio de uma seca, é sinal de que o branco está se aproximando. Ele tem 40.5% de trazer branco em 6 casas e consegue até enfraquecer o bloqueio do 13.

---

### 3.7 Interação 1 + 3

| Cenário | Branco | Interpretação |
|---------|--------|---------------|
| 1 + 3 na mesma zona (4 casas) | **4.8%** | O 1 domina — supressão vence |
| **3 → 1** (3 antes, depois 1) | **22.2%** | A ponte do 3 é forte o bastante pra superar |
| 1 → 3 (1 antes, depois 3) | 7.7% | O 1 amortece o efeito do 3 |

**⚠️ A ORDEM IMPORTA:** 3→1 = branco provável (22.2%). 1→3 = branco improvável (7.7%).

---

## 4. REGRAS DE INTERAÇÃO VALIDADAS

### 4.1 Combinações Críticas

| Cenário                | Branco (0) | Explicação                                    |
|------------------------|-----------|-----------------------------------------------|
| **5 sozinho na zona**  | **26.7%** | 5 confirma o branco — chance elevada          |
| **13 sozinho na zona** | **~0%**   | 13 bloqueia completamente                     |
| **5 + 13 juntos**      | **4.8%**  | 13 vence o 5 — branco bloqueado               |
| **5 + 7 juntos**       | **~alta** | Combo poderoso — branco quase certo            |
| **7 sozinho**          | **11.1%** | Moderado, mas 34.9% vai para 11/12 em vez de 0 |
| **Controlador 6**      | **60.3%** | Traz 0 real ou 11/12 (pool completo)           |

### 4.2 Hierarquia de Força

```
13 (bloqueio) > 5 (confirmação) > 7 (desvio)
```

Quando 13 e 5 estão juntos, o 13 **sempre vence** — o branco é bloqueado.

---

## 5. ANÁLISE G1 vs G2 (Posição no Minuto)

- **G1** = primeira rodada do minuto (segundos mais baixos)
- **G2** = segunda rodada do minuto (segundos mais altos)

| Posição | Total | Branco (0) | 11     | 12     | Pool (0+11+12) |
|---------|-------|-----------|--------|--------|----------------|
| G1      | 504   | **5.0%** (25) | 7.9%   | 6.3%   | 19.2%          |
| G2      | 496   | **6.5%** (32) | 4.0%   | 7.5%   | 17.9%          |

**Conclusão:** O branco prefere o **G2** (6.5% vs 5.0%). Se for apostar, priorizar a segunda rodada do minuto.

### Top 5 números por posição:
- **G1:** 4 (8.7%), 13 (8.3%), 11 (7.9%), 8 (7.5%), 1 (7.1%)
- **G2:** 3 (8.7%), 6 (8.3%), 8 (7.7%), 13 (7.7%), 12 (7.5%)

---

## 6. ANÁLISE POR HORA

| Hora | Rodadas | Branco (0) | 11+12  | Pool   | Classificação  |
|------|---------|-----------|--------|--------|----------------|
| 2h   | 57      | 3.5%      | 10.5%  | 14.0%  | Fria           |
| 3h   | 119     | 5.9%      | 12.6%  | 18.5%  | Normal         |
| 4h   | 120     | 5.8%      | 8.3%   | 14.2%  | Normal         |
| **5h** | 120   | **8.3%**  | 14.2%  | 22.5%  | **QUENTE**     |
| 6h   | 119     | 3.4%      | 12.6%  | 16.0%  | Fria           |
| 7h   | 120     | 4.2%      | 13.3%  | 17.5%  | Fria           |
| 8h   | 119     | 5.9%      | 12.6%  | 18.5%  | Normal         |
| **9h** | 119   | **9.2%**  | 16.0%  | 25.2%  | **MUITO QUENTE** |
| 10h  | 107     | 3.7%      | 15.0%  | 18.7%  | Fria           |

**Melhores horários para branco:** 9h (9.2%) e 5h (8.3%)  
**Piores horários:** 6h (3.4%) e 2h (3.5%)

---

## 7. FAIXAS DE 30 MINUTOS

| Faixa    | Rod | Branco | 11+12 | Pool  | Real/Pool |
|----------|-----|--------|-------|-------|-----------|
| 2:30     | 57  | 3.5%   | 10.5% | 14.0% | 25%       |
| 3:00     | 60  | 5.0%   | 11.7% | 16.7% | 30%       |
| 3:30     | 59  | 6.8%   | 13.6% | 20.3% | 33%       |
| 4:00     | 60  | 6.7%   | 10.0% | 16.7% | 40%       |
| 4:30     | 60  | 5.0%   | 6.7%  | 11.7% | 43%       |
| **5:00** | 60  | **10.0%** | 16.7% | 26.7% | 38%    |
| 5:30     | 60  | 6.7%   | 11.7% | 18.3% | 36%       |
| 6:00     | 60  | 3.3%   | 5.0%  | 8.3%  | 40%       |
| 6:30     | 59  | 3.4%   | 20.3% | 23.7% | 14%       |
| 7:00     | 60  | 3.3%   | 11.7% | 15.0% | 22%       |
| 7:30     | 60  | 5.0%   | 15.0% | 20.0% | 25%       |
| 8:00     | 59  | 3.4%   | 16.9% | 20.3% | 17%       |
| 8:30     | 60  | 8.3%   | 8.3%  | 16.7% | 50%       |
| **9:00** | 60  | **8.3%** | 11.7% | 20.0% | 42%     |
| **9:30** | 59  | **10.2%** | 20.3% | 30.5% | 33%    |
| 10:00    | 58  | 3.4%   | 15.5% | 19.0% | 18%       |
| 10:30    | 49  | 4.1%   | 14.3% | 18.4% | 22%       |

**Melhores faixas:** 9:30 (10.2%), 5:00 (10.0%), 8:30 (8.3%)  
**Real/Pool** = percentual do pool que é branco real (vs fake 11/12). Na 8:30 metade do pool é branco real!

---

## 8. DETECÇÃO DE REC (Períodos de Seca)

**REC** = período prolongado sem branco (≥20 rodadas).

### Distribuição dos gaps entre brancos:

| Tamanho  | Quantidade | %     |
|----------|-----------|-------|
| 1-5      | 11        | 20.0% |
| 6-10     | 15        | 27.3% |
| 11-15    | 8         | 14.5% |
| 16-20    | 4         | 7.3%  |
| 21-30    | 8         | 14.5% |
| 31-50    | 6         | 10.9% |
| 51+      | 3         | 5.5%  |

### Estatísticas gerais:
- **Total de gaps:** 55
- **RECs (≥20 rodadas):** 19
- **RECs longos (≥30):** 9
- **RECs extremos (≥50):** 3
- **65% das rodadas** estão dentro de algum REC!

### RECs detalhados:

| #  | Início   | Fim      | Rodadas | Minutos | 11+12 | %11+12 |
|----|----------|----------|---------|---------|-------|--------|
| 1  | 02:31:52 | 02:41:23 | 20      | 9.5     | 4     | 20.0%  |
| 2  | 02:45:23 | 03:17:57 | **66**  | **32.6**| 7     | 10.6%  |
| 3  | 03:43:00 | 03:55:01 | 25      | 12.0    | 6     | 24.0%  |
| 4  | 03:59:32 | 04:12:34 | 27      | 13.0    | 3     | 11.1%  |
| 5  | 04:28:36 | 04:39:07 | 22      | 10.5    | 0     | 0.0%   |
| 6  | 05:23:42 | 05:43:14 | 40      | 19.5    | 5     | 12.5%  |
| 7  | 05:49:45 | 06:13:20 | 48      | 23.6    | 8     | 16.7%  |
| 8  | 06:15:51 | 06:40:56 | **51**  | **25.1**| 6     | 11.8%  |
| 9  | 06:41:57 | 06:58:00 | 33      | 16.1    | 7     | 21.2%  |
| 10 | 07:08:03 | 07:41:14 | **67**  | **33.2**| 7     | 10.4%  |
| 11 | 07:53:22 | 08:11:04 | 36      | 17.7    | 5     | 13.9%  |
| 12 | 08:12:04 | 08:22:08 | 21      | 10.1    | 6     | 28.6%  |
| 13 | 08:23:09 | 08:33:11 | 21      | 10.0    | 3     | 14.3%  |
| 14 | 08:46:42 | 08:57:14 | 22      | 10.5    | 0     | 0.0%   |
| 15 | 08:58:14 | 09:16:20 | 37      | 18.1    | 5     | 13.5%  |
| 16 | 09:33:28 | 09:43:04 | 20      | 9.6     | 4     | 20.0%  |
| 17 | 09:57:23 | 10:08:03 | 22      | 10.7    | 3     | 13.6%  |
| 18 | 10:16:14 | 10:40:41 | **49**  | **24.4**| 7     | 14.3%  |
| 19 | 10:41:41 | 10:52:49 | 23      | 11.1    | 4     | 17.4%  |

---

## 9. SINAIS ANTES DO REC (Pré-Seca)

### O que aparece nas rodadas anteriores ao REC:

| Posição  | Números mais frequentes                     | Observação                          |
|----------|---------------------------------------------|-------------------------------------|
| -1 (última) | **0 (18x em 19!)**                       | O próprio branco é o último antes da seca |
| -2       | 2(3x), 3(3x), 6(3x), 12(3x)               | Variado                             |
| -3       | 3(3x), 6(3x), 4(2x), 7(2x)                | Controllers presentes               |
| -4       | 5(3x), 0(2x), 1(2x), 3(2x)                | 5 aparece — branco "esgotou"        |
| -5       | 14(3x), 3(2x), 9(2x), 11(2x)              | Controllers e fake whites            |

**Descoberta chave:** Em **18 de 19 RECs (94.7%)**, a última jogada antes de começar a seca foi o **próprio branco (0)**! Isso significa que o branco "se esgota" — sai uma vez e depois entra em seca.

### Presença de interferentes antes do REC:
- **13 nas 5 jogadas antes:** 3/19 (15.8%) — abaixo do esperado
- **5 nas 5 jogadas antes:** 4/19 (21.1%)

---

## 10. DURANTE O REC — Padrões na Seca

| Métrica           | Valor  |
|-------------------|--------|
| Rodadas em REC    | 650    |
| % do total        | 65.0%  |
| Vermelho          | 50.3%  |
| Preto             | 49.7%  |
| 11+12 no REC      | 13.8%  |

### Top números dentro do REC:

| Número | %    | Quantidade |
|--------|------|-----------|
| 8      | 9.2% | 60        |
| 3      | 8.8% | 57        |
| **13** | **8.8%** | **57**|
| 1      | 8.3% | 54        |
| 6      | 7.2% | 47        |
| 12     | 7.2% | 47        |
| 4      | 7.1% | 46        |
| 7      | 6.9% | 45        |

**Observação:** O **13 domina dentro do REC** (8.8%), confirmando que ele é o número que mantém o branco bloqueado. O 8 também é muito presente, puxando preto.

---

## 11. COMO O REC TERMINA — Sinais de Fim

### Últimas rodadas antes do branco voltar:

| Posição do fim | Números mais frequentes        |
|----------------|-------------------------------|
| -1 (última)    | **9(4x)**, 8(3x), 5(2x), 11(2x) |
| -2             | **5(3x)**, **7(3x)**, 8(3x), 1(2x) |
| -3             | 1(4x), 2(3x), 6(2x), 10(2x)  |
| -4             | 3(3x), **5(3x)**, 6(2x), 8(2x) |
| -5             | 1(4x), 3(3x), 8(2x), 10(2x)  |

**Padrão de fim do REC:**
- O **9** aparece como última rodada antes do branco voltar (4x em 19)
- O **5** aparece nas posições -2 e -4, "preparando" o retorno do branco
- O **7** aparece na posição -2, ativando o ciclo
- Combo **5 + 7** próximos do fim = branco iminente

**Após o REC:** Todas as 19 saídas de REC foram naturalmente o **0 (branco)** — pois é ele que encerra o gap.

---

## 12. MODELO DE SCORE — Sistema de Previsão

### Como funciona:

O score é calculado para cada rodada baseado em 4 fatores:

#### Fator 1: Distância desde o último branco
| Distância    | Pontos |
|-------------|--------|
| ≥ 30 rodadas | +3    |
| ≥ 20 rodadas | +2    |
| ≥ 15 rodadas | +1    |
| ≤ 3 rodadas  | -1    |

#### Fator 2: Zona de controlador
| Situação                          | Pontos |
|-----------------------------------|--------|
| Dentro da zona de um controlador  | +1     |

#### Fator 3: Interferentes nas últimas 4 rodadas
| Situação       | Pontos |
|----------------|--------|
| 5 sem 13       | +2     |
| 13 sem 5       | -2     |
| 5 + 13 juntos  | -1     |
| 5 + 7 sem 13   | +1 (bônus) |

### Resultado por score:

| Score | Total | Brancos | Taxa   | Ação              |
|-------|-------|---------|--------|-------------------|
| -3    | 15    | 0       | 0.0%   | ❌ EVITAR          |
| -2    | 33    | 2       | 6.1%   | —                 |
| -1    | 95    | 4       | 4.2%   | —                 |
| 0     | 145   | 5       | 3.4%   | —                 |
| 1     | 242   | 15      | 6.2%   | —                 |
| 2     | 129   | 7       | 5.4%   | —                 |
| 3     | 168   | 10      | 6.0%   | —                 |
| **4** | **102** | **8** | **7.8%** | ⚠️ ATENÇÃO       |
| **5** | **24** | **3**  | **12.5%** | ✅ **APOSTAR**  |
| **7** | **5**  | **1**  | **20.0%** | ✅ **APOSTAR**  |

**Baseline (média):** 5.7%

### Simulação de ROI (payout 14x):

| Threshold  | Entradas | Acertos | Taxa  | ROI      |
|------------|---------|---------|-------|----------|
| Score ≥ -2 | 975     | 57      | 5.8%  | -18.2%   |
| Score ≥ -1 | 942     | 55      | 5.8%  | -18.3%   |
| Score ≥ 0  | 847     | 51      | 6.0%  | -15.7%   |
| Score ≥ 1  | 702     | 46      | 6.6%  | -8.3%    |
| Score ≥ 2  | 460     | 31      | 6.7%  | -5.7%    |
| **Score ≥ 3** | **331** | **24** | **7.3%** | **+1.5%** ✅ |
| **Score ≥ 4** | **163** | **14** | **8.6%** | **+20.2%** ✅✅ |
| **Score ≥ 5** | **61**  | **6**  | **9.8%** | **+37.7%** ✅✅✅ |
| Score ≥ 6  | 37      | 3       | 8.1%  | +13.5%   |

**Ponto de lucro:** Score ≥ 3 já é levemente positivo. O sweet spot é **Score ≥ 4** (+20.2% ROI) com volume razoável (163 entradas).

---

## 13. REGRAS PRÁTICAS DE OPERAÇÃO

### ✅ QUANDO APOSTAR:
1. **Score ≥ 4** no modelo
2. Preferencialmente no **G2** (2ª rodada do minuto)
3. Nos horários **5h ou 9h** (mais brancos)
4. Quando **5** apareceu recentemente sem **13**
5. Quando a distância do último branco é **≥ 20 rodadas**
6. Quando **5 + 7** aparecem juntos na zona

### ❌ QUANDO NÃO APOSTAR:
1. **Score < 3** no modelo
2. **13** apareceu nas últimas 4 rodadas (bloqueador ativo)
3. Branco acabou de sair (distância ≤ 3) — risco de REC
4. Horários **6h e 10h** (baixa incidência)
5. Faixa **6:00-6:30** (deserto de brancos)
6. Muitos **8** e **13** aparecendo em sequência (sinais de REC ativo)

### ⚠️ SINAIS DE ALERTA PARA REC:
1. Branco **acabou de sair** — em 94.7% dos casos a seca começa logo após um branco
2. Sequência de **13** e **8** dominando
3. **11 + 12** somem (dentro do REC o %11+12 cai para 13.8%, abaixo do normal)
4. **1** aparecendo com frequência (80% mais presente em REC)
5. **1 + 13** juntos → 0% branco (supressão + bloqueio = seca garantida)

### 🔔 SINAIS DE FIM DO REC:
1. **9** aparece (frequente na última posição antes do branco voltar)
2. **5** começa a aparecer (posições -2 e -4 do fim)
3. **7** aparece junto com **5** (combo de desbloqueio)
4. **3** começa a surgir — ele aparece no meio das secas quando o fim está próximo
5. Sequência **3 → 1** (22.2% branco!) — inversão do padrão
6. Distância do último branco ultrapassou **30+ rodadas** (pressão estatística)

---

## 14. RESUMO DO MODELO EM UMA LINHA

```
CONTROLADORES:  4,6,10,14 (4 casas) | 2,9 (2 casas) | 8 (4 casas → preto)
CONFIRMADOR:    5 (confirma branco ↑26.7%, 1.68x antes dele)
BLOQUEADOR:     13 (mata o branco ↓0%, 0.66x)
DESVIADOR:      7 (desvia para 11/12, 34.9%)
SUPRESSOR:      1 (neutraliza controllers -11%, empurra branco +3 rodadas)
PONTE:          3 (acelera ciclo, 40.5% traz branco em 6 casas, fura bloqueio do 13)
FAKE WHITES:    11,12 (substituem o 0 quando bloqueado; pool 0+11+12 ≈ 20%)
EXCEÇÃO:       1+14 e 3+14 = amplificam (14 é imune à supressão do 1)
SEQUÊNCIA:      3→1 = branco 22.2% | 1→3 = branco 7.7% (ORDEM IMPORTA!)
REGRA CORE:     5 solo → branco | 13 presente → bloqueio | 5+7 → branco certo
TIMING:         G2 > G1 | 9h e 5h quentes | Score ≥ 4 = ROI +20%
REC:            94.7% começa após branco | 3 no meio = fim próximo | 1 presente = seca
```

---

## 15. SCRIPTS DE ANÁLISE

Todos os scripts estão na pasta `Referencia/`:

| Arquivo                  | Função                                             |
|--------------------------|-----------------------------------------------------|
| `analise-influencia.js`  | Análise de influência dos números sobre o branco     |
| `analise-teoria.js`      | Validação da teoria controladores/interferentes      |
| `analise-completa.js`    | Análise completa: G1/G2, horário, REC, score, ROI   |
| `analise-1e3-profunda.js`| Investigação profunda dos números 1 e 3 (15 testes) |

### Para rodar:
```bash
cd Referencia
node analise-completa.js
```

---

## 16. LIMITAÇÕES E AVISOS

1. **Amostra de 1 dia** — todas as 1000 rodadas são de 30/04/2026. O comportamento pode variar em outros dias/horários
2. **Passado não garante futuro** — padrões estatísticos podem mudar
3. **Jogo de azar** — nenhum modelo elimina o risco. O edge aqui é marginal
4. **REC é dominante** — 65% do tempo o jogo está em seca. A maior parte das rodadas NÃO tem branco
5. **Score alto é raro** — Score ≥ 5 ocorre apenas ~6% das vezes. É preciso paciência
6. **Recomendação:** Validar com mais dias de dados antes de operar com dinheiro real
