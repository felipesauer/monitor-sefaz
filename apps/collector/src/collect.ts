import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AvailabilityCollector, HttpAvailabilityProvider } from '@monitor-sefaz/core';
import { Environment } from '@monitor-sefaz/catalog';
import {
  fromEnvironment,
  historyFileSchema,
  type HistoryFileDTO,
  type HistoryPointDTO,
  type ServiceStatusDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';

/** Retenção do histórico estático (ms). Padrão 7 dias. */
const RETENTION_MS = Number(process.env.HISTORY_RETENTION_MS ?? 7 * 24 * 60 * 60 * 1000);

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

function loadHistory(path: string): HistoryFileDTO {
  if (!existsSync(path)) {
    return { updatedAt: new Date(0).toISOString(), series: {} };
  }
  try {
    return historyFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return { updatedAt: new Date(0).toISOString(), series: {} };
  }
}

/** Append do snapshot atual no histórico, podando pontos fora da retenção. */
function appendHistory(
  history: HistoryFileDTO,
  services: ServiceStatusDTO[],
  generatedAt: string
): HistoryFileDTO {
  const cutoff = Date.parse(generatedAt) - RETENTION_MS;
  const series: Record<string, HistoryPointDTO[]> = { ...history.series };

  for (const s of services) {
    const point: HistoryPointDTO = {
      timestamp: generatedAt,
      state: s.state,
      cStat: s.cStat,
      latencyMs: s.latencyMs,
    };
    const prev = series[s.id] ?? [];
    series[s.id] = [...prev, point].filter((p) => Date.parse(p.timestamp) >= cutoff);
  }

  return { updatedAt: generatedAt, series };
}

async function main(): Promise<void> {
  const outDir = resolve(process.argv[2] ?? 'public/data');
  mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const collector = new AvailabilityCollector(new HttpAvailabilityProvider());
  const collected = await collector.collect();

  const services: ServiceStatusDTO[] = collected.map((s) => ({
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
    checkedAt: generatedAt,
  }));

  const snapshot: StatusSnapshotDTO = { environment: 'production', generatedAt, services };
  const summary = buildSummary(services, generatedAt);
  const history = appendHistory(loadHistory(join(outDir, 'history.json')), services, generatedAt);

  writeFileSync(join(outDir, 'status.json'), JSON.stringify(snapshot, null, 2));
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(join(outDir, 'history.json'), JSON.stringify(history));

  console.log(
    `Coletado: ${services.length} serviços (${summary.operational} operacionais) → ${outDir}`
  );
}

void main();
