# Novas Teorias — Previsão do Branco

## Dados do problema
- Blaze Double: números de 1 a 14 + branco (0)
- Queremos prever QUANDO o próximo branco vai sair
- Temos ~1000 rodadas de histórico disponíveis
- Cada rodada dura ~30 segundos

---

## Ideias para explorar

### 1. Frequência pura (estatística)
- Qual a frequência real do branco? (ex: a cada X rodadas em média)
- Distribuição: é uniforme ou tem clusters?
- Quanto mais tempo sem branco, maior a probabilidade?

### 2. Padrões antes do branco
- Quais números aparecem com mais frequência 1, 2, 3 posições antes do branco?
- Existe alguma sequência de cores (vermelho/preto) que antecede o branco?
- Repetições (ex: mesmo número 2x seguidas) precedem branco?

### 3. Ritmo / Ciclo
- O branco tem um "ritmo"? (ex: aparece a cada 8-15 rodadas geralmente)
- Existem horários do dia em que o branco sai mais?
- O intervalo entre brancos segue algum padrão? (crescente, decrescente, alternado)

### 4. Sequências numéricas
- Soma dos últimos N números tem correlação com branco?
- Média móvel dos últimos 5/10 números indica algo?
- Números altos consecutivos (>10) precedem branco?

### 5. Padrão de cores
- Sequência de vermelho/preto antes do branco tem padrão?
- Proporção V/P nos últimos 10 resultados indica branco?

### 6. Análise de "gaps"
- Tempo desde o último branco como indicador
- Se passou da média + 1 desvio padrão → probabilidade alta?

---

## Como validar
- Pegar os dados históricos reais
- Para cada teoria, simular retroativamente
- Medir: taxa de acerto, erro médio (quantas rodadas errou)
- Comparar qual teoria tem melhor desempenho

---

## Anotações / Discussão

(escreva aqui suas observações)

