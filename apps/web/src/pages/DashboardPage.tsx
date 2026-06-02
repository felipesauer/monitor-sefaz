import { useState } from 'react';
import type { EnvironmentValue } from '@monitor-sefaz/contracts';
import { useStatusSnapshot, useSummary } from '../hooks/useStatus.js';
import { useStatusStream } from '../hooks/useStatusStream.js';
import { EnvironmentToggle } from '../components/EnvironmentToggle.js';
import { SummaryCards } from '../components/SummaryCards.js';
import { StatusGrid } from '../components/StatusGrid.js';
import { StatusLegend } from '../components/StatusLegend.js';

/** Página principal do dashboard: resumo + grade de status por UF/documento. */
export function DashboardPage() {
  const [env, setEnv] = useState<EnvironmentValue>('producao');
  const status = useStatusSnapshot(env);
  const summary = useSummary(env);
  useStatusStream(env);

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

      <StatusLegend />

      {status.isLoading && <p className="empty">Carregando…</p>}
      {status.isError && <p className="error">Falha ao carregar o status. Tente novamente.</p>}
      {status.data && <StatusGrid services={status.data.services} />}

      {status.data && (
        <footer className="dashboard__footer">
          Atualizado em {new Date(status.data.generatedAt).toLocaleString('pt-BR')}
        </footer>
      )}
    </main>
  );
}
