import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Info, LifeBuoy, Users, X } from 'lucide-react';
import type { UF } from '@monitor-sefaz/catalog';
import {
  DocumentType,
  type HistoryPeriod,
  type ServiceStateValue,
  type ServiceStatusDTO,
} from '@monitor-sefaz/contracts';
import { useDetails, useServiceHistory } from '../hooks/useStatus.js';
import { useModalDialog } from '../hooks/useModalDialog.js';
import { AuthorizerOperations } from './AuthorizerOperations.js';
import { UptimeBar } from './UptimeBar.js';
import { LatencyChart } from './LatencyChart.js';
import { STATE_META, stateTextColor } from './serviceState.js';
import { detailFor, operationLabel, type ServiceDetailView } from '../lib/details.js';
import {
  authorizerLabel,
  AUTHORIZER_NAME,
  DOC_DESCRIPTION,
  DOC_LABEL,
  formatLatency,
  ofUf,
  UF_NAME,
} from '../lib/labels.js';
import { computeUptime, maxGapMs } from '../lib/uptime.js';
import { nfeContingency, ufsSharingAuthorizer } from '../lib/ufFacts.js';
import { pageHref } from '../lib/pages.js';

interface ServiceDetailPanelProps {
  service: ServiceStatusDTO;
  onClose: () => void;
}

// A coleta roda a cada 5 minutos: 6h já rendem ~72 pontos. '1h' fica de fora
// (~12 pontos), pouco para o uptime dizer alguma coisa.
const PERIODS: HistoryPeriod[] = ['6h', '24h', '72h'];
const SVRS_DERIVED = new Set<string>([DocumentType.MDFe, DocumentType.DCe]);

const SOURCE_LABEL: Record<string, string> = {
  svrs: 'portal do SVRS',
  availability: 'portal da Receita',
  integranotas: 'IntegraNotas',
};

/** "há 3 min", "há 2 h": quanto tempo faz que o monitor leu o serviço. */
function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (Number.isNaN(min)) return '';
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  return `há ${Math.round(min / 60)} h`;
}

/** Duração legível de um buraco de coleta. */
function duration(ms: number): string {
  const min = Math.round(ms / 60_000);
  return min < 90 ? `${min} min` : `${Math.round(min / 60)} h`;
}

/** A frase do destaque: o que o estado quer dizer para quem precisa emitir. */
function headline(state: ServiceStateValue, view: ServiceDetailView): string {
  const down = view.primary?.operations.filter((o) => o.state !== 'OPERATIONAL') ?? [];
  if (state === 'OPERATIONAL' && down.length > 0) {
    const names = down.map((o) => operationLabel(o.operation)).join(', ');
    return `O status responde, mas ${names} ${down.length > 1 ? 'estão' : 'está'} fora do ar no autorizador.`;
  }
  switch (state) {
    case 'OPERATIONAL':
      return view.primary
        ? `Respondendo normalmente. As ${view.primary.operations.length} operações do autorizador estão no ar.`
        : 'Respondendo normalmente.';
    case 'CONTINGENCY':
      return 'Operando pela contingência (SVC). Ainda dá para emitir.';
    case 'SLOWDOWN':
      return 'Instável: lentidão ou paralisação momentânea. Costuma passar rápido.';
    case 'DOWN':
      return 'Fora do ar. Veja abaixo para onde vai a emissão em contingência.';
    default:
      return 'Sem leitura agora: a fonte não respondeu nesta rodada.';
  }
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-0.5 rounded-xl p-3"
      style={{ background: 'var(--surface-2)' }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-dim)' }}
      >
        {label}
      </span>
      <span className="truncate font-mono text-xl font-bold tabular-nums">{value}</span>
      {hint && (
        <span className="truncate text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Painel de um serviço (documento × UF), aberto ao clicar no card: o estado
 * agora e o que ele quer dizer, os números da janela, o histórico, as operações
 * do autorizador, a contingência e quem cai junto. No celular sobe como folha
 * de baixo; no desktop, gaveta à direita.
 */
export function ServiceDetailPanel({ service, onClose }: ServiceDetailPanelProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const history = useServiceHistory(service.id, period);
  const points = history.data?.points ?? [];
  const stats = computeUptime(points, period);
  const details = useDetails();
  const view = detailFor(details.data, service);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useModalDialog(panelRef, closeRef, onClose);

  const uf = service.uf as UF;
  const ufName = UF_NAME[uf] ?? uf;
  const docLabel = DOC_LABEL[service.document] ?? service.document;
  const meta = STATE_META[service.state];
  const Icon = meta.icon;
  const own = service.authorizer === uf;
  const lastLatency = points.at(-1)?.latencyMs ?? service.latencyMs;
  const latency = formatLatency(lastLatency);
  const sharing = ufsSharingAuthorizer(service.document as DocumentType, uf);
  const svc = service.document === DocumentType.NFe ? nfeContingency(uf) : null;
  const svcDetail = svc ? view.contingency.find((d) => d.authorizer === svc) : undefined;
  const svcState: ServiceStateValue | null = svcDetail
    ? svcDetail.operations.some((o) => o.state === 'DOWN')
      ? 'DOWN'
      : svcDetail.operations.every((o) => o.state === 'OPERATIONAL')
        ? 'OPERATIONAL'
        : 'SLOWDOWN'
    : null;
  const ufHref = pageHref({ kind: 'uf', uf });

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-end bg-black/40 backdrop-blur-sm sm:items-stretch"
      onClick={onClose}
      role="presentation"
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-[92dvh] w-full flex-col overflow-y-auto rounded-t-2xl shadow-2xl outline-none sm:h-full sm:max-w-xl sm:rounded-none"
        style={{ background: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="sticky top-0 z-10 flex items-center gap-3 border-b px-5 py-4 sm:px-6"
          style={{ background: 'var(--surface)' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}flags/${uf.toLowerCase()}.png`}
            alt={`Bandeira de ${ufName}`}
            width={40}
            height={28}
            className="h-7 w-10 shrink-0 rounded object-cover"
            style={{ boxShadow: '0 0 0 1px var(--border)' }}
          />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-bold leading-tight">
              {docLabel} · {ufName}
            </h2>
            <p className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>
              {authorizerLabel(service.authorizer)} ·{' '}
              {own
                ? 'autorizador próprio do estado'
                : (AUTHORIZER_NAME[service.authorizer] ?? 'autorizador')}
            </p>
          </div>
          <a
            href={ufHref}
            className="hidden h-9 shrink-0 items-center gap-1 rounded-lg border px-3 text-xs font-semibold hover:opacity-80 sm:inline-flex"
          >
            Página da {`SEFAZ-${uf}`}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button
            ref={closeRef}
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border hover:opacity-80"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div
          className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border p-4 sm:mx-6"
          role="status"
          style={{
            background: `color-mix(in srgb, ${meta.color} 10%, var(--surface))`,
            borderColor: `color-mix(in srgb, ${meta.color} 40%, var(--border))`,
          }}
        >
          <Icon
            className="mt-0.5 h-7 w-7 shrink-0"
            style={{ color: meta.color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <strong className="text-base" style={{ color: stateTextColor(meta.color) }}>
                {meta.label}
              </strong>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                lido {ago(service.checkedAt)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{headline(service.state, view)}</p>
            {service.error && (
              <p className="mt-1 text-xs" style={{ color: stateTextColor('var(--down)') }}>
                {service.error}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 py-5 sm:px-6">
          <Stat
            label={`Disponível · ${period}`}
            value={stats.uptime !== null ? `${stats.uptime}%` : '—'}
            hint={stats.points ? `${stats.points} leituras` : 'sem leituras'}
          />
          <Stat
            label="Tempo de acesso"
            value={
              <>
                {latency.value}
                {latency.unit && <span className="ml-1 text-xs font-normal">{latency.unit}</span>}
              </>
            }
            hint="última leitura"
          />
          <Stat
            label="Aferido às"
            value={service.sourceCheckedAt ? service.sourceCheckedAt.slice(0, 5) : '—'}
            hint={SOURCE_LABEL[service.source ?? ''] ?? 'fonte pública'}
          />
        </div>

        {SVRS_DERIVED.has(service.document) && (
          <p
            className="mx-5 mb-5 flex gap-2 rounded-xl p-3 text-xs sm:mx-6"
            style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {docLabel} é centralizado no SVRS: este estado <strong>reflete o do SVRS</strong>, não
              é uma medição própria de {ufName}.
            </span>
          </p>
        )}

        <Section
          title="Histórico"
          action={
            <div
              className="flex gap-1 rounded-lg p-0.5"
              style={{ background: 'var(--surface-2)' }}
              role="group"
              aria-label="Período"
            >
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                  className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                  style={
                    period === p
                      ? {
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          boxShadow: 'var(--shadow)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <UptimeBar points={points} period={period} />
          {stats.lowCoverage && points.length > 0 && (
            <p className="flex gap-1.5 text-xs" style={{ color: stateTextColor('var(--slow)') }}>
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Houve um intervalo de {duration(maxGapMs(points))} sem leitura: uma instabilidade
              nessa janela pode não ter sido registrada.
            </p>
          )}
          <div>
            <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
              Tempo de acesso à página da fonte
            </p>
            <LatencyChart points={points} />
          </div>
        </Section>

        {(view.primary || view.homologation) && (
          <Section title="Operações do autorizador">
            <AuthorizerOperations
              view={{ ...view, contingency: [] }}
              generatedAt={details.data?.generatedAt}
              hideTitle
            />
          </Section>
        )}

        <Section title="Se cair" icon={<LifeBuoy className="h-4 w-4" aria-hidden="true" />}>
          {svc ? (
            <div
              className="flex items-center justify-between gap-3 rounded-xl p-3"
              style={{ background: 'var(--surface-2)' }}
            >
              <div className="min-w-0 text-sm">
                <strong>Contingência {authorizerLabel(svc)}</strong>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  Para onde vai a NF-e {ofUf(uf)} quando a SEFAZ ativa a contingência.
                </p>
              </div>
              {svcState && (
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${STATE_META[svcState].color} 14%, transparent)`,
                    color: stateTextColor(STATE_META[svcState].color),
                  }}
                >
                  {STATE_META[svcState].label}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Sem contingência SVC mapeada para {docLabel}. A emissão em contingência segue o manual
              do documento (offline ou EPEC, conforme o caso).
            </p>
          )}
          <a
            href={`${ufHref}#o-que-fazer`}
            className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2"
            style={{ color: 'var(--link)' }}
          >
            O que fazer quando a SEFAZ-{uf} cai
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Section>

        {sharing.length > 0 && (
          <Section title="Quem cai junto" icon={<Users className="h-4 w-4" aria-hidden="true" />}>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              O {authorizerLabel(service.authorizer)} autoriza o {docLabel} de mais {sharing.length}{' '}
              {sharing.length > 1 ? 'estados' : 'estado'}. Se ele cair, todos caem juntos.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {sharing.map((other) => (
                <li key={other}>
                  <a
                    href={pageHref({ kind: 'uf', uf: other })}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold hover:opacity-80"
                    title={UF_NAME[other]}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}flags/${other.toLowerCase()}.png`}
                      alt=""
                      width={16}
                      height={11}
                      loading="lazy"
                      className="h-[11px] w-4 rounded-[2px] object-cover"
                    />
                    {other}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {DOC_DESCRIPTION[service.document] && (
          <Section title={`Sobre o ${docLabel}`}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {DOC_DESCRIPTION[service.document]}
            </p>
          </Section>
        )}
      </aside>
    </div>
  );
}
