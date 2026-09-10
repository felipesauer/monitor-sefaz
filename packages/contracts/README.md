# @monitor-sefaz/contracts

Schemas [Zod](https://zod.dev) e DTOs compartilhados do
[Monitor SEFAZ](https://github.com/felipesauer/monitor-sefaz): status de
serviço, resumo agregado, histórico, incidentes e eventos de notificação.

É o contrato entre o coletor, a API, o Cloudflare Worker e o dashboard — quem
consome a API pública do monitor pode validar as respostas com os mesmos
schemas que o servidor usa para produzi-las.

## Instalação

    npm i @monitor-sefaz/contracts

## Uso

```ts
import { statusSnapshotSchema, summarySchema, isUp } from '@monitor-sefaz/contracts';

const snapshot = statusSnapshotSchema.parse(await res.json());

// "No ar" inclui contingência: a SEFAZ responde e ainda dá para emitir.
const noAr = snapshot.services.filter((s) => isUp(s.state));
```

Estados possíveis: `OPERATIONAL`, `CONTINGENCY`, `SLOWDOWN`, `DOWN`, `ERROR`.

### Validação resiliente

Para um painel, uma resposta parcialmente inválida é melhor que uma tela de
erro. O schema resiliente descarta os itens ruins e mantém o resto:

```ts
import { resilientStatusSnapshotSchema } from '@monitor-sefaz/contracts';

const snapshot = resilientStatusSnapshotSchema.parse(data); // serviços inválidos são omitidos
```

### Histórico compacto

O histórico acumulado pelo Worker não é um ponto por checagem: o estado é
guardado como _run-length_ (segmento novo só quando muda) e a latência é
agregada por hora. Isso mantém 72h de 135 serviços em ~230 KB em vez de
megabytes, sem perder o instante exato de cada queda.

```ts
import {
  compactHistorySchema,
  expandCompactHistory,
  LATENCY_BUCKET_MS,
} from '@monitor-sefaz/contracts';

const history = compactHistorySchema.parse(await res.json());

// Expande de volta para pontos, na resolução que você precisa.
const detalhe = expandCompactHistory(history, 'NFe:SP');
const grosso = expandCompactHistory(history, 'NFe:SP', { stepMs: LATENCY_BUCKET_MS });
```

Como a grade de saída é regular, "operacionais / total de pontos" já é a fração
de **tempo** no ar — o uptime sai correto por construção.

## Licença

[MIT](LICENSE) © Felipe Sauer
