import {
  AvailabilityCollector,
  ConsensusCollector,
  IntegraNotasCollector,
  SvrsCollector,
  SvrsProvider,
  type CollectedStatus,
  type IntegraNotasFetcher,
  type SvrsFetcher,
} from '@monitor-sefaz/core';
import {
  averageLatency,
  expandCompactHistory,
  fromEnvironment,
  historyPeriodSchema,
  isUp,
  PERIOD_MS,
  type HistoryObservation,
  type HistoryResponseDTO,
  type ServiceStatusDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';
import { Catalog, Environment } from '@monitor-sefaz/catalog';
import { WorkerAvailabilityProvider } from './WorkerAvailabilityProvider.js';
import { HistoryStore, STEP_MS } from './HistoryStore.js';

/** Bindings declarados no wrangler.toml. */
export interface Env {
  /** KV do histórico. Ausente em dev sem `--kv` → o Worker segue stateless. */
  HISTORY?: KVNamespace;
}

/** Fetcher do IntegraNotas no runtime do Worker (fetch nativo + header XHR). */
const integraNotasFetcher: IntegraNotasFetcher = async (url) => {
  const res = await fetch(url, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`IntegraNotas HTTP ${res.status}`);
  }
  return res.text();
};

/** Fetcher do SVRS no runtime do Worker (fetch nativo, página latin-1). */
const svrsFetcher: SvrsFetcher = async (url) => {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  if (!res.ok) {
    throw new Error(`SVRS HTTP ${res.status}`);
  }
  // A página é latin-1; o Worker não tem Buffer, decodificamos via TextDecoder.
  return new TextDecoder('latin1').decode(await res.arrayBuffer());
};

/**
 * Consenso do Worker (precedência oficial): SVRS e página oficial decidem o
 * estado; o IntegraNotas (mais completo) preenche o resto. Se o SVRS falhar no
 * runtime do Worker, o consenso (`allSettled`) o ignora sem derrubar a coleta.
 */
function buildCollector(): ConsensusCollector {
  return new ConsensusCollector([
    {
      name: 'svrs',
      official: true,
      collector: new SvrsCollector(new SvrsProvider(svrsFetcher)),
    },
    {
      name: 'availability',
      official: true,
      collector: new AvailabilityCollector(new WorkerAvailabilityProvider()),
    },
    {
      name: 'integranotas',
      official: false,
      collector: IntegraNotasCollector.create(integraNotasFetcher),
    },
  ]);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Cache curto na borda para não martelar a SEFAZ a cada request. */
const CACHE_TTL_SECONDS = 60;

/**
 * Cache do histórico. Ele só muda quando o cron roda (5 em 5 min), então
 * segurá-lo por 1 minuto na borda evita leituras repetidas do KV sem nunca
 * servir algo mais velho que a própria cadência de coleta.
 */
const HISTORY_CACHE_TTL_SECONDS = 60;

function toDTO(s: CollectedStatus, checkedAt: string): ServiceStatusDTO {
  return {
    id: `${s.document}:${s.uf}`,
    document: s.document,
    uf: s.uf,
    authorizer: s.authorizer,
    environment: fromEnvironment(Environment.Production),
    state: s.state,
    cStat: s.cStat,
    xMotivo: null,
    latencyMs: s.latencyMs,
    source: s.source,
    sourceCheckedAt: s.sourceCheckedAt,
    error: null,
    checkedAt,
  };
}

function buildSummary(services: ServiceStatusDTO[], generatedAt: string): SummaryDTO {
  const total = services.length;
  const operational = services.filter((s) => isUp(s.state)).length;
  const group = (keyOf: (s: ServiceStatusDTO) => string): SummaryDTO['byDocument'] => {
    const map = new Map<string, { total: number; operational: number }>();
    for (const s of services) {
      const b = map.get(keyOf(s)) ?? { total: 0, operational: 0 };
      b.total += 1;
      if (isUp(s.state)) b.operational += 1;
      map.set(keyOf(s), b);
    }
    return [...map.entries()]
      .map(([key, b]) => ({
        key,
        total: b.total,
        operational: b.operational,
        availability: b.total === 0 ? 0 : Number(((b.operational / b.total) * 100).toFixed(1)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };
  const latencies = services.filter((s) => isUp(s.state)).map((s) => s.latencyMs);
  return {
    environment: 'production',
    generatedAt,
    total,
    operational,
    failing: total - operational,
    availability: total === 0 ? 0 : Number(((operational / total) * 100).toFixed(1)),
    avgLatencyMs: averageLatency(latencies),
    byDocument: group((s) => s.document),
    byAuthorizer: group((s) => s.authorizer),
  };
}

function json(body: unknown, maxAge = CACHE_TTL_SECONDS): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}`,
      ...CORS,
    },
  });
}

function error(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/** Coleta uma rodada completa, aplicando o piso de cobertura. */
async function collectServices(): Promise<{ generatedAt: string; services: ServiceStatusDTO[] }> {
  const generatedAt = new Date().toISOString();
  const collected = await buildCollector().collect();

  // Mesma guarda de piso do collector: coleta parcial não vira disponibilidade
  // inflada servida como completa.
  if (!new Catalog().meetsCoverageFloor(collected.length, Environment.Production)) {
    throw new Error('coleta abaixo do piso de cobertura');
  }
  return { generatedAt, services: collected.map((s) => toDTO(s, generatedAt)) };
}

/** Rotas de histórico, servidas do KV (nunca disparam coleta). */
async function handleHistory(pathname: string, url: URL, env: Env): Promise<Response | null> {
  if (!pathname.includes('/history')) return null;
  if (!env.HISTORY) {
    return error('histórico indisponível: binding HISTORY não configurado', 501);
  }
  const store = new HistoryStore(env.HISTORY);
  const history = await store.read(Date.now());

  // /services/:id/history?period=24h — série de um serviço, resolução da coleta.
  const single = /\/services\/([^/]+)\/history$/.exec(pathname);
  if (single) {
    const period = historyPeriodSchema.catch('24h').parse(url.searchParams.get('period'));
    const id = decodeURIComponent(single[1]!);
    const toMs = Date.parse(history.updatedAt);
    const points = expandCompactHistory(history, id, {
      fromMs: toMs - PERIOD_MS[period],
      toMs,
    });
    const body: HistoryResponseDTO = { id, period, points };
    return json(body, HISTORY_CACHE_TTL_SECONDS);
  }

  // /history — o blob compacto inteiro; a SPA expande o que precisar.
  return json(history, HISTORY_CACHE_TTL_SECONDS);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // Antes de qualquer coleta: um health check que depende da SEFAZ responder
    // não é health check. Estas rotas são baratas e sempre respondem.
    if (pathname.endsWith('/health')) {
      return json({ status: 'ok' });
    }

    try {
      const fromHistory = await handleHistory(pathname, url, env);
      if (fromHistory) return fromHistory;

      const { generatedAt, services } = await collectServices();

      if (pathname.endsWith('/summary')) {
        return json(buildSummary(services, generatedAt));
      }
      const snapshot: StatusSnapshotDTO = { environment: 'production', generatedAt, services };
      return json(snapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'erro';
      return error(message, 502);
    }
  },

  /**
   * Cron Trigger: coleta e acumula o histórico no KV.
   *
   * A promise é aguardada AQUI, e não passada para `ctx.waitUntil`: no handler
   * `scheduled` o runtime só garante vida ao Worker enquanto a promise
   * RETORNADA pelo handler não resolve. Com waitUntil, o handler retornava na
   * hora e a escrita no KV podia nunca acontecer.
   *
   * É isto que dá memória ao Worker. Antes, o histórico vinha só do GitHub
   * Actions, cujo cron é best-effort e na prática entregava ~6 coletas/dia —
   * uma barra de uptime de 24h desenhada com 7 amostras, onde uma queda de
   * poucas horas podia passar inteira entre duas coletas. Na cadência de 5
   * minutos são 288 pontos/dia, e a resolução passa a ser a do incidente.
   */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    if (!env.HISTORY) {
      console.warn('Cron disparado sem o binding HISTORY; nada a acumular.');
      return;
    }
    const store = new HistoryStore(env.HISTORY);
    try {
      const started = Date.now();
      const { services } = await collectServices();
      const observations: HistoryObservation[] = services.map((s) => ({
        id: s.id,
        state: s.state,
        cStat: s.cStat,
        latencyMs: s.latencyMs,
      }));
      const history = await store.append(observations, Date.now());
      console.log(
        `Coleta agendada: ${observations.length} serviços em ${Date.now() - started}ms; ` +
          `${Object.keys(history.segments).length} séries em KV.`
      );
    } catch (err) {
      // Uma coleta que falha é um buraco na série, não um incidente: a
      // próxima rodada acontece em STEP_MS. Logamos e seguimos.
      console.error(`Coleta agendada falhou (retomando em ${STEP_MS / 60000} min):`, err);
    }
  },
};
