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

O histórico de 72h do monitor não é um ponto por checagem: o estado é guardado
como _run-length_ (segmento novo só quando muda) e a latência é agregada por
hora. Isso mantém 72h de 189 serviços em ~230 KB em vez de megabytes, sem perder
o instante exato de cada queda.

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

Para acumular rodadas, `CompactHistoryStore` lê, acrescenta, poda a janela de 72h
e grava o blob numa chave só (`COMPACT_HISTORY_KEY`), sobre qualquer armazenamento
chave → texto. No monitor, quem grava é a coleta do GitHub Actions, pela API REST
do Workers KV, e quem lê é o Cloudflare Worker, pelo binding.

```ts
import { CompactHistoryStore, type TextStore } from '@monitor-sefaz/contracts';

const memoria = new Map<string, string>();
const store: TextStore = {
  get: async (key) => memoria.get(key) ?? null,
  put: async (key, value) => void memoria.set(key, value),
};

const history = new CompactHistoryStore(store);
await history.append(
  [{ id: 'NFe:SP', state: 'OPERATIONAL', cStat: 107, latencyMs: 240 }],
  Date.now()
);
```

## Licença

[MIT](LICENSE) © Felipe Sauer
