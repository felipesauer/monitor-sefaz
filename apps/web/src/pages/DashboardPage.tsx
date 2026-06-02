import { useMemo, useState } from 'react';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { useStatusSnapshot, useSummary } from '../hooks/useStatus.js';
import { useTheme } from '../hooks/useTheme.js';
import { GlobalBanner } from '../components/GlobalBanner.js';
import { DocumentFilterTabs, type DocumentFilter } from '../components/DocumentFilterTabs.js';
import { SummaryCards } from '../components/SummaryCards.js';
import { ServiceList } from '../components/ServiceList.js';
import { StatusLegend } from '../components/StatusLegend.js';
import { ServiceDetailPanel } from '../components/ServiceDetailPanel.js';

/** Página principal: status page de disponibilidade da SEFAZ (produção). */
export function DashboardPage() {
  const { theme, toggle } = useTheme();
  const [docFilter, setDocFilter] = useState<DocumentFilter>('ALL');
  const [selected, setSelected] = useState<ServiceStatusDTO | null>(null);
  const status = useStatusSnapshot();
  const summary = useSummary();

  const services = useMemo(() => {
    const all = status.data?.services ?? [];
    return docFilter === 'ALL' ? all : all.filter((s) => s.document === docFilter);
  }, [status.data, docFilter]);

  const selectedLive = selected
    ? (status.data?.services.find((s) => s.id === selected.id) ?? selected)
    : null;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__logo">SF</div>
          <div>
            <h1 className="brand__title">Monitor SEFAZ</h1>
            <p className="brand__subtitle">Disponibilidade de NF-e, NFC-e, CT-e, MDF-e e DC-e</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={toggle}
          aria-label="Alternar tema"
          title="Alternar tema"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {summary.data && <GlobalBanner summary={summary.data} />}
      {summary.data && <SummaryCards summary={summary.data} />}

      <DocumentFilterTabs value={docFilter} onChange={setDocFilter} />
      <StatusLegend />

      {status.isLoading && <p className="muted">Carregando…</p>}
      {status.isError && <p className="error">Não foi possível carregar o status. Tente novamente.</p>}
      {status.data && <ServiceList services={services} onSelect={setSelected} />}

      {status.data && (
        <footer className="foot">
          Atualizado em {new Date(status.data.generatedAt).toLocaleString('pt-BR')} ·{' '}
          <a href="https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx" target="_blank" rel="noreferrer">
            fonte oficial SEFAZ
          </a>
        </footer>
      )}

      {selectedLive && (
        <ServiceDetailPanel service={selectedLive} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
