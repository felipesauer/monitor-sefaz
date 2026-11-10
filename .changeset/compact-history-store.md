---
'@monitor-sefaz/contracts': minor
---

Exporta o `CompactHistoryStore`, que lê e grava o histórico compacto sobre qualquer armazenamento chave → texto (a interface `TextStore`, com `get` e `put`), e as constantes `COMPACT_HISTORY_KEY`, `COMPACT_HISTORY_STEP_MS` (5 min) e `COMPACT_HISTORY_RETENTION_MS` (72 h). Antes isso vivia só dentro do Cloudflare Worker do monitor. Agora o Worker o lê pelo binding do KV, e a coleta do GitHub Actions o grava pela API REST do Cloudflare, com a mesma chave e a mesma regra de poda. Nada do que já existia muda.
