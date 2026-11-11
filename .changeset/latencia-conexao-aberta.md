---
'@monitor-sefaz/core': minor
---

A latência das fontes passa a ser medida com a conexão já aberta, e reflete o tempo de resposta da página, não o de abrir a conexão até ela. Antes, o cliente HTTP dos portais (`axios-cookiejar-support`) criava um agente novo a cada requisição, e cada busca pagava DNS, TCP e TLS de novo. Num runner fora do Brasil isso dava ~2,5 s para a página da Receita, que responde em ~0,1 s com a conexão aberta.

- Novo `createPortalClient` (interno): cookie jar com `http-cookie-agent` e `keepAlive`, usado pela disponibilidade, pelo SVRS e pelas Notas Técnicas. A dependência `axios-cookiejar-support` sai do `core`.
- `AvailabilityProviderLike.warmUp?(document)` e `IntegraNotasFetcher.warmUp?(url)`, opcionais: abrem a conexão com um `HEAD` antes da busca cronometrada. `HttpAvailabilityProvider` e `createHttpIntegraNotasFetcher` já os implementam; providers próprios sem eles continuam funcionando, com a medida incluindo a conexão.
- Quem guarda histórico de `latencyMs` vai ver os valores caírem a partir desta versão: é a mudança de medida, não uma melhora da fonte.
