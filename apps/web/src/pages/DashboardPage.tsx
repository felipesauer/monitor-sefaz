import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ServiceStatusDTO, ServiceStateValue } from '@monitor-sefaz/contracts';
import {
  useHistorySeries,
  useStatusSnapshot,
  useSummary,
  POLL_INTERVAL_MS,
} from '../hooks/useStatus.js';
import { useTheme } from '../hooks/useTheme.js';
import { Header, type LayoutMode } from '../components/Header.js';
import { GlobalBanner } from '../components/GlobalBanner.js';
import { UpdateInfo } from '../components/UpdateInfo.js';
import { SummaryCards } from '../components/SummaryCards.js';
import { FilterBar, type DocumentFilter } from '../components/FilterBar.js';
import { ServiceGrid } from '../components/ServiceGrid.js';
import { ServiceDetailPanel } from '../components/ServiceDetailPanel.js';
import { Footer } from '../components/Footer.js';
import { StatusLegend } from '../components/StatusLegend.js';
import { STATE_SEVERITY } from '../components/serviceState.js';

/** Estado agregado (pior) de uma UF entre os serviços visíveis — colore o chip. */
function aggregateUfStates(
  services: ServiceStatusDTO[]
): { uf: string; state: ServiceStateValue }[] {
  const worst = new Map<string, ServiceStateValue>();
  for (const s of services) {
    const cur = worst.get(s.uf);
    if (!cur || STATE_SEVERITY[s.state] > STATE_SEVERITY[cur]) {
      worst.set(s.uf, s.state);
    }
  }
  return [...worst.entries()]
    .map(([uf, state]) => ({ uf, state }))
    .sort((a, b) => a.uf.localeCompare(b.uf));
}

/** Página principal: status page de disponibilidade da SEFAZ (produção). */
export function DashboardPage() {
  const { theme, toggle } = useTheme();
  const queryClient = useQueryClient();

  const [layout, setLayout] = useState<LayoutMode>('panel');
  const [paused, setPaused] = useState(false);
  const [docFilter, setDocFilter] = useState<DocumentFilter>('ALL');
  const [selectedUfs, setSelectedUfs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ServiceStatusDTO | null>(null);

  const refresh = paused ? false : POLL_INTERVAL_MS;
  const status = useStatusSnapshot(refresh);
  const summary = useSummary(refresh);
  const series = useHistorySeries();

  const all = status.data?.services ?? [];

  // Chips de UF respeitam o filtro de documento (cor agregada por UF).
  const docScoped = useMemo(
    () => (docFilter === 'ALL' ? all : all.filter((s) => s.document === docFilter)),
    [all, docFilter]
  );
  const ufStates = useMemo(() => aggregateUfStates(docScoped), [docScoped]);

  // Aplica documento + UFs selecionadas, ordenando por severidade (pior primeiro).
  const visible = useMemo(() => {
    const filtered = docScoped.filter((s) =>
      selectedUfs.size === 0 ? true : selectedUfs.has(s.uf)
    );
    return [...filtered].sort(
      (a, b) =>
        STATE_SEVERITY[b.state] - STATE_SEVERITY[a.state] ||
        a.uf.localeCompare(b.uf) ||
        a.document.localeCompare(b.document)
    );
  }, [docScoped, selectedUfs]);

  const selectedLive = selected
    ? (all.find((s) => s.id === selected.id) ?? selected)
    : null;

  const toggleUf = (uf: string): void =>
    setSelectedUfs((prev) => {
      const next = new Set(prev);
      if (next.has(uf)) {
        next.delete(uf);
      } else {
        next.add(uf);
      }
      return next;
    });

  const refetchAll = (): void => {
    void queryClient.invalidateQueries();
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        layout={layout}
        onLayout={setLayout}
        generatedAt={status.data?.generatedAt}
        refreshLabel={paused ? 'Atualização pausada' : 'Atualização automática'}
        paused={paused}
        onTogglePause={() => setPaused((v) => !v)}
        onRefresh={refetchAll}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6">
        {summary.data && <GlobalBanner summary={summary.data} />}

        {status.data && (
          <UpdateInfo generatedAt={status.data.generatedAt} refreshIntervalMs={POLL_INTERVAL_MS} />
        )}

        {layout === 'metrics' && summary.data && <SummaryCards summary={summary.data} />}

        {layout !== 'operation' && (
          <FilterBar
            ufStates={ufStates}
            docFilter={docFilter}
            onDocFilter={setDocFilter}
            selectedUfs={selectedUfs}
            onToggleUf={toggleUf}
            onClearUfs={() => setSelectedUfs(new Set())}
          />
        )}

        <StatusLegend />

        {status.isLoading && (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
            Carregando…
          </p>
        )}
        {status.isError && (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--down)' }}>
            Não foi possível carregar o status. Tente novamente.
          </p>
        )}
        {status.data && (
          <ServiceGrid services={visible} series={series.data ?? {}} onSelect={setSelected} />
        )}
      </main>

      <Footer />

      {selectedLive && (
        <ServiceDetailPanel service={selectedLive} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
