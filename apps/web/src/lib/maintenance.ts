import { TIME_ZONE } from './time.js';

/**
 * Janela de manutenção programada do SVRS, publicada no portal dele: domingos,
 * das 7h às 9h (horário de Brasília). Queda nesse intervalo é esperada, não um
 * incidente. Brasília não tem horário de verão desde 2019: UTC-3 fixo.
 */
export const SVRS_MAINTENANCE = { weekday: 0, startHour: 7, endHour: 9 } as const;

const OFFSET_MS = 3 * 60 * 60 * 1000;
const partsFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

/** `true` dentro da janela de manutenção do SVRS. */
export function inSvrsMaintenance(ms: number): boolean {
  const parts = partsFmt.formatToParts(ms);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return weekday === 'Sun' && hour >= SVRS_MAINTENANCE.startHour && hour < SVRS_MAINTENANCE.endHour;
}

/** Início (ms) da próxima janela de manutenção do SVRS, ou da atual se já começou. */
export function nextSvrsMaintenance(now: number): number {
  // Meia-noite de hoje em Brasília, em UTC.
  const local = new Date(now - OFFSET_MS);
  const midnight =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET_MS;
  const daysToSunday = (7 - local.getUTCDay()) % 7;
  let start = midnight + daysToSunday * 86_400_000 + SVRS_MAINTENANCE.startHour * 3_600_000;
  const end = start + (SVRS_MAINTENANCE.endHour - SVRS_MAINTENANCE.startHour) * 3_600_000;
  if (now >= end) start += 7 * 86_400_000;
  return start;
}
