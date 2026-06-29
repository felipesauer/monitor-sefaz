import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { DocumentType, type HistoryPeriod, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { useServiceHistory } from '../hooks/useStatus.js';
import { StatusBadge } from './StatusBadge.js';
import { UptimeBar } from './UptimeBar.js';
import { LatencyChart } from './LatencyChart.js';
import { DOC_LABEL, DOC_DESCRIPTION, UF_NAME } from '../lib/labels.js';
import { computeUptime, maxGapMs } from '../lib/uptime.js';

interface ServiceDetailPanelProps {
  service: ServiceStatusDTO;
  onClose: () => void;
}

// '1h' e '6h' foram omitidos: com a cadência real de coleta (~3h/ponto), essas
// janelas rendem 0–2 amostras — o gráfico fica vazio e o uptime sai sobre uma
// amostra única. Mantemos só janelas com densidade de pontos significativa.
const PERIODS: HistoryPeriod[] = ['24h', '72h'];
const SVRS_DERIVED = new Set<string>([DocumentType.MDFe, DocumentType.DCe]);

/** Drawer com histórico de uptime e latência de um serviço. */
export function ServiceDetailPanel({ service, onClose }: ServiceDetailPanelProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const history = useServiceHistory(service.id, period);
  const points = history.data?.points ?? [];
  const stats = computeUptime(points, period);
  const maxGapHours = Math.round(maxGapMs(points) / (60 * 60 * 1000));
  const isDerived = SVRS_DERIVED.has(service.document);

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
            {DOC_DESCRIPTION[service.document] && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                {DOC_DESCRIPTION[service.document]}
              </p>
            )}
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

        {isDerived && (
          <div
            className="flex gap-2 rounded-lg border p-3 text-xs"
            style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              MDF-e e DC-e são centralizados no ambiente nacional (SVRS). Este status
              <strong> reflete o do autorizador SVRS</strong> — não é uma medição independente
              por estado.
            </span>
          </div>
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

        {stats.uptime !== null && (
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
            <p>
              Disponibilidade no período:{' '}
              <strong style={{ color: 'var(--text)' }}>{stats.uptime}%</strong>{' '}
              <span className="text-xs">
                ({stats.points} de ~{stats.expectedPoints} leituras esperadas)
              </span>
            </p>
            {stats.lowCoverage && (
              <p className="mt-1 flex gap-1.5 text-xs" style={{ color: 'var(--slow)' }}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Houve um intervalo de ~{maxGapHours}h sem leitura — instabilidades nessa janela
                podem não ter sido registradas.
              </p>
            )}
          </div>
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
