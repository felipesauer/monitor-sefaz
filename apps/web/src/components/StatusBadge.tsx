import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';

interface StatusBadgeProps {
  state: ServiceStateValue;
}

/** Selo (pill) colorido representando o estado de um serviço. */
export function StatusBadge({ state }: StatusBadgeProps) {
  const meta = STATE_META[state];
  return (
    <span className="pill" style={{ background: meta.color }} role="status">
      {meta.label}
    </span>
  );
}
