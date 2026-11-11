import type { ReactNode } from 'react';
import { ButtonLink } from './ButtonLink.js';
import type { DocumentType, UF } from '@monitor-sefaz/catalog';
import {
  isUp,
  PERIOD_MS,
  type ServiceStateValue,
  type ServiceStatusDTO,
} from '@monitor-sefaz/contracts';
import type { HistorySeries } from '../api/DataSource.js';
import { Sparkline } from './Sparkline.js';
import { STATE_META, STATE_SEVERITY, stateTextColor } from './serviceState.js';
import { authorizerLabel, DOC_LABEL, formatLatency, UF_NAME } from '../lib/labels.js';
import { computeUptime } from '../lib/uptime.js';
import { ufAuthorizations } from '../lib/ufFacts.js';
import { pageHref } from '../lib/pages.js';

interface UfSectionsProps {
  /** Serviços já filtrados (documento e UFs). Vazio enquanto carrega. */
  services: ServiceStatusDTO[];
  /** Documentos a mostrar em cada estado, na ordem do catálogo. */
  documents: readonly DocumentType[];
  /** Estados a mostrar. */
  ufs: readonly UF[];
  series: HistorySeries;
  onSelect: (service: ServiceStatusDTO) => void;
  /** O status ainda não chegou: cards de espera no lugar de todos. */
  loading?: boolean;
  /** Uma linha por estado, com um botão por documento, em vez dos cards. */
  compact?: boolean;
  /** Botão para a página de cada UF no cabeçalho (desligado na própria página da UF). */
  linkToUf?: boolean;
  /** Nível do título de cada estado: h3 na home (sob "Por estado"), h2 na página da UF. */
  headingLevel?: 2 | 3;
}

const flagSrc = (uf: string) => `${import.meta.env.BASE_URL}flags/${uf.toLowerCase()}.png`;

interface CompactCardProps {
  title: string;
  /** Autorizador, em letra pequena sob o título. */
  chip: string;
  /** Cor do ponto, da faixa lateral e do texto do estado. */
  color: string;
  status: string;
  /** Horário da aferição, ao lado do estado. */
  detail?: string;
  latency: ReactNode;
  spark: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  hint?: string;
  /** Cor do texto do estado, quando não deve sair da cor do ponto (cards de espera). */
  textColor?: string;
}

/**
 * O card compacto de um documento dentro do grupo do estado: cabe em ~140 px
 * (8 documentos lado a lado) sem cortar texto. O card real e o de espera usam
 * esta mesma estrutura, para terem a mesma altura (CLS).
 */
function CompactCard({
  title,
  chip,
  color,
  status,
  detail,
  latency,
  spark,
  onClick,
  busy,
  hint,
  textColor,
}: CompactCardProps) {
  const body = (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold leading-tight">{title}</p>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
      </div>
      <p
        className="-mt-1 truncate text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-dim)' }}
      >
        {chip}
      </p>
      <div className="flex items-end gap-2">
        <div className="shrink-0 text-lg font-bold leading-none tabular-nums">{latency}</div>
        <div className="h-6 min-w-0 flex-1">{spark}</div>
      </div>
      <p className="truncate text-[11px] leading-tight">
        <span className="font-semibold" style={{ color: textColor ?? stateTextColor(color) }}>
          {status}
        </span>
        {detail && <span style={{ color: 'var(--text-dim)' }}> · {detail}</span>}
      </p>
    </>
  );
  const className =
    'relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border p-3 pl-4 text-left transition-all duration-200';
  const style = { background: 'var(--surface)', boxShadow: 'var(--shadow)' };
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} hover:-translate-y-0.5`}
      style={style}
      title={hint}
    >
      {body}
    </button>
  ) : (
    <div className={className} style={style} aria-busy={busy || undefined} title={hint}>
      {body}
    </div>
  );
}

function ServiceCompactCard({
  service,
  spark = [],
  onSelect,
}: {
  service: ServiceStatusDTO;
  spark?: { latencyMs: number }[];
  onSelect: (s: ServiceStatusDTO) => void;
}) {
  const meta = STATE_META[service.state];
  const values = spark.filter((p) => p.latencyMs >= 0).map((p) => p.latencyMs);
  const latency = formatLatency(values.at(-1) ?? service.latencyMs);
  const docLabel = DOC_LABEL[service.document] ?? service.document;
  return (
    <CompactCard
      title={docLabel}
      chip={authorizerLabel(service.authorizer)}
      color={meta.color}
      status={meta.label}
      detail={service.sourceCheckedAt?.slice(0, 5)}
      latency={
        <>
          {latency.value}
          {latency.unit && (
            <span className="ml-0.5 text-[11px] font-normal" style={{ color: 'var(--text-dim)' }}>
              {latency.unit}
            </span>
          )}
        </>
      }
      spark={
        values.length >= 2 ? (
          <Sparkline values={values} color={meta.color} gradientId={`uf-spark-${service.id}`} />
        ) : null
      }
      onClick={() => onSelect(service)}
      hint={`${docLabel} · ${UF_NAME[service.uf] ?? service.uf} (${service.authorizer})${service.sourceCheckedAt ? ` · aferido pela SEFAZ às ${service.sourceCheckedAt.slice(0, 5)}` : ''}`}
    />
  );
}

function PlaceholderCompactCard({
  kind,
  document,
  authorizer,
}: {
  kind: 'loading' | 'no-source';
  document: DocumentType;
  authorizer: string;
}) {
  const loading = kind === 'loading';
  return (
    <CompactCard
      title={DOC_LABEL[document] ?? document}
      chip={authorizerLabel(authorizer)}
      color="var(--border)"
      textColor="var(--text-dim)"
      status={loading ? 'Carregando…' : 'Sem leitura'}
      detail={loading ? undefined : 'sem fonte'}
      latency="—"
      spark={
        loading ? (
          <div
            className="h-full w-full animate-pulse rounded"
            style={{ background: 'var(--surface-2)' }}
          />
        ) : null
      }
      busy={loading}
      hint={loading ? undefined : 'A fonte pública não traz este documento no estado.'}
    />
  );
}

interface UfGroup {
  uf: UF;
  services: ServiceStatusDTO[];
  missing: { document: DocumentType; authorizer: string }[];
  worst: ServiceStateValue | null;
  failing: number;
  uptime: number | null;
}

/**
 * Os serviços agrupados por estado (ADR-18): uma seção por UF com a bandeira,
 * o nome, um resumo e os cards dos documentos. Estados com problema primeiro;
 * os demais em ordem alfabética do nome.
 */
export function UfSections({
  services,
  documents,
  ufs,
  series,
  onSelect,
  loading,
  compact,
  linkToUf = true,
  headingLevel = 3,
}: UfSectionsProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  // Fim da janela de 24h: a leitura mais recente das séries.
  const end = Object.values(series).reduce(
    (max, pts) => Math.max(max, Date.parse(pts.at(-1)?.timestamp ?? '') || 0),
    0
  );
  const groups: UfGroup[] = ufs.map((uf) => {
    const own = services
      .filter((s) => s.uf === uf && documents.includes(s.document as DocumentType))
      .sort(
        (a, b) =>
          documents.indexOf(a.document as DocumentType) -
          documents.indexOf(b.document as DocumentType)
      );
    const present = new Set(own.map((s) => s.document));
    const missing = ufAuthorizations(uf)
      .filter(({ document }) => documents.includes(document) && !present.has(document))
      .map(({ document, authorizer }) => ({ document, authorizer }));
    const worst = own.reduce<ServiceStateValue | null>(
      (w, s) => (!w || STATE_SEVERITY[s.state] > STATE_SEVERITY[w] ? s.state : w),
      null
    );
    const recent = own.flatMap((s) =>
      (series[s.id] ?? []).filter((p) => Date.parse(p.timestamp) >= end - PERIOD_MS['24h'])
    );
    return {
      uf,
      services: own,
      missing,
      worst,
      failing: own.filter((s) => !isUp(s.state)).length,
      uptime: recent.length ? computeUptime(recent, '24h').uptime : null,
    };
  });

  const byName = (a: UfGroup, b: UfGroup) =>
    (UF_NAME[a.uf] ?? a.uf).localeCompare(UF_NAME[b.uf] ?? b.uf, 'pt-BR');
  groups.sort((a, b) =>
    loading
      ? byName(a, b)
      : (b.worst ? STATE_SEVERITY[b.worst] : -1) - (a.worst ? STATE_SEVERITY[a.worst] : -1) ||
        byName(a, b)
  );

  if (!loading && groups.every((g) => g.services.length === 0 && g.missing.length === 0)) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Nenhum serviço corresponde aos filtros.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => {
        const name = UF_NAME[g.uf] ?? g.uf;
        const authorizers = [
          ...new Set(
            (loading
              ? ufAuthorizations(g.uf).filter((a) => documents.includes(a.document))
              : g.services
            ).map((s) => authorizerLabel(s.authorizer))
          ),
        ].join(', ');
        const summaryState: ServiceStateValue =
          g.failing > 0 ? (g.worst ?? 'ERROR') : 'OPERATIONAL';
        const summary = loading
          ? 'Carregando…'
          : g.failing > 0
            ? `${g.failing} com problema`
            : g.services.length > 0
              ? 'Tudo no ar'
              : 'Sem leitura';
        const color = loading ? 'var(--text-dim)' : STATE_META[summaryState].color;
        return (
          <section
            key={g.uf}
            id={`uf-${g.uf}`}
            aria-labelledby={`uf-${g.uf}-title`}
            className="scroll-mt-24"
          >
            <header className="mb-2 flex items-center gap-3">
              <img
                src={flagSrc(g.uf)}
                alt={`Bandeira de ${name}`}
                width={36}
                height={25}
                loading="lazy"
                className="h-[25px] w-9 shrink-0 rounded object-cover"
                style={{ boxShadow: '0 0 0 1px var(--border)' }}
              />
              <div className="min-w-0 flex-1">
                <Heading
                  id={`uf-${g.uf}-title`}
                  className="truncate text-base font-bold leading-tight"
                >
                  {name}
                </Heading>
                <p className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>
                  {g.uf} · {authorizers}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={
                  loading
                    ? { background: 'var(--surface-2)', color: 'var(--text-dim)' }
                    : {
                        background: `color-mix(in srgb, ${color} 14%, transparent)`,
                        color: stateTextColor(color),
                      }
                }
              >
                {summary}
              </span>
              {!loading && g.uptime !== null && (
                <span
                  className="hidden shrink-0 text-xs tabular-nums sm:inline"
                  style={{ color: 'var(--text-dim)' }}
                  title="Disponibilidade dos documentos do estado nas últimas 24 horas"
                >
                  {g.uptime}% · 24h
                </span>
              )}
              {linkToUf && (
                <ButtonLink
                  href={pageHref({ kind: 'uf', uf: g.uf })}
                  arrow
                  className="hidden sm:inline-flex"
                >
                  SEFAZ-{g.uf}
                </ButtonLink>
              )}
            </header>
            {compact && !loading ? (
              <ul className="flex flex-wrap gap-1.5">
                {g.services.map((sv) => {
                  const meta = STATE_META[sv.state];
                  return (
                    <li key={sv.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(sv)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors hover:brightness-95"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        title={`${DOC_LABEL[sv.document] ?? sv.document}: ${meta.label}`}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: meta.color }}
                          aria-hidden="true"
                        />
                        {DOC_LABEL[sv.document] ?? sv.document}
                        <span className="font-normal" style={{ color: stateTextColor(meta.color) }}>
                          {meta.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {g.missing.map((m) => (
                  <li key={m.document}>
                    <span
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                      title="A fonte pública não traz este documento no estado."
                    >
                      {DOC_LABEL[m.document] ?? m.document}
                      <span className="font-normal">sem leitura</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
                style={{ '--cols': documents.length } as React.CSSProperties}
              >
                {loading
                  ? ufAuthorizations(g.uf)
                      .filter((a) => documents.includes(a.document))
                      .map((a) => (
                        <PlaceholderCompactCard
                          key={a.document}
                          kind="loading"
                          document={a.document}
                          authorizer={a.authorizer}
                        />
                      ))
                  : [
                      ...g.services.map((s) => (
                        <ServiceCompactCard
                          key={s.id}
                          service={s}
                          spark={series[s.id]}
                          onSelect={onSelect}
                        />
                      )),
                      ...g.missing.map((m) => (
                        <PlaceholderCompactCard
                          key={m.document}
                          kind="no-source"
                          document={m.document}
                          authorizer={m.authorizer}
                        />
                      )),
                    ]}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
