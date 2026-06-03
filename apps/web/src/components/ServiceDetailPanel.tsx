import { useState } from 'react';
import { X } from 'lucide-react';
import type { HistoryPeriod, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { useServiceHistory } from '../hooks/useStatus.js';
import { StatusBadge } from './StatusBadge.js';
import { UptimeBar } from './UptimeBar.js';
import { LatencyChart } from './LatencyChart.js';
import { DOC_LABEL, UF_NAME } from '../lib/labels.js';

interface ServiceDetailPanelProps {
  service: ServiceStatusDTO;
  onClose: () => void;
}

const PERIODS: HistoryPeriod[] = ['1h', '6h', '24h', '72h'];

/** Drawer com histórico de uptime e latência de um serviço. */
export function ServiceDetailPanel({ service, onClose }: ServiceDetailPanelProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const history = useServiceHistory(service.id, period);
  const points = history.data?.points ?? [];
  const operational = points.filter((p) => p.state === 'OPERATIONAL').length;
  const uptime = points.length === 0 ? null : ((operational / points.length) * 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto p-6 shadow-2xl"
        style={{ background: 'var(--surface)' }}
        aria-label={`Detalhes de ${service.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {DOC_LABEL[service.document] ?? service.document} · {service.uf}
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-dim)' }}>
              {UF_NAME[service.uf] ?? service.uf} · autorizador {service.authorizer}
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border hover:opacity-80"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <StatusBadge state={service.state} />
        {service.error && (
          <p className="text-xs" style={{ color: 'var(--down)' }}>
            {service.error}
          </p>
        )}

        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                period === p
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-dim)' }
              }
            >
              {p}
            </button>
          ))}
        </div>

        {uptime !== null && (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Disponibilidade no período: <strong style={{ color: 'var(--text)' }}>{uptime}%</strong>
          </p>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Disponibilidade</h3>
          <UptimeBar points={points} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Latência</h3>
          <LatencyChart points={points} />
        </div>
      </aside>
    </div>
  );
}
