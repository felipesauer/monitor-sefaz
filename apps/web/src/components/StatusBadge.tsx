import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';

interface StatusBadgeProps {
  state: ServiceStateValue;
}

/** Selo colorido representando o estado de um serviço. */
export function StatusBadge({ state }: StatusBadgeProps) {
  const meta = STATE_META[state];
  return (
    <span
      className="status-badge"
      style={{ backgroundColor: meta.color }}
      title={meta.label}
      role="status"
    >
      {meta.label}
    </span>
  );
}
