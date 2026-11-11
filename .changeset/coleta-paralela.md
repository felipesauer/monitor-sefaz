---
'@monitor-sefaz/core': patch
---

`SvrsCollector`, `AvailabilityCollector` e `IntegraNotasCollector` buscam as páginas dos documentos em paralelo, e não mais uma depois da outra. Com um portal fora do ar, cada página gasta as tentativas com timeout antes de desistir, e em série isso somava minutos por coleta (cerca de 6 minutos com o SVRS fora). O resultado continua na ordem dos documentos e uma página que falha continua não derrubando as outras.
