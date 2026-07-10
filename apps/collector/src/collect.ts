import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ConsensusCollector,
  TechnicalNotesProvider,
  createHttpTechnicalNotesFetcher,
} from '@monitor-sefaz/core';
import { Catalog, DEFAULT_MIN_COVERAGE_RATIO, Environment } from '@monitor-sefaz/catalog';
import {
  averageLatency,
  fromEnvironment,
  historyFileSchema,
  isUp,
  technicalNotesFileSchema,
  type HistoryFileDTO,
  type HistoryPointDTO,
  type ServiceStatusDTO,
  type SourceHealthDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
  type TechnicalNoteDTO,
  type TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import type { SourceHealth } from '@monitor-sefaz/core';
import { Notifier, parseNotifierConfig } from '@monitor-sefaz/notifier';
import { buildNotificationEvents } from './notifyEvents.js';
import { reconcileTechnicalNotes, technicalNoteEvents } from './technicalNotes.js';
import { buildDigestEvent, parseDigestHour } from './digest.js';

/** Retenção do histórico estático (ms). Padrão 7 dias. */
const RETENTION_MS = Number(process.env.HISTORY_RETENTION_MS ?? 7 * 24 * 60 * 60 * 1000);

/**
 * Fração mínima do catálogo que uma coleta precisa cobrir para ser publicada.
 * Default compartilhado com o worker via @monitor-sefaz/catalog; ajustável por env.
 */
const MIN_COVERAGE_RATIO = Number(process.env.MIN_COVERAGE_RATIO ?? DEFAULT_MIN_COVERAGE_RATIO);

/**
 * Converte a saúde por fonte do consenso (core) para o DTO do contrato. O `source`
 * do core é o rótulo livre da fonte; no consenso padrão coincide com o enum
 * `statusSource` (svrs/availability/integranotas). Fontes com rótulo fora do enum
 * são descartadas do diagnóstico (não quebram o summary).
 */
function toSourceHealthDTOs(sources: SourceHealth[]): SourceHealthDTO[] {
  const KNOWN = new Set(['integranotas', 'availability', 'svrs']);
  return sources
    .filter((s) => KNOWN.has(s.source))
    .map((s) => ({
      source: s.source as SourceHealthDTO['source'],
      official: s.official,
      collected: s.collected,
      expected: s.expected,
      coverage: s.coverage,
      degraded: s.degraded,
    }));
}

function buildSummary(
  services: ServiceStatusDTO[],
  generatedAt: string,
  sources?: SourceHealth[]
): SummaryDTO {
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
    ...(sources ? { sources: toSourceHealthDTOs(sources) } : {}),
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

function loadTechnicalNotes(path: string): TechnicalNotesFileDTO {
  if (!existsSync(path)) {
    return { updatedAt: new Date(0).toISOString(), notes: [] };
  }
  try {
    return technicalNotesFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return { updatedAt: new Date(0).toISOString(), notes: [] };
  }
}

/**
 * Coleta as Notas Técnicas e reconcilia com o arquivo versionado, devolvendo as
 * NTs novas para notificar. Tolerante a falha: se a coleta de NTs falhar, NÃO
 * derruba a coleta de status — apenas não há NT nova nesta rodada.
 */
async function collectTechnicalNotes(outDir: string, now: string): Promise<TechnicalNoteDTO[]> {
  const path = join(outDir, 'technical-notes.json');
  try {
    const provider = new TechnicalNotesProvider(createHttpTechnicalNotesFetcher());
    const scraped = await provider.fetch();
    const { file, fresh } = reconcileTechnicalNotes(loadTechnicalNotes(path), scraped, now);
    writeFileSync(path, JSON.stringify(file, null, 2));
    return fresh;
  } catch (err) {
    console.warn(`Notas Técnicas: coleta falhou (${err instanceof Error ? err.message : err})`);
    return [];
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
      source: s.source,
    };
    const prev = series[s.id] ?? [];
    series[s.id] = [...prev, point].filter((p) => Date.parse(p.timestamp) >= cutoff);
  }

  // Poda também os IDs AUSENTES da coleta atual (UF/doc que sumiu da fonte, ou
  // coleta parcial sob fallback): sem isso suas séries nunca expiravam e o
  // history.json crescia sem limite, servindo pontos fora da janela de retenção.
  for (const id of Object.keys(series)) {
    const pruned = series[id]!.filter((p) => Date.parse(p.timestamp) >= cutoff);
    if (pruned.length === 0) {
      delete series[id];
    } else {
      series[id] = pruned;
    }
  }

  return { updatedAt: generatedAt, series };
}

async function main(): Promise<void> {
  const outDir = resolve(process.argv[2] ?? 'public/data');
  mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  // Fonte multi-fonte com precedência oficial: SVRS e página oficial da Receita
  // (oficiais) decidem o estado; o IntegraNotas (mais completo) preenche as UFs
  // que as oficiais não publicam.
  const catalog = new Catalog();
  const collector = ConsensusCollector.createForNode(catalog, MIN_COVERAGE_RATIO);
  const { services: collected, sources: sourceHealth } = await collector.collectWithDiagnostics();

  // Guarda de piso: se a coleta veio muito abaixo do catálogo, ambas as fontes
  // provavelmente falharam. Abortar com erro (sem escrever) faz o git não ver
  // diff — o último snapshot bom permanece — e o GitHub Actions falha visível,
  // em vez de publicar services:[] / availability:0 silenciosamente.
  if (!catalog.meetsCoverageFloor(collected.length, Environment.Production, MIN_COVERAGE_RATIO)) {
    const expected = catalog.listAll(Environment.Production).length;
    console.error(
      `Coleta abaixo do piso: ${collected.length} de ${expected} serviços ` +
        `(mínimo ${Math.floor(expected * MIN_COVERAGE_RATIO)}). ` +
        `Provável falha das fontes; abortando sem sobrescrever.`
    );
    process.exit(1);
  }

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
    source: s.source,
    sourceCheckedAt: s.sourceCheckedAt,
    error: null,
    checkedAt: generatedAt,
  }));

  const snapshot: StatusSnapshotDTO = { environment: 'production', generatedAt, services };
  const summary = buildSummary(services, generatedAt, sourceHealth);
  // Carrega o histórico ANTES do append: o último ponto de cada série é o estado
  // anterior contra o qual detectamos transições para notificar.
  const previousHistory = loadHistory(join(outDir, 'history.json'));
  const history = appendHistory(previousHistory, services, generatedAt);

  writeFileSync(join(outDir, 'status.json'), JSON.stringify(snapshot, null, 2));
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(join(outDir, 'history.json'), JSON.stringify(history));

  console.log(
    `Coletado: ${services.length} serviços (${summary.operational} operacionais) → ${outDir}`
  );

  // Notas Técnicas: coleta própria (não afeta o piso de status). Atualiza o
  // technical-notes.json versionado e devolve as NTs novas para notificar.
  const freshNotes = await collectTechnicalNotes(outDir, generatedAt);
  if (freshNotes.length > 0) {
    console.log(`Notas Técnicas: ${freshNotes.length} nova(s)`);
  }

  // Notificação (opcional): compara com o estado anterior do histórico e dispara
  // os eventos aos canais configurados. Sem nenhuma var NOTIFY_*, é no-op. Roda
  // DEPOIS de publicar os JSONs — uma falha de entrega não deve impedir a coleta.
  const notifier = new Notifier(parseNotifierConfig(process.env));
  if (notifier.enabled) {
    // Envolto em try/catch: os JSONs já foram publicados acima. Uma falha aqui
    // (montagem de evento, entrega) NÃO deve marcar o job como vermelho nem
    // impedir a coleta — apenas registra o aviso.
    try {
      const digest = buildDigestEvent(
        summary,
        parseDigestHour(process.env.NOTIFY_DIGEST_HOUR),
        new Date(generatedAt)
      );
      const events = [
        ...buildNotificationEvents(previousHistory, services, summary.sources, generatedAt),
        ...technicalNoteEvents(freshNotes, generatedAt),
        ...(digest ? [digest] : []),
      ];
      const { sent, failed } = await notifier.notify(events);
      console.log(`Notificações: ${events.length} eventos, ${sent} entregues, ${failed} falharam`);
    } catch (err) {
      console.warn(`Notificação falhou (coleta preservada): ${err instanceof Error ? err.message : err}`);
    }
  }
}

void main();
