import { AvailabilityCollector, type CollectedStatus } from '@monitor-sefaz/core';
import {
  fromEnvironment,
  type ServiceStatusDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';
import { Environment } from '@monitor-sefaz/catalog';
import { WorkerAvailabilityProvider } from './WorkerAvailabilityProvider.js';

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
    error: null,
    checkedAt,
  };
}

function buildSummary(services: ServiceStatusDTO[], generatedAt: string): SummaryDTO {
  const total = services.length;
  const operational = services.filter((s) => s.state === 'OPERATIONAL').length;
  const group = (keyOf: (s: ServiceStatusDTO) => string): SummaryDTO['byDocument'] => {
    const map = new Map<string, { total: number; operational: number }>();
    for (const s of services) {
      const b = map.get(keyOf(s)) ?? { total: 0, operational: 0 };
      b.total += 1;
      if (s.state === 'OPERATIONAL') b.operational += 1;
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
  const latencies = services.filter((s) => s.state === 'OPERATIONAL').map((s) => s.latencyMs);
  return {
    environment: 'production',
    generatedAt,
    total,
    operational,
    failing: total - operational,
    availability: total === 0 ? 0 : Number(((operational / total) * 100).toFixed(1)),
    avgLatencyMs: latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null,
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
    const collector = new AvailabilityCollector(new WorkerAvailabilityProvider());

    try {
      const generatedAt = new Date().toISOString();
      const services = (await collector.collect()).map((s) => toDTO(s, generatedAt));

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
