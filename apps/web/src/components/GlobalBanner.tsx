import type { SummaryDTO } from '@monitor-sefaz/contracts';

interface GlobalBannerProps {
  summary: SummaryDTO;
}

/** Banner com a "saúde geral" do sistema, no topo da status page. */
export function GlobalBanner({ summary }: GlobalBannerProps) {
  const allOk = summary.failing === 0;
  const majority = summary.availability >= 80;

  const { color, title } = allOk
    ? { color: 'var(--ok)', title: 'Todos os serviços operacionais' }
    : majority
      ? { color: 'var(--slow)', title: 'Operação parcial — alguns serviços com problema' }
      : { color: 'var(--down)', title: 'Instabilidade generalizada' };

  return (
    <div className="banner" role="status">
      <span className="banner__dot" style={{ background: color, color }} />
      <div className="banner__text">
        <strong>{title}</strong>
        <span>
          {summary.operational} de {summary.total} serviços no ar · {summary.availability}% de
          disponibilidade
        </span>
      </div>
    </div>
  );
}
