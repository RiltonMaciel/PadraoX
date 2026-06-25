# Padrão Cadeia — Refinamento e Curadoria

**Data:** 01/06/2026  
**Curadoria com:** `blaze-double-2000-2026-06-01T17-40-10.xlsx`  
**Período dos dados:** 21:57 às 14:39  
**Total:** 2000 rodadas | 136 brancos | 119 previsões possíveis

---

## ALGORITMO REFINADO

### Passo 1 — Ponto de partida (Padrão X)
```
Branco na posição i
N1 = número na posição i-2
N2 = número na posição i-3
Alvo = i + MAX(N1, N2)
```

### Passo 2 — Cadeia de saltos
```
Se posição alvo NÃO tem branco:
  1. Pegar o NÚMERO que está na posição alvo
  2. Pular essa quantidade de casas
  3. Repetir até chegar no branco
```

### Regra do ±1
```
Quando a cadeia aponta posição X:
  - 59% → branco está em X (exato)
  - 41% → branco está em X-1 (1 antes)
  - 0%  → branco NUNCA está em X+1 (nunca atrasa)
```

---

## RESULTADOS DA CURADORIA (2000 rodadas novas)

### Panorama geral:
| Cenário | Quantidade | % |
|---------|-----------|---|
| MAX acerta direto (sem cadeia) | 4 | 3.4% |
| MAX passa do branco (alvo além) | 53 | 44.5% |
| Cadeia necessária | 62 | 52.1% |

### Acerto da cadeia por margem:
| Margem | Acertos | % |
|--------|---------|---|
| Exato (erro = 0) | 10 | 16.1% |
| ±1 casa | 17 | 27.4% |
| ±2 casas | 24 | 38.7% |
| ±3 casas | 27 | 43.5% |

### Distribuição de saltos:
| Saltos | Frequência | % |
|--------|-----------|---|
| 1 | 27 | 43.5% |
| 2 | 14 | 22.6% |
| 3 | 7 | 11.3% |
| 4 | 6 | 9.7% |
| 5+ | 8 | 12.9% |

---

## POR QUE A CADEIA FALHA

### Fato absoluto:
- A cadeia **NUNCA** para antes do branco
- Quando erra, **SEMPRE** passa do branco (100% dos erros são overshooting)

### Causa principal: último número grande
```
Média do último número quando ACERTA: ~5
Média do último número quando ERRA: 9.6
```

### Exemplos de falha:
```
00:40 → cadeia cai em pos com num=10, dist real=1 → pula 10, passou 9 casas
01:46 → cadeia cai em pos com num=11, dist real=1 → pula 11, passou 10 casas
03:15 → cadeia cai em pos com num=6, dist real=1 → pula 6, passou 5 casas
```

**Padrão:** Muitas falhas acontecem quando a cadeia está a 1-4 casas do branco, mas o número ali é grande (6-14) e causa overshoot massivo.

---

## EXEMPLOS QUE ACERTARAM

### EX1 — 22:22 → 22:35 (EXATO)
```
N1=8 N2=4 MAX=8
Cadeia: 6 → 11
Chegou exato no branco ✅
```

### EX2 — 00:25 → 00:32 (EXATO)
```
N1=10 N2=7 MAX=10
Cadeia: 3 → 2
Chegou exato no branco ✅
```

### EX3 — 02:41 → 02:48 (EXATO)
```
N1=11 N2=12 MAX=12
Cadeia: 3
1 salto, exato ✅
```

### EX4 — 03:01 → 03:05 (EXATO)
```
N1=8 N2=2 MAX=8
Cadeia: 1
1 salto, exato ✅
```

### EX5 — 04:15 → 04:33 (+1)
```
N1=4 N2=6 MAX=6
Cadeia: 7 → 3 → 9 → 4 → 9
Chegou 1 casa depois do branco
```

---

## OBSERVAÇÕES IMPORTANTES

### 1. A cadeia é unidirecional
Nunca para antes — sempre chega exato ou passa. Isso significa que na prática, quando a cadeia aponta X, o branco está entre **X-1 e X** (nunca depois de X).

### 2. O problema é o overshoot
Quando o último número é grande (>7), a chance de pular demais é altíssima. Possível solução: se o número for > certo limiar, não pular.

### 3. Números que mais causam overshoot:
```
14, 13, 12, 11, 10, 9, 8 → responsáveis por quase todos os erros
```

### 4. Quando a cadeia tem números PEQUENOS, acerta mais:
```
Cadeias que acertaram: 3→2, 1, 3, 1→2→10→2, 6→11, 8→9
Cadeias que erraram: 11, 10, 11→13→2→3→5→7→14→5→14
```

---

## TAXA REAL vs EXPECTATIVA

⚠️ **IMPORTANTE:** O teste anterior (últimas 4h do arquivo 13:36) mostrou 87% de acerto, mas era uma amostra de apenas 8 casos. A curadoria com 2000 rodadas novas mostra:

- **27.4%** com margem ±1
- **43.5%** com margem ±3
- **16.1%** exato

Isso é a taxa REAL do padrão. Ainda útil (melhor que aleatório que seria ~7%), mas não os 87% que a amostra pequena sugeria.

---

## HIPÓTESES PARA MELHORAR

- [ ] Limitar cadeia: parar se próximo número > 7-8?
- [ ] Quando distância até posição alvo é pequena (1-4), não seguir cadeia?
- [ ] Usar apenas cadeias com 1-2 saltos (acertar menos vezes, mas com mais precisão)?
- [ ] Combinar com os sinais (bloqueadores/favoráveis) para filtrar previsões ruins?
- [ ] Testar MIN ao invés de MAX no passo 1?
- [ ] Considerar que se primeiro numero da cadeia > 10, ignorar e esperar?

---

## CONCLUSÃO

O Padrão Cadeia funciona como **refinamento** do Padrão X, mas com limitações claras:
- Bom para previsões de "zona" (±3 casas)
- Perigoso para previsão exata quando números são altos
- O branco SEMPRE está EM ou ANTES da posição que a cadeia aponta (nunca depois)
- Precisa de filtros para evitar overshooting
