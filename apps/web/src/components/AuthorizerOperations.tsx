import type { AuthorizerDetailDTO } from '@monitor-sefaz/contracts';
import { STATE_META, stateTextColor } from './serviceState.js';
import { authorizerLabel } from '../lib/labels.js';
import {
  DETAIL_SOURCE_LABEL,
  isEmptyDetail,
  operationLabel,
  type ServiceDetailView,
} from '../lib/details.js';

interface AuthorizerOperationsProps {
  view: ServiceDetailView;
  /** Quando a coleta leu as páginas (o `generatedAt` do details.json). */
  generatedAt?: string;
}

function OperationList({ detail }: { detail: AuthorizerDetailDTO }) {
  return (
    <ul className="flex flex-col gap-1">
      {detail.operations.map((op) => {
        const meta = STATE_META[op.state];
        return (
          <li
            key={op.operation}
            className="flex items-center justify-between gap-3 text-sm"
            title={op.cStat !== null ? `cStat ${op.cStat} na aferição da fonte` : undefined}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: meta.color }}
                aria-hidden="true"
              />
              <span className="truncate">{operationLabel(op.operation)}</span>
            </span>
            <span className="shrink-0 text-xs" style={{ color: stateTextColor(meta.color) }}>
              {meta.label}
              {op.sourceCheckedAt && (
                <span style={{ color: 'var(--text-dim)' }}> · {op.sourceCheckedAt}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SourceLine({ detail }: { detail: AuthorizerDetailDTO }) {
  const others = detail.ufs.length > 1 ? ` · atende ${detail.ufs.length} UFs` : '';
  return (
    <p className="mb-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
      {authorizerLabel(detail.authorizer)} · {DETAIL_SOURCE_LABEL[detail.source] ?? detail.source}
      {others}
    </p>
  );
}

/**
 * Estado de cada operação (autorização, consulta, evento…) do autorizador do
 * serviço, como a fonte oficial publica. O cabeçalho do painel continua sendo o
 * "Status Serviço"; aqui aparece o que ele não conta, como a autorização fora do
 * ar com o status respondendo.
 */
export function AuthorizerOperations({ view, generatedAt }: AuthorizerOperationsProps) {
  if (isEmptyDetail(view)) return null;
  const readAt = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <section aria-label="Serviços do autorizador" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">Serviços do autorizador</h3>
        {readAt && (
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Lido nas páginas oficiais às {readAt}
          </p>
        )}
      </div>

      {view.primary && (
        <div>
          <SourceLine detail={view.primary} />
          <OperationList detail={view.primary} />
        </div>
      )}

      {view.contingency.map((detail) => (
        <div key={detail.authorizer}>
          <h4 className="text-xs font-semibold">Contingência</h4>
          <SourceLine detail={detail} />
          <OperationList detail={detail} />
        </div>
      ))}

      {view.homologation && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold">
            Homologação (ambiente de testes)
          </summary>
          <div className="mt-2">
            <SourceLine detail={view.homologation} />
            <OperationList detail={view.homologation} />
          </div>
        </details>
      )}
    </section>
  );
}
