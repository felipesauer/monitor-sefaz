import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { STATE_META, STATE_SEVERITY } from './serviceState.js';

interface ServiceListProps {
  services: ServiceStatusDTO[];
  onSelect: (service: ServiceStatusDTO) => void;
}

const DOC_LABEL: Record<string, string> = {
  NFe: 'NF-e',
  NFCe: 'NFC-e',
  CTe: 'CT-e',
  MDFe: 'MDF-e',
  DCe: 'DC-e',
};

/**
 * Lista de status no estilo "status page": serviços agrupados por documento,
 * uma linha por UF, com bolinha de estado, autorizador e latência. Clicar numa
 * linha abre o detalhe.
 */
export function ServiceList({ services, onSelect }: ServiceListProps) {
  if (services.length === 0) {
    return <p className="muted">Nenhum dado disponível ainda. Aguardando a primeira coleta…</p>;
  }

  const documents = [...new Set(services.map((s) => s.document))].sort(
    (a, b) => Object.keys(DOC_LABEL).indexOf(a) - Object.keys(DOC_LABEL).indexOf(b)
  );

  return (
    <>
      {documents.map((doc) => {
        const rows = services
          .filter((s) => s.document === doc)
          .sort((a, b) => a.uf.localeCompare(b.uf));
        const ok = rows.filter((r) => r.state === 'OPERATIONAL').length;
        const worst = rows.reduce(
          (acc, r) => (STATE_SEVERITY[r.state] > STATE_SEVERITY[acc] ? r.state : acc),
          'OPERATIONAL' as ServiceStatusDTO['state']
        );

        return (
          <section className="group" key={doc}>
            <header className="group__head">
              <span className="group__title">
                <span
                  className="row__dot"
                  style={{ background: STATE_META[worst].color, display: 'inline-block', marginRight: 8 }}
                />
                {DOC_LABEL[doc] ?? doc}
              </span>
              <span className="group__meta">
                {ok}/{rows.length} no ar
              </span>
            </header>
            {rows.map((service) => {
              const meta = STATE_META[service.state];
              return (
                <div
                  className="row"
                  key={service.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(service)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect(service);
                  }}
                >
                  <span className="row__dot" style={{ background: meta.color }} />
                  <span className="row__uf">{service.uf}</span>
                  <span className="row__authorizer" title="Autorizador responsável">
                    {service.authorizer}
                  </span>
                  <span className="row__spacer" />
                  <span className="row__state" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="row__latency">
                    {service.latencyMs > 0 ? `${service.latencyMs} ms` : '—'}
                  </span>
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
