import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { HistoryPointDTO, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';
import { DOC_LABEL, UF_NAME, formatLatency } from '../lib/labels.js';

interface ServiceCardProps {
  service: ServiceStatusDTO;
  /** Série de latência recente para o sparkline (pode vir vazia). */
  spark?: HistoryPointDTO[];
  onSelect: (service: ServiceStatusDTO) => void;
}

/**
 * Card de um serviço (documento × UF), estilo status page: sigla da UF, badge
 * animado de estado, tempo de resposta em destaque, ícone e sparkline de
 * latência. Clicável para abrir o detalhe.
 */
export function ServiceCard({ service, spark = [], onSelect }: ServiceCardProps) {
  const meta = STATE_META[service.state];
  const Icon = meta.icon;
  const ufName = UF_NAME[service.uf] ?? service.uf;
  const sparkData = spark
    .filter((p) => p.latencyMs > 0)
    .map((p, i) => ({ i, v: p.latencyMs }));
  // Latência exibida = último ponto da MESMA série do gráfico (history.json),
  // para o card e o gráfico de detalhe não divergirem. Sem série, cai para o
  // snapshot ao vivo. É o tempo de acesso à página da SEFAZ (não o tempo do
  // serviço — a SEFAZ não publica essa métrica).
  const lastSparkLatency = sparkData.at(-1)?.v;
  const latency = formatLatency(lastSparkLatency ?? service.latencyMs);

  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="group animate-fade-in relative flex flex-col gap-4 overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
      title={`${DOC_LABEL[service.document] ?? service.document} · ${ufName} (${service.authorizer})`}
    >
      {/* faixa lateral colorida pelo estado */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 transition-all duration-300 group-hover:w-1.5"
        style={{ background: meta.color }}
      />

      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight">{service.uf}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
            >
              {service.authorizer}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-dim)' }}>
            {ufName} · {DOC_LABEL[service.document] ?? service.document}
          </p>
        </div>

        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium"
          style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
        >
          {service.state === 'OPERATIONAL' && (
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: meta.color, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: meta.color }} />
            </span>
          )}
          {meta.label}
        </span>
      </header>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p
            className="cursor-help text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--text-dim)' }}
            title="Tempo para acessar a página de disponibilidade do autorizador na SEFAZ. Não é o tempo de processar uma nota — a SEFAZ não publica essa métrica."
          >
            Tempo de acesso
          </p>
          <div className="font-mono text-3xl font-bold tracking-tighter">
            {latency.value}
            {latency.unit && (
              <span className="ml-1 text-sm font-normal" style={{ color: 'var(--text-dim)' }}>
                {latency.unit}
              </span>
            )}
          </div>
        </div>
        <Icon
          className="h-8 w-8 shrink-0 opacity-20 transition-opacity duration-300 group-hover:opacity-90"
          style={{ color: meta.color }}
        />
      </div>

      <div className="h-[44px] w-full">
        {sparkData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={meta.color}
                strokeWidth={2}
                fill={`url(#spark-${service.id})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full items-center justify-center text-[10px]"
            style={{ color: 'var(--text-dim)' }}
          >
            histórico insuficiente
          </div>
        )}
      </div>
    </button>
  );
}
