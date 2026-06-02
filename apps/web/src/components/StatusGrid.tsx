import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';

interface StatusGridProps {
  services: ServiceStatusDTO[];
}

/**
 * Grade de status no estilo "status page": uma linha por UF, uma coluna por
 * documento, cada célula colorida pelo estado do serviço.
 */
export function StatusGrid({ services }: StatusGridProps) {
  const ufs = [...new Set(services.map((s) => s.uf))].sort();
  const documents = [...new Set(services.map((s) => s.document))].sort();
  const byKey = new Map(services.map((s) => [`${s.document}:${s.uf}`, s]));

  if (services.length === 0) {
    return <p className="empty">Nenhum dado disponível ainda. Aguardando a primeira rodada…</p>;
  }

  return (
    <table className="status-grid" aria-label="Status por UF e documento">
      <thead>
        <tr>
          <th scope="col">UF</th>
          {documents.map((doc) => (
            <th scope="col" key={doc}>
              {doc}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ufs.map((uf) => (
          <tr key={uf}>
            <th scope="row">{uf}</th>
            {documents.map((doc) => {
              const service = byKey.get(`${doc}:${uf}`);
              if (!service) {
                return (
                  <td key={doc} className="status-cell status-cell--empty">
                    —
                  </td>
                );
              }
              const meta = STATE_META[service.state];
              return (
                <td
                  key={doc}
                  className="status-cell"
                  style={{ backgroundColor: meta.color }}
                  title={`${doc} ${uf} (${service.authorizer}) — ${meta.label}${
                    service.error ? `: ${service.error}` : ''
                  } — ${service.latencyMs}ms`}
                >
                  <span className="status-cell__authorizer">{service.authorizer}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
