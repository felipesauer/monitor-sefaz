import { STATE_META } from './serviceState.js';
import type { ServiceStateValue } from '@monitor-sefaz/contracts';

const STATES: ServiceStateValue[] = ['OPERATIONAL', 'SLOWDOWN', 'DOWN', 'ERROR'];

/** Legenda das cores usadas na grade de status. */
export function StatusLegend() {
  return (
    <div className="legend" aria-label="Legenda de estados">
      {STATES.map((state) => (
        <span className="legend__item" key={state}>
          <span className="legend__swatch" style={{ backgroundColor: STATE_META[state].color }} />
          {STATE_META[state].label}
        </span>
      ))}
    </div>
  );
}
