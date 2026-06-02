import type { SummaryDTO } from '@monitor-sefaz/contracts';

interface SummaryCardsProps {
  summary: SummaryDTO;
}

/** Cartões com os indicadores agregados da rodada atual. */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { value: `${summary.availability}%`, label: 'Disponibilidade' },
    { value: `${summary.operational}/${summary.total}`, label: 'Serviços no ar' },
    { value: String(summary.failing), label: 'Com problema' },
    {
      value: summary.avgLatencyMs === null ? '—' : `${summary.avgLatencyMs} ms`,
      label: 'Tempo médio',
    },
  ];

  return (
    <section className="cards" aria-label="Resumo de disponibilidade">
      {cards.map((card) => (
        <div className="card" key={card.label}>
          <div className="card__value">{card.value}</div>
          <div className="card__label">{card.label}</div>
        </div>
      ))}
    </section>
  );
}
