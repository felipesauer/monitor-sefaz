import { useState } from 'react';
import type {
  EnvironmentValue,
  HistoryPeriod,
  ServiceStatusDTO,
} from '@monitor-sefaz/contracts';
import { useServiceHistory } from '../hooks/useStatus.js';
import { StatusBadge } from './StatusBadge.js';
import { UptimeBar } from './UptimeBar.js';
import { LatencyChart } from './LatencyChart.js';

interface ServiceDetailPanelProps {
  env: EnvironmentValue;
  service: ServiceStatusDTO;
  onClose: () => void;
}

const PERIODS: HistoryPeriod[] = ['1h', '6h', '24h', '72h'];

/** Painel lateral com histórico de uptime e latência de um serviço. */
export function ServiceDetailPanel({ env, service, onClose }: ServiceDetailPanelProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const history = useServiceHistory(env, service.id, period);
  const points = history.data?.points ?? [];
  const operational = points.filter((p) => p.state === 'OPERATIONAL').length;
  const uptime = points.length === 0 ? null : ((operational / points.length) * 100).toFixed(1);

  return (
    <aside className="detail-panel" aria-label={`Detalhes de ${service.id}`}>
      <header className="detail-panel__header">
        <div>
          <h2>
            {service.document} · {service.uf}
          </h2>
          <p className="detail-panel__authorizer">Autorizador: {service.authorizer}</p>
        </div>
        <button type="button" className="detail-panel__close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </header>

      <div className="detail-panel__status">
        <StatusBadge state={service.state} />
        {service.xMotivo && <span className="detail-panel__motivo">{service.xMotivo}</span>}
        {service.error && <span className="detail-panel__error">{service.error}</span>}
      </div>

      <div className="detail-panel__periods">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`doc-tab${period === p ? ' doc-tab--active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {uptime !== null && (
        <p className="detail-panel__uptime">
          Disponibilidade no período: <strong>{uptime}%</strong>
        </p>
      )}

      <h3>Disponibilidade</h3>
      <UptimeBar points={points} />

      <h3>Latência</h3>
      <LatencyChart points={points} />
    </aside>
  );
}
