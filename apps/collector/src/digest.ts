import type { NotificationEventDTO, SummaryDTO } from '@monitor-sefaz/contracts';

/**
 * Decide se esta rodada deve emitir o resumo diário e, em caso afirmativo, monta o
 * evento DAILY_DIGEST a partir do summary. Função PURA (recebe a hora atual).
 *
 * Gatilho SEM estado: o Actions roda de hora em hora, então emitimos o digest
 * apenas quando a hora UTC atual == `targetHour`. `targetHour` vem de
 * NOTIFY_DIGEST_HOUR (0–23); ausente/ inválido = digest desligado (retorna null).
 * Isso evita persistir "já enviei hoje" — a granularidade horária do cron basta.
 */
export function buildDigestEvent(
  summary: SummaryDTO,
  targetHour: number | null,
  now: Date
): NotificationEventDTO | null {
  if (targetHour === null || now.getUTCHours() !== targetHour) {
    return null;
  }
  return {
    type: 'DAILY_DIGEST',
    occurredAt: now.toISOString(),
    payload: {
      total: summary.total,
      operational: summary.operational,
      failing: summary.failing,
      availability: summary.availability,
      avgLatencyMs: summary.avgLatencyMs,
      degradedSources: (summary.sources ?? []).filter((s) => s.degraded).map((s) => s.source),
    },
  };
}

/** Interpreta NOTIFY_DIGEST_HOUR: inteiro 0–23 válido, senão null (desligado). */
export function parseDigestHour(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
}
