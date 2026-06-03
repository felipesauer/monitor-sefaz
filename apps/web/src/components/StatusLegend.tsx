import { STATE_META } from './serviceState.js';
import type { ServiceStateValue } from '@monitor-sefaz/contracts';

const STATES: ServiceStateValue[] = ['OPERATIONAL', 'SLOWDOWN', 'DOWN', 'ERROR'];

/** Legenda das cores usadas na grade de status. */
export function StatusLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
      style={{ color: 'var(--text-dim)' }}
      aria-label="Legenda de estados"
    >
      {STATES.map((state) => (
        <span className="inline-flex items-center gap-1.5" key={state}>
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: STATE_META[state].color }}
          />
          {STATE_META[state].label}
        </span>
      ))}
    </div>
  );
}
