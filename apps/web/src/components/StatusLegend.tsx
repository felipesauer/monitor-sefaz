import { STATE_META } from './serviceState.js';
import type { ServiceStateValue } from '@monitor-sefaz/contracts';

/** Texto didático de cada estado (mostrado no tooltip da legenda). */
const STATE_HELP: Record<ServiceStateValue, string> = {
  OPERATIONAL: 'cStat 107 — Serviço em Operação. A SEFAZ respondeu normalmente.',
  CONTINGENCY: 'Operando em contingência (SVC) — disponível, mas pelo ambiente de contingência.',
  SLOWDOWN: 'cStat 108 — Paralisado Momentaneamente. Instabilidade temporária.',
  DOWN: 'cStat 109 — Paralisado sem Previsão. Serviço fora do ar.',
  ERROR: 'Sem leitura — não foi possível obter o status naquele momento.',
};

const STATES: ServiceStateValue[] = ['OPERATIONAL', 'CONTINGENCY', 'SLOWDOWN', 'DOWN', 'ERROR'];

/** Legenda das cores usadas na grade de status, com explicação no hover. */
export function StatusLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
      style={{ color: 'var(--text-dim)' }}
      aria-label="Legenda de estados"
    >
      {STATES.map((state) => (
        <span
          className="inline-flex cursor-help items-center gap-1.5"
          key={state}
          title={STATE_HELP[state]}
        >
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
