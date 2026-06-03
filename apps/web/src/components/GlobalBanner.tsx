import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { SummaryDTO } from '@monitor-sefaz/contracts';

interface GlobalBannerProps {
  summary: SummaryDTO;
}

/** Banner com a "saúde geral" do sistema, no topo da status page. */
export function GlobalBanner({ summary }: GlobalBannerProps) {
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

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-4"
      role="status"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${color} 40%, var(--border))`,
      }}
    >
      <Icon className="h-6 w-6 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <strong className="block text-sm font-semibold">{title}</strong>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {summary.operational} de {summary.total} serviços no ar · {summary.availability}% de
          disponibilidade
        </span>
      </div>
    </div>
  );
}
