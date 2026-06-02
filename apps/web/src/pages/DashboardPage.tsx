import { useMemo, useState } from 'react';
import type { EnvironmentValue } from '@monitor-sefaz/contracts';
import { useStatusSnapshot, useSummary } from '../hooks/useStatus.js';
import { useStatusStream } from '../hooks/useStatusStream.js';
import { EnvironmentToggle } from '../components/EnvironmentToggle.js';
import { DocumentFilterTabs, type DocumentFilter } from '../components/DocumentFilterTabs.js';
import { SummaryCards } from '../components/SummaryCards.js';
import { StatusGrid } from '../components/StatusGrid.js';
import { StatusLegend } from '../components/StatusLegend.js';

/** Página principal do dashboard: resumo + grade de status por UF/documento. */
export function DashboardPage() {
  const [env, setEnv] = useState<EnvironmentValue>('producao');
  const [docFilter, setDocFilter] = useState<DocumentFilter>('ALL');
  const status = useStatusSnapshot(env);
  const summary = useSummary(env);
  useStatusStream(env);

  const services = useMemo(() => {
    const all = status.data?.services ?? [];
    return docFilter === 'ALL' ? all : all.filter((s) => s.document === docFilter);
  }, [status.data, docFilter]);

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Monitor SEFAZ</h1>
          <p className="dashboard__subtitle">
            Status em tempo real dos serviços de documentos fiscais eletrônicos
          </p>
        </div>
        <EnvironmentToggle value={env} onChange={setEnv} />
      </header>

      {summary.data && <SummaryCards summary={summary.data} />}

      <DocumentFilterTabs value={docFilter} onChange={setDocFilter} />
      <StatusLegend />

      {status.isLoading && <p className="empty">Carregando…</p>}
      {status.isError && <p className="error">Falha ao carregar o status. Tente novamente.</p>}
      {status.data && <StatusGrid services={services} />}

      {status.data && (
        <footer className="dashboard__footer">
          Atualizado em {new Date(status.data.generatedAt).toLocaleString('pt-BR')}
        </footer>
      )}
    </main>
  );
}
