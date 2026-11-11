import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ServiceStatusDTO, ServiceStateValue } from '@monitor-sefaz/contracts';
import {
  useHistorySeries,
  useStatusSnapshot,
  useSummary,
  useTechnicalNotes,
  POLL_INTERVAL_MS,
} from '../hooks/useStatus.js';
import { useTheme } from '../hooks/useTheme.js';
import { Header, type LayoutMode } from '../components/Header.js';
import { GlobalBanner } from '../components/GlobalBanner.js';
import { UpdateInfo } from '../components/UpdateInfo.js';
import { SummaryCards } from '../components/SummaryCards.js';
import { FilterBar, type DocumentFilter } from '../components/FilterBar.js';
import { UfSections } from '../components/UfSections.js';
import { OverviewCharts } from '../components/OverviewCharts.js';
import { IncidentList } from '../components/IncidentList.js';
import { MaintenanceNotice } from '../components/MaintenanceNotice.js';
import { deriveIncidents } from '../lib/incidents.js';
import { ServiceDetailPanel } from '../components/ServiceDetailPanel.js';
import { Footer } from '../components/Footer.js';
import { StatusLegend } from '../components/StatusLegend.js';
import { BrazilMap } from '../components/BrazilMap.js';
import { HelpSection } from '../components/HelpSection.js';
import { TechnicalNotesCard } from '../components/TechnicalNotesCard.js';
import { NoScriptNotice } from '../components/NoScriptNotice.js';
import { UfDirectory } from '../components/UfDirectory.js';
import { STATE_SEVERITY } from '../components/serviceState.js';
import { ufsWithoutStatus } from '../lib/coverage.js';
import { DOC_LABEL } from '../lib/labels.js';
import { DOCUMENTS } from '../lib/ufFacts.js';
import { ALL_UFS, type DocumentType, type UF } from '@monitor-sefaz/catalog';

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
  const { toggle } = useTheme();
  const queryClient = useQueryClient();

  const [layout, setLayout] = useState<LayoutMode>('panel');
  const [paused, setPaused] = useState(false);
  const [docFilter, setDocFilter] = useState<DocumentFilter>('ALL');
  const [selectedUfs, setSelectedUfs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ServiceStatusDTO | null>(null);
  const [ufView, setUfView] = useState<'cards' | 'compact'>('cards');

  const refresh = paused ? false : POLL_INTERVAL_MS;
  const status = useStatusSnapshot(refresh);
  const summary = useSummary(refresh);
  const series = useHistorySeries();
  const technicalNotes = useTechnicalNotes();

  const all = status.data?.services ?? [];

  // Chips de UF respeitam o filtro de documento (cor agregada por UF).
  const docScoped = useMemo(
    () => (docFilter === 'ALL' ? all : all.filter((s) => s.document === docFilter)),
    [all, docFilter]
  );
  const ufStates = useMemo(() => aggregateUfStates(docScoped), [docScoped]);

  // UFs sem leitura do documento filtrado (ex.: BP-e em MG, MS, MT, PR e SP, que
  // não têm fonte pública e só aparecem no modo `soap`).
  const uncovered = useMemo(
    () => (status.data && docFilter !== 'ALL' ? ufsWithoutStatus(all, docFilter) : []),
    [status.data, all, docFilter]
  );

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

  const selectedLive = selected ? (all.find((s) => s.id === selected.id) ?? selected) : null;

  // Ocorrências das últimas 72h, nos documentos e estados que os filtros deixam ver.
  const incidents = useMemo(() => {
    if (!series.data || !status.data) return [];
    const end = Date.parse(status.data.generatedAt);
    const authorizer = new Map(all.map((s) => [s.id, s.authorizer]));
    const docs = new Set<string>(docFilter === 'ALL' ? DOCUMENTS : [docFilter]);
    return deriveIncidents(series.data, (id) => authorizer.get(id), end - 72 * 3_600_000).filter(
      (i) =>
        docs.has(i.document) && (selectedUfs.size === 0 || i.ufs.some((uf) => selectedUfs.has(uf)))
    );
  }, [series.data, status.data, all, docFilter, selectedUfs]);

  // Agrupamento por estado (ADR-18): os documentos e os estados que os filtros deixam ver.
  const shownDocuments = docFilter === 'ALL' ? DOCUMENTS : [docFilter as DocumentType];
  const shownUfs: readonly UF[] =
    selectedUfs.size === 0 ? ALL_UFS : ALL_UFS.filter((uf) => selectedUfs.has(uf));

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
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Acompanhe em tempo real a disponibilidade dos serviços de autorização da SEFAZ para os
          documentos fiscais eletrônicos, por estado e por UF. Os dados são consolidados a partir do
          monitoramento público da SEFAZ.
        </p>

        {(summary.data || summary.isLoading) && (
          <GlobalBanner summary={summary.data} services={all} />
        )}

        {(status.data || status.isLoading) && (
          <UpdateInfo generatedAt={status.data?.generatedAt} refreshIntervalMs={POLL_INTERVAL_MS} />
        )}
        <MaintenanceNotice />

        {layout === 'metrics' && summary.data && <SummaryCards summary={summary.data} />}

        <OverviewCharts
          series={series.data}
          documents={shownDocuments}
          end={status.data ? Date.parse(status.data.generatedAt) : undefined}
        />

        <section
          className="flex flex-col gap-3 rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
          aria-labelledby="ocorrencias-title"
        >
          <div>
            <h2 id="ocorrencias-title" className="text-sm font-semibold">
              Ocorrências recentes
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Quedas e instabilidades nas últimas 72 horas, tiradas do histórico. Serviços do mesmo
              autorizador que caíram juntos aparecem como uma ocorrência só.
            </p>
          </div>
          {series.data && status.data ? (
            <IncidentList
              incidents={incidents}
              showService
              now={Date.parse(status.data.generatedAt)}
              emptyText="Nenhuma queda ou instabilidade nas últimas 72 horas."
            />
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Carregando o histórico…
            </p>
          )}
        </section>

        {layout !== 'operation' && (
          <BrazilMap
            ufStates={ufStates}
            selectedUfs={selectedUfs}
            onToggleUf={toggleUf}
            services={docScoped}
            documents={shownDocuments}
            loading={status.isLoading}
          />
        )}

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

        {uncovered.length > 0 && docFilter !== 'ALL' && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Sem leitura de {DOC_LABEL[docFilter]} em {uncovered.join(', ')}; esses estados não
            aparecem na lista.
          </p>
        )}

        <StatusLegend />

        {status.isLoading && (
          // Os grupos por estado com cards de espera, do tamanho dos reais: é o
          // que vai no HTML pré-renderizado, e a página não pula quando o status
          // chega.
          <UfSections
            loading
            services={[]}
            documents={shownDocuments}
            ufs={shownUfs}
            series={{}}
            onSelect={() => {}}
          />
        )}
        <NoScriptNotice />
        {status.isError && (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--down)' }}>
            Não foi possível carregar o status. Tente novamente.
          </p>
        )}
        {status.data && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Por estado</h2>
            <div
              className="flex gap-1 rounded-lg p-0.5"
              style={{ background: 'var(--surface-2)' }}
              role="group"
              aria-label="Como mostrar os estados"
            >
              {(
                [
                  ['cards', 'Cards'],
                  ['compact', 'Lista compacta'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ufView === value}
                  onClick={() => setUfView(value)}
                  className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                  style={
                    ufView === value
                      ? {
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          boxShadow: 'var(--shadow)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {status.data && (
          <UfSections
            compact={ufView === 'compact'}
            services={visible}
            documents={shownDocuments}
            ufs={shownUfs}
            series={series.data ?? {}}
            onSelect={setSelected}
          />
        )}

        <section
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <h2 className="text-sm font-semibold">Status da SEFAZ por estado</h2>
          <p className="mb-4 mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Cada estado tem uma página com o status ao vivo, quem autoriza cada documento e o que
            fazer quando a SEFAZ cai.
          </p>
          <UfDirectory />
        </section>

        <TechnicalNotesCard notes={technicalNotes.data?.notes ?? []} />
        <HelpSection />
      </main>

      <Footer />

      {selectedLive && (
        <ServiceDetailPanel service={selectedLive} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
