import type { SummaryDTO } from '@monitor-sefaz/contracts';

interface SummaryCardsProps {
  summary: SummaryDTO;
}

/** Cartões com os indicadores agregados da rodada atual. */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: 'Disponibilidade', value: `${summary.availability}%` },
    { label: 'Operacionais', value: `${summary.operational}/${summary.total}` },
    { label: 'Com falha', value: String(summary.failing) },
    {
      label: 'Latência média',
      value: summary.avgLatencyMs === null ? '—' : `${summary.avgLatencyMs} ms`,
    },
  ];

  return (
    <section className="summary-cards" aria-label="Resumo de disponibilidade">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span className="summary-card__value">{card.value}</span>
          <span className="summary-card__label">{card.label}</span>
        </div>
      ))}
    </section>
  );
}
