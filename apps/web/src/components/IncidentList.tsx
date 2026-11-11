import { STATE_META, stateTextColor } from './serviceState.js';
import { authorizerLabel, DOC_LABEL } from '../lib/labels.js';
import type { Incident } from '../lib/incidents.js';
import { dayKey, formatDay, formatDuration, formatTime } from '../lib/time.js';

interface IncidentListProps {
  incidents: Incident[];
  /** Mostra documento e autorizador em cada linha (na home); no painel do serviço, não. */
  showService?: boolean;
  /** Fim da janela (ms): calcula a duração das ocorrências em andamento. */
  now: number;
  emptyText: string;
  limit?: number;
}

/**
 * Ocorrências agrupadas por dia (horário de Brasília), mais recentes primeiro:
 * o estado, o que caiu, de quando a quando e por quanto tempo.
 */
export function IncidentList({
  incidents,
  showService,
  now,
  emptyText,
  limit = 20,
}: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        {emptyText}
      </p>
    );
  }
  const shown = incidents.slice(0, limit);
  const days = new Map<string, Incident[]>();
  for (const incident of shown) {
    const key = dayKey(incident.end ?? now);
    days.set(key, [...(days.get(key) ?? []), incident]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...days.values()].map((list) => (
        <div key={dayKey(list[0]!.end ?? now)}>
          <h4
            className="mb-1.5 text-xs font-semibold capitalize"
            style={{ color: 'var(--text-dim)' }}
          >
            {formatDay(list[0]!.end ?? now)}
          </h4>
          <ul
            className="flex flex-col divide-y rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
          >
            {list.map((incident) => {
              const meta = STATE_META[incident.state];
              const ongoing = incident.end === null;
              const span = (incident.end ?? now) - incident.start;
              return (
                <li
                  key={`${incident.document}-${incident.authorizer}-${incident.start}`}
                  className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    {showService && (
                      <p className="text-sm font-semibold">
                        {DOC_LABEL[incident.document] ?? incident.document} ·{' '}
                        {authorizerLabel(incident.authorizer)}
                        {incident.ufs.length > 1 && (
                          <span className="font-normal" style={{ color: 'var(--text-dim)' }}>
                            {' '}
                            · {incident.ufs.length} UFs
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {ongoing
                        ? `Desde ${formatTime(incident.start)}, em andamento há ${formatDuration(span)}`
                        : `Das ${formatTime(incident.start)} às ${formatTime(incident.end!)} · ${formatDuration(span)}`}
                    </p>
                    {showService && incident.ufs.length > 1 && (
                      <p
                        className="mt-0.5 truncate font-mono text-[11px]"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        {incident.ufs.join(' ')}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                      color: stateTextColor(meta.color),
                    }}
                  >
                    {ongoing ? `${meta.label} agora` : meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {incidents.length > shown.length && (
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Mais {incidents.length - shown.length} ocorrências no período.
        </p>
      )}
    </div>
  );
}
