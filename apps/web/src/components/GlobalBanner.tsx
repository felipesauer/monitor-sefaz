import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ServiceStatusDTO, SummaryDTO } from '@monitor-sefaz/contracts';
import { DOC_LABEL } from '../lib/labels.js';

interface GlobalBannerProps {
  summary: SummaryDTO;
  /** Snapshot atual — usado para listar quais serviços estão com problema. */
  services?: ServiceStatusDTO[];
}

/** Banner com a "saúde geral" do sistema, no topo da status page. */
export function GlobalBanner({ summary, services = [] }: GlobalBannerProps) {
  const allOk = summary.failing === 0;
  const majority = summary.availability >= 80;

  const { color, title, Icon } = allOk
    ? { color: 'var(--ok)', title: 'Todos os serviços operacionais', Icon: CheckCircle2 }
    : majority
      ? {
          color: 'var(--slow)',
          title: 'Operação parcial — alguns serviços com problema',
          Icon: AlertTriangle,
        }
      : { color: 'var(--down)', title: 'Instabilidade generalizada', Icon: XCircle };

  // Lista resumida dos afetados agora (didático, como o monitorsefaz).
  const affected = services
    .filter((s) => s.state !== 'OPERATIONAL')
    .map((s) => `${DOC_LABEL[s.document] ?? s.document}/${s.uf}`);
  const affectedLabel =
    affected.length > 0
      ? affected.slice(0, 8).join(', ') + (affected.length > 8 ? ` +${affected.length - 8}` : '')
      : null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-4"
      role="status"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${color} 40%, var(--border))`,
      }}
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <strong className="block text-sm font-semibold">{title}</strong>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {summary.operational} de {summary.total} serviços no ar · {summary.availability}% de
          disponibilidade
        </span>
        {affectedLabel && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            Com problema agora: <span style={{ color }}>{affectedLabel}</span>. O histórico é
            amostrado periodicamente — instabilidades curtas podem não constar nos gráficos.
          </p>
        )}
      </div>
    </div>
  );
}
