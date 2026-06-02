import { useState } from 'react';
import type { HistoryPeriod, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { useServiceHistory } from '../hooks/useStatus.js';
import { StatusBadge } from './StatusBadge.js';
import { UptimeBar } from './UptimeBar.js';
import { LatencyChart } from './LatencyChart.js';

interface ServiceDetailPanelProps {
  service: ServiceStatusDTO;
  onClose: () => void;
}

const PERIODS: HistoryPeriod[] = ['1h', '6h', '24h', '72h'];
const DOC_LABEL: Record<string, string> = {
  NFe: 'NF-e',
  NFCe: 'NFC-e',
  CTe: 'CT-e',
  MDFe: 'MDF-e',
  DCe: 'DC-e',
};

/** Drawer com histórico de uptime e latência de um serviço. */
export function ServiceDetailPanel({ service, onClose }: ServiceDetailPanelProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const history = useServiceHistory(service.id, period);
  const points = history.data?.points ?? [];
  const operational = points.filter((p) => p.state === 'OPERATIONAL').length;
  const uptime = points.length === 0 ? null : ((operational / points.length) * 100).toFixed(1);

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <aside
        className="drawer"
        aria-label={`Detalhes de ${service.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer__head">
          <div>
            <h2>
              {DOC_LABEL[service.document] ?? service.document} · {service.uf}
            </h2>
            <p className="drawer__sub">Autorizador: {service.authorizer}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <StatusBadge state={service.state} />

        <h3>Período</h3>
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`tab${period === p ? ' tab--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {uptime !== null && (
          <p className="drawer__sub" style={{ marginTop: '0.75rem' }}>
            Disponibilidade no período: <strong>{uptime}%</strong>
          </p>
        )}

        <h3>Disponibilidade</h3>
        <UptimeBar points={points} />

        <h3>Latência</h3>
        <LatencyChart points={points} />
      </aside>
    </div>
  );
}
