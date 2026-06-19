import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { DocumentType } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';
import { DOC_DESCRIPTION, UF_NAME } from '../lib/labels.js';

export type DocumentFilter = DocumentType | 'ALL';

interface FilterBarProps {
  /** UFs disponíveis e o estado agregado (pior) de cada uma, para colorir. */
  ufStates: { uf: string; state: ServiceStateValue }[];
  docFilter: DocumentFilter;
  onDocFilter: (value: DocumentFilter) => void;
  selectedUfs: Set<string>;
  onToggleUf: (uf: string) => void;
  onClearUfs: () => void;
}

const DOC_TABS: { value: DocumentFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: DocumentType.NFe, label: 'NF-e' },
  { value: DocumentType.NFCe, label: 'NFC-e' },
  { value: DocumentType.CTe, label: 'CT-e' },
  { value: DocumentType.MDFe, label: 'MDF-e' },
  { value: DocumentType.DCe, label: 'DC-e' },
];

/** Barra de filtros recolhível: documento (abas) + estados (chips de UF). */
export function FilterBar({
  ufStates,
  docFilter,
  onDocFilter,
  selectedUfs,
  onToggleUf,
  onClearUfs,
}: FilterBarProps) {
  const [open, setOpen] = useState(true);

  return (
    <section
      className="rounded-xl border p-4 sm:p-5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {DOC_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onDocFilter(tab.value)}
              aria-pressed={docFilter === tab.value}
              title={tab.value === 'ALL' ? 'Todos os documentos' : DOC_DESCRIPTION[tab.value]}
              className="cursor-help rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                docFilter === tab.value
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-dim)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
          title={open ? 'Ocultar filtro de estados' : 'Mostrar filtro de estados'}
          aria-label="Alternar filtro de estados"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Filtrar por estado
            </h2>
            {selectedUfs.size > 0 && (
              <button
                type="button"
                onClick={onClearUfs}
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Limpar ({selectedUfs.size})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ufStates.map(({ uf, state }) => {
              const color = STATE_META[state].color;
              const active = selectedUfs.has(uf);
              return (
                <button
                  key={uf}
                  type="button"
                  onClick={() => onToggleUf(uf)}
                  aria-pressed={active}
                  title={`${UF_NAME[uf] ?? uf} — ${STATE_META[state].label}`}
                  className="rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-all"
                  style={{
                    borderColor: color,
                    background: active
                      ? color
                      : `color-mix(in srgb, ${color} 12%, transparent)`,
                    color: active ? '#fff' : 'var(--text)',
                  }}
                >
                  {uf}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
