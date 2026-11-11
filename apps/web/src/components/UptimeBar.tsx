import { PERIOD_MS, type HistoryPeriod, type HistoryPointDTO } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';
import { bucketTimeline } from '../lib/uptime.js';

interface UptimeBarProps {
  points: HistoryPointDTO[];
  period: HistoryPeriod;
  /** Fim da janela (ms). Padrão: agora. */
  end?: number;
  /** Quantas faixas de tempo a barra tem. */
  buckets?: number;
}

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Barra de disponibilidade estilo status page: a janela dividida em faixas de
 * tempo iguais, cada uma com o pior estado lido nela. Faixa sem leitura fica
 * vazia, para o buraco de coleta não se passar por "no ar".
 */
export function UptimeBar({ points, period, end = Date.now(), buckets = 48 }: UptimeBarProps) {
  const timeline = bucketTimeline(points, end, PERIOD_MS[period], buckets);
  const empty = timeline.filter((b) => b.state === null).length;

  if (points.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Sem histórico no período.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex h-9 items-stretch gap-[2px]"
        role="img"
        aria-label={`Disponibilidade em faixas de ${Math.round(PERIOD_MS[period] / buckets / 60_000)} minutos${empty ? `, ${empty} sem leitura` : ''}`}
      >
        {timeline.map((b) => (
          <span
            key={b.start}
            data-state={b.state ?? 'EMPTY'}
            className="min-w-0 flex-1 rounded-[3px]"
            style={
              b.state
                ? { background: STATE_META[b.state].color }
                : {
                    background:
                      'repeating-linear-gradient(135deg, var(--surface-2) 0 3px, var(--border) 3px 4px)',
                  }
            }
            title={`${hhmm(b.start)}–${hhmm(b.end)} · ${b.state ? `${STATE_META[b.state].label} (${b.points} leitura${b.points > 1 ? 's' : ''})` : 'sem leitura'}`}
          />
        ))}
      </div>
      <div
        className="flex justify-between text-[10px] tabular-nums"
        style={{ color: 'var(--text-dim)' }}
        aria-hidden="true"
      >
        <span>{hhmm(end - PERIOD_MS[period])}</span>
        <span>agora</span>
      </div>
    </div>
  );
}
