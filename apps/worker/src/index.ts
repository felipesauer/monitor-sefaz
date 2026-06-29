import {
  AvailabilityCollector,
  HybridCollector,
  IntegraNotasCollector,
  type CollectedStatus,
  type IntegraNotasFetcher,
} from '@monitor-sefaz/core';
import {
  averageLatency,
  fromEnvironment,
  isUp,
  type ServiceStatusDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';
import { Catalog, Environment } from '@monitor-sefaz/catalog';
import { WorkerAvailabilityProvider } from './WorkerAvailabilityProvider.js';

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

/** Híbrido do Worker: IntegraNotas (JSON) com fallback ao scraping oficial. */
function buildCollector(): HybridCollector {
  return new HybridCollector(
    IntegraNotasCollector.create(integraNotasFetcher),
    new AvailabilityCollector(new WorkerAvailabilityProvider())
  );
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Cache curto na borda para não martelar a SEFAZ a cada request. */
const CACHE_TTL_SECONDS = 60;

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

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      ...CORS,
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const { pathname } = new URL(request.url);
    const collector = buildCollector();

    try {
      const generatedAt = new Date().toISOString();
      const collected = await collector.collect();

      // Mesma guarda de piso do collector: coleta parcial não vira disponibilidade
      // inflada servida como completa — respondemos 502 (mesmo predicado e ratio).
      if (!new Catalog().meetsCoverageFloor(collected.length, Environment.Production)) {
        return new Response(
          JSON.stringify({ error: 'coleta abaixo do piso de cobertura' }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }

      const services = collected.map((s) => toDTO(s, generatedAt));

      if (pathname.endsWith('/summary')) {
        return json(buildSummary(services, generatedAt));
      }
      if (pathname.endsWith('/health')) {
        return json({ status: 'ok' });
      }
      const snapshot: StatusSnapshotDTO = { environment: 'production', generatedAt, services };
      return json(snapshot);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'erro' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }
  },
};
