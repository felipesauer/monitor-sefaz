import type { NotificationEventDTO, SummaryDTO } from '@monitor-sefaz/contracts';

/** Data UTC no formato YYYY-MM-DD (dia do último digest enviado). */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Decide se esta rodada deve emitir o resumo diário e monta o evento DAILY_DIGEST.
 * Função PURA (recebe a hora atual e a data do último digest).
 *
 * Gatilho IDEMPOTENTE por dia, robusto ao cron best-effort (~3h, irregular):
 * emite quando a hora UTC atual é >= `targetHour` E ainda não houve digest hoje
 * (`lastDigestDate !== hoje`). Assim:
 * - se o cron PULAR a hora-alvo exata, o digest ainda sai na próxima rodada do dia;
 * - se o cron rodar VÁRIAS vezes após a hora-alvo, só o primeiro do dia dispara.
 * `targetHour` vem de NOTIFY_DIGEST_HOUR (0–23); ausente/inválido = desligado.
 */
export function buildDigestEvent(
  summary: SummaryDTO,
  targetHour: number | null,
  now: Date,
  lastDigestDate: string | null
): NotificationEventDTO | null {
  if (targetHour === null) return null;
  const today = utcDate(now);
  if (now.getUTCHours() < targetHour || lastDigestDate === today) {
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
