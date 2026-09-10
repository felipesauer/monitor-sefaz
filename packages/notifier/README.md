# @monitor-sefaz/notifier

Detecção de transições de estado e entrega de notificações para o
[Monitor SEFAZ](https://github.com/felipesauer/monitor-sefaz) — Discord, Slack,
Telegram ou webhook genérico.

Compara dois snapshots, deriva os eventos e envia. Todo I/O passa por um
`fetch` injetável, então dá para testar sem rede e rodar em qualquer runtime.

## Instalação

    npm i @monitor-sefaz/notifier

## Eventos

| Evento                                       | Quando dispara                            |
| -------------------------------------------- | ----------------------------------------- |
| `SERVICE_DOWN` / `SERVICE_RECOVERED`         | Um serviço saiu / voltou ao ar            |
| `CONTINGENCY_ENTERED` / `CONTINGENCY_EXITED` | Entrou / saiu de contingência (SVC)       |
| `TECHNICAL_NOTE`                             | Nova Nota Técnica publicada               |
| `SOURCE_DEGRADED`                            | Uma fonte oficial ficou degradada (drift) |
| `DAILY_DIGEST`                               | Resumo diário de saúde                    |

Contingência é tratada à parte de queda de propósito: em SVC o serviço continua
emitindo, então entrar em contingência **não** é um `SERVICE_DOWN`.

## Uso

```ts
import { detectTransitions, Notifier, parseNotifierConfig } from '@monitor-sefaz/notifier';

// 1. O que mudou entre a coleta anterior e a atual? O instante é explícito
//    para o evento carregar a hora da COLETA, não a do envio.
const events = detectTransitions(anterior, atual, new Date().toISOString());

// 2. Os canais vêm do ambiente. Sem variáveis definidas, o notifier é no-op:
//    nenhuma chamada de rede, nenhum erro — o pipeline segue idêntico.
const notifier = new Notifier(parseNotifierConfig(process.env));
await notifier.notify(events);
```

Variáveis reconhecidas: `NOTIFY_DISCORD_WEBHOOK_URL`, `NOTIFY_SLACK_WEBHOOK_URL`,
`NOTIFY_TELEGRAM_BOT_TOKEN` + `NOTIFY_TELEGRAM_CHAT_ID`, `NOTIFY_WEBHOOK_URL`,
`NOTIFY_EVENTS` (filtro) e `NOTIFY_DIGEST_HOUR`.

Os formatadores são funções puras (evento → payload) e ficam exportados, caso
você queira montar a entrega por conta própria:

```ts
import { toDiscordPayload, toSlackPayload, toTelegramPayload } from '@monitor-sefaz/notifier';
```

## Licença

[MIT](LICENSE) © Felipe Sauer
