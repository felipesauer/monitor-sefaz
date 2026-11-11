/** O fuso de todos os horários do painel: o da SEFAZ e de quem emite. */
export const TIME_ZONE = 'America/Sao_Paulo';

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dayFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: TIME_ZONE,
});
const keyFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
});

/** "14:05" no horário de Brasília. */
export const formatTime = (ms: number): string => timeFmt.format(ms);

/** "ter., 11/11" no horário de Brasília. */
export const formatDay = (ms: number): string => dayFmt.format(ms);

/** "2026-11-11": o dia no horário de Brasília, para agrupar. */
export const dayKey = (ms: number): string => keyFmt.format(ms);

/** "25 min", "2 h 10 min". */
export function formatDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
