import {
  CircleCheckBig,
  TriangleAlert,
  CircleX,
  CircleHelp,
  Shuffle,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceStateValue } from '@monitor-sefaz/contracts';

interface StateMeta {
  /** Rótulo em PT-BR. */
  label: string;
  /** Cor (token CSS) — usada em estilos inline e SVG. */
  color: string;
  /** Ícone lucide representando o estado. */
  icon: LucideIcon;
  /** Texto curto de referência para o tempo de resposta. */
  hint: string;
}

/** Metadados visuais de cada estado. */
export const STATE_META: Record<ServiceStateValue, StateMeta> = {
  OPERATIONAL: {
    label: 'Operacional',
    color: 'var(--ok)',
    icon: CircleCheckBig,
    hint: 'Normal: ≤ 2s',
  },
  CONTINGENCY: {
    label: 'Contingência',
    color: 'var(--contingency)',
    icon: Shuffle,
    hint: 'Operando via SVC',
  },
  SLOWDOWN: { label: 'Instável', color: 'var(--slow)', icon: TriangleAlert, hint: 'Lento' },
  DOWN: { label: 'Indisponível', color: 'var(--down)', icon: CircleX, hint: 'Fora do ar' },
  ERROR: { label: 'Sem dados', color: 'var(--err)', icon: CircleHelp, hint: 'Sem leitura' },
};

/** Ordem de severidade para ordenar/priorizar exibição (pior primeiro). */
export const STATE_SEVERITY: Record<ServiceStateValue, number> = {
  DOWN: 4,
  SLOWDOWN: 3,
  ERROR: 2,
  CONTINGENCY: 1,
  OPERATIONAL: 0,
};
