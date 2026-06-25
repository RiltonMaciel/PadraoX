# Descobertas — Padrões de Previsão do Branco (Double Blaze)

Data: 01/06/2026  
Base de dados: 2000 rodadas (17:53 às 10:35)  
Total de brancos: 138

---

## PADRÃO X (Original)

### Regra:
1. Localizar o último branco (0) na posição `i`
2. N1 = número na posição `i - 2` (2º antes do branco)
3. N2 = número na posição `i - 3` (3º antes do branco)
4. **Próximo branco previsto = posição `i + MAX(N1, N2)`**

### Exemplo:
```
Posições:  93   94   95   96
Números:   12   14    5    0  ← branco
            ↑    ↑
           N2   N1

MAX(14, 12) = 14 rodadas
Próximo branco previsto: pos 96 + 14 = pos 110
```

### Taxa de acerto direto:
- ~30% das vezes o branco cai EXATAMENTE na posição prevista
- Quando erra, a distância média é de 5-15 rodadas

### Observações:
- Ignora o número imediatamente antes do branco (posição i-1)
- Usa apenas os 2º e 3º números antes
- A lógica é: o MAIOR dos dois vizinhos "mede" a distância

---

## PADRÃO CADEIA (Empurradores)

### Regra:
Quando o Padrão X **erra** (posição prevista não tem branco):
1. Olhar o número N na posição alvo
2. Avançar N posições
3. Repetir até encontrar o branco

### Exemplo completo (18:41 → 18:52):
```
Branco em 18:41 (pos 96)
MAX(14, 12) = 14 → Alvo: pos 110 (18:48)

Pos 110: número = 1  → pula 1  → pos 111 (18:49)
Pos 111: número = 4  → pula 4  → pos 115 (18:51)
Pos 115: número = 2  → pula 2  → pos 117 (18:52)
Pos 117: número = 1  → pula 1  → pos 118 (18:52)

Pos 118 = BRANCO! ✅ Erro: 0
```

### Como funciona:
- O número na posição "empurra" a previsão para frente
- Cada número age como um "trampolim" — pula seu próprio valor
- Números pequenos (1, 2, 3) = saltos curtos, mais preciso
- Números grandes (11, 13, 14) = saltos longos, risco de passar do ponto

---

## ESTATÍSTICAS DA CADEIA

### Taxa de acerto (margem ±3 rodadas):
- **47.6% dos erros do Padrão X** são corrigidos pela cadeia
- Nas últimas 4h: **87.5% de acerto** (7/8 casos)

### Acerto por quantidade de saltos:
| Saltos na cadeia | Taxa de acerto |
|-----------------|---------------|
| 1 salto | 37% |
| 2 saltos | 54% |
| 3 saltos | 50% |
| 4 saltos | 71% |
| 5+ saltos | alta (amostra pequena) |

### Quando a cadeia FALHA:
- Números muito grandes (11, 13, 14) fazem a cadeia "pular" além do branco
- Exemplo: pos com número 11 → pula 11 → passou do branco que estava 7 posições à frente

---

## EXEMPLOS REAIS COM HORÁRIOS (últimas 4h)

### ✅ EX1 — 18:41 → 18:52 (EXATO)
```
Vizinhos: 12(18:40) 14(18:40) 5(18:41) [0](18:41)
MAX(14,12) = 14 → Alvo 18:48, num=1
Cadeia: 1→4→2→1 = pos 118
Branco real: pos 118 ✅
```

### ✅ EX2 — 18:52 → 18:57 (EXATO)
```
Vizinhos: 2(18:51) 3(18:51) 1(18:52) [0](18:52)
MAX(3,2) = 3 → Alvo 18:54, num=1
Cadeia: 1→5 = pos 127
Branco real: pos 127 ✅
```

### ✅ EX3 — 18:57 → 19:16 (EXATO)
```
Vizinhos: 5(18:55) 10(18:56) 9(18:56) [0](18:57)
MAX(10,5) = 10 → Alvo 19:02, num=2
Cadeia: 2→5→13→7 = pos 164
Branco real: pos 164 ✅
```

### ❌ EX4 — 19:16 (ERROU, erro 7)
```
Vizinhos: 7(19:14) 3(19:15) 12(19:15) [0](19:16)
MAX(3,7) = 7 → Alvo 19:19, num=11
Cadeia: 11 → pos 182 (PASSOU!)
Branco real: pos 175 (19:21)
Motivo: número 11 deu salto muito grande
```

### ✅ EX5 — 19:27 → 19:44 (erro 3)
```
MAX(6,10) = 10 → Alvo 19:32, num=1
Cadeia: 1→12→13 = pos 223
Branco real: pos 220 (erro 3, aceitável)
```

### ✅ EX8 — 20:05 → 20:14 (EXATO)
```
Vizinhos: 1(20:03) 12(20:04) 2(20:04) [0](20:05)
MAX(12,1) = 12 → Alvo 20:11, num=7
Cadeia: 7 = pos 281
Branco real: pos 281 ✅
```

### ✅ EX10 — 20:25 → 20:38 (erro 1)
```
MAX(13,1) = 13 → Alvo 20:32, num=5
Cadeia: 5→6→3 = pos 330
Branco real: pos 329 (erro 1)
```

### ✅ EX11 — 20:38 → 20:53 (erro 2)
```
MAX(3,8) = 8 → Alvo 20:42, num=8
Cadeia: 8→7→2→6 = pos 360
Branco real: pos 358 (erro 2)
```

---

## DIFERENÇA ENTRE OS DOIS PADRÕES

| | Padrão X | Padrão Cadeia |
|---|---|---|
| Tipo | Cálculo estático | Navegação dinâmica |
| Fórmula | MAX(N1, N2) | Pular N posições iterativamente |
| Quando usar | Sempre (ponto de partida) | Quando Padrão X erra |
| Acerto direto | ~30% | +47% dos erros corrigidos |
| Juntos | ~87% nas últimas 4h | |

---

## IDEIAS PARA EXPLORAR

- [ ] O que acontece se usar MIN ao invés de MAX?
- [ ] E se usar SOMA (N1 + N2)?
- [ ] Existe padrão nos números que fazem a cadeia falhar (11, 13, 14)?
- [ ] Limitar a cadeia: parar se encontrar número > 10?
- [ ] Usar a cadeia ao contrário (voltando das posições)?
- [ ] Os bloqueadores [2,3,11,4,12,9] afetam a cadeia de alguma forma?
- [ ] Quando o número na posição alvo é < 5, a cadeia acerta mais?
- [ ] Combinação: se primeiro salto da cadeia > 10, ignorar e usar outra estratégia?

---

## CONSTANTES JÁ DESCOBERTAS

```
BLOQUEADORES = [2, 3, 11, 4, 12, 9]
FAVORAVEIS = [14, 8, 1]
BLOQUEADORES_EXATOS = [3, 6, 9, 13]
FAVORAVEIS_EXATOS = [14, 2, 8]
PADROES_ALERTA = ['PVP', 'VVV', 'VVP', 'PPP']
PADROES_BOM = ['VBP', 'PBV']
```

---

## PRÓXIMOS PASSOS

1. Implementar a cadeia no algoritmo de previsão do server.js
2. Testar em dados ao vivo (não apenas histórico)
3. Definir regra de parada da cadeia (max saltos? max valor?)
4. Criar sinal de confiança baseado nos números da cadeia
