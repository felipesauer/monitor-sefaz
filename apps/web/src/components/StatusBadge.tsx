import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';

interface StatusBadgeProps {
  state: ServiceStateValue;
}

/** Selo (pill) colorido representando o estado de um serviço. */
export function StatusBadge({ state }: StatusBadgeProps) {
  const meta = STATE_META[state];
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color }}
      role="status"
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
