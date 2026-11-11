---
'@monitor-sefaz/contracts': minor
---

O histórico ganha a janela de 6h: `historyPeriodSchema` aceita `'6h'` (além de `'24h'` e `'72h'`) e `PERIOD_MS['6h']` vale 6 horas. Quem tiver um `Record<HistoryPeriod, …>` exaustivo precisa acrescentar a chave `'6h'`.
