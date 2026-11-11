import { CircleDashed } from 'lucide-react';
import type { HistoryPointDTO, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Sparkline } from './Sparkline.js';
import { STATE_META, stateTextColor } from './serviceState.js';
import { DOC_LABEL, UF_NAME, formatLatency } from '../lib/labels.js';

interface ServiceCardProps {
  service: ServiceStatusDTO;
  /** Série de latência recente para o sparkline (pode vir vazia). */
  spark?: HistoryPointDTO[];
  onSelect: (service: ServiceStatusDTO) => void;
}

/** Classes do card, compartilhadas com o card de espera para os dois terem a mesma altura. */
const CARD_CLASS =
  'group animate-fade-in relative flex flex-col gap-4 overflow-hidden rounded-xl border p-5 text-left transition-all duration-300';
const CARD_STYLE = { background: 'var(--surface)', boxShadow: 'var(--shadow)' } as const;
const LINE_CLASS = 'mt-1 text-[10px]';
const SPARK_CLASS = 'h-[44px] w-full';

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
    // tMed=0 é valor legítimo (ver LatencyChart): incluímos os zeros.
    .filter((p) => p.latencyMs >= 0)
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
      className={`${CARD_CLASS} hover:-translate-y-0.5`}
      style={CARD_STYLE}
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
          style={{
            background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
            color: stateTextColor(meta.color),
          }}
        >
          {service.state === 'OPERATIONAL' && (
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{
                  background: meta.color,
                  animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: meta.color }}
              />
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
          {service.sourceCheckedAt ? (
            <p
              className={`${LINE_CLASS} cursor-help`}
              style={{ color: 'var(--text-dim)' }}
              title="Horário em que o próprio autorizador (SVRS) verificou o serviço — o frescor do dado oficial."
            >
              ✓ aferido pela SEFAZ às {service.sourceCheckedAt.slice(0, 5)}
            </p>
          ) : (
            // A linha fica reservada mesmo sem horário: todos os cards (e o de
            // espera do pré-render) ficam da mesma altura, e a grade não pula.
            <p className={LINE_CLASS} aria-hidden="true">
              {'\u00a0'}
            </p>
          )}
        </div>
        <Icon
          className="h-8 w-8 shrink-0 opacity-20 transition-opacity duration-300 group-hover:opacity-90"
          style={{ color: meta.color }}
        />
      </div>

      <div className={SPARK_CLASS}>
        {sparkData.length >= 2 ? (
          <Sparkline
            values={sparkData.map((d) => d.v)}
            color={meta.color}
            gradientId={`spark-${service.id}`}
          />
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

interface ServiceCardPlaceholderProps {
  /** `loading`: o status ainda não chegou. `no-source`: a leitura chegou sem este documento. */
  kind: 'loading' | 'no-source';
  document?: string;
  uf?: string;
  authorizer?: string;
}

/**
 * Card no lugar de um serviço que não tem leitura para mostrar: enquanto o
 * status carrega (é o que vai no HTML pré-renderizado) ou quando a leitura não
 * traz o documento naquela UF. Tem a mesma estrutura do `ServiceCard`, para a
 * grade não mudar de altura quando os dados chegam (CLS).
 */
export function ServiceCardPlaceholder({
  kind,
  document,
  uf,
  authorizer,
}: ServiceCardPlaceholderProps) {
  const loading = kind === 'loading';
  const ufName = uf ? (UF_NAME[uf] ?? uf) : null;
  const docLabel = document ? (DOC_LABEL[document] ?? document) : null;
  return (
    <div
      className={CARD_CLASS}
      style={CARD_STYLE}
      aria-busy={loading || undefined}
      title={loading ? undefined : 'A fonte pública não traz este documento no estado.'}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: 'var(--border)' }}
      />

      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight">{uf ?? '··'}</span>
            {authorizer && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
              >
                {authorizer}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-dim)' }}>
            {ufName && docLabel ? `${ufName} · ${docLabel}` : '\u00a0'}
          </p>
        </div>

        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
        >
          {loading ? 'Carregando…' : 'Sem leitura pública'}
        </span>
      </header>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
            Tempo de acesso
          </p>
          <div className="font-mono text-3xl font-bold tracking-tighter">—</div>
          <p className={LINE_CLASS} style={{ color: 'var(--text-dim)' }}>
            {loading ? '\u00a0' : 'Sem fonte pública neste estado'}
          </p>
        </div>
        <CircleDashed
          className="h-8 w-8 shrink-0 opacity-20"
          style={{ color: 'var(--text-dim)' }}
        />
      </div>

      <div className={SPARK_CLASS}>
        {loading ? (
          <div
            className="h-full w-full animate-pulse rounded"
            style={{ background: 'var(--surface-2)' }}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-[10px]"
            style={{ color: 'var(--text-dim)' }}
          >
            sem histórico
          </div>
        )}
      </div>
    </div>
  );
}
