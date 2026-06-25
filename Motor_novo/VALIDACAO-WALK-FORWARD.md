# VALIDAÇÃO WALK-FORWARD — MOTOR ADAPTATIVO

**Dataset:** 20000 rodadas | **Janela:** 500 | **Recalibração:** cada 50
**Período simulado:** rodadas 500 a 19999 (19500 rodadas avaliadas)

---

## RESULTADO GERAL

| Métrica | Valor |
|---------|-------|
| Rodadas avaliadas | 19500 |
| Decisões APOSTAR | 555 (2.8% das rodadas) |
| Acertos (branco) | 36 |
| Taxa de acerto | **6.49%** |
| Taxa base (aleatório) | 6.65% |
| Break-even (1/14) | 7.14% |
| ROI | **-9.2%** |
| Lucro em unidades | -51 |
| Banca inicial | 100 |
| Banca final | **49** |
| Decisões AGUARDAR | 3090 |
| Decisões NÃO APOSTAR | 31 |
| Decisões NEUTRO | 15824 |

**Z-score do motor vs aleatório:** -0.15 (❌ não significativo)

### Gestão de Risco

| Métrica | Valor |
|---------|-------|
| Drawdown máximo | 116 unidades |
| Banca mínima | -16 |
| Banca máxima | 105 |
| Maior sequência de perdas | 74 |

---

## EVOLUÇÃO POR BLOCO DE 2.000 RODADAS

| Bloco | Apostas | Acertos | Taxa | ROI | Lucro |
|-------|---------|---------|------|-----|-------|
| 1 (rod 500-2499) | 69 | 0 | 0.0% | -100.0% | -69 |
| 2 (rod 2500-4499) | 44 | 4 | 9.1% | 27.3% | +12 |
| 3 (rod 4500-6499) | 110 | 6 | 5.5% | -23.6% | -26 |
| 4 (rod 6500-8499) | 73 | 9 | 12.3% | 72.6% | +53 |
| 5 (rod 8500-10499) | 50 | 1 | 2.0% | -72.0% | -36 |
| 6 (rod 10500-12499) | 22 | 1 | 4.5% | -36.4% | -8 |
| 7 (rod 12500-14499) | 75 | 4 | 5.3% | -25.3% | -19 |
| 8 (rod 14500-16499) | 56 | 10 | 17.9% | 150.0% | +84 |
| 9 (rod 16500-18499) | 37 | 1 | 2.7% | -62.2% | -23 |
| 10 (rod 18500-19999) | 19 | 0 | 0.0% | -100.0% | -19 |

---

## COMPARAÇÃO: ADAPTATIVO vs V4 ESTÁTICO

| Métrica | Motor Adaptativo | V4 Estático |
|---------|-----------------|-------------|
| Apostas | 555 | 2534 |
| Acertos | 36 | 77 |
| Taxa | **6.49%** | 3.04% |
| ROI | **-9.2%** | -57.5% |
| Lucro total | -51u | -1456u |
| Banca final | **49** | -1356 |

---

## VEREDICTO

❌ **Não lucrativo** com as configurações atuais. Taxa 6.49% abaixo do break-even 7.14%.

🏆 **Motor adaptativo supera o V4 estático** (-9.2% vs -57.5%).

---
*Simulação walk-forward em 2026-05-15T12:00:45.882Z*