import { Activity, CheckCircle2, Gauge, XCircle } from 'lucide-react';
import type { SummaryDTO } from '@monitor-sefaz/contracts';
import { formatLatency } from '../lib/labels.js';

interface SummaryCardsProps {
  summary: SummaryDTO;
}

/** Cartões de métricas agregadas (exibidos no modo "Painel + métricas"). */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const avg = formatLatency(summary.avgLatencyMs ?? 0);
  const cards = [
    {
      label: 'Disponibilidade',
      value: `${summary.availability}%`,
      icon: Gauge,
      color: 'var(--accent)',
    },
    {
      label: 'Serviços no ar',
      value: `${summary.operational}/${summary.total}`,
      icon: CheckCircle2,
      color: 'var(--ok)',
    },
    {
      label: 'Com problema',
      value: String(summary.failing),
      icon: XCircle,
      color: summary.failing > 0 ? 'var(--down)' : 'var(--text-dim)',
    },
    {
      label: 'Tempo médio',
      value: avg.value === '—' ? '—' : `${avg.value} ${avg.unit}`,
      icon: Activity,
      color: 'var(--slow)',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Métricas">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-xl border p-4"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${card.color} 14%, transparent)`, color: card.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-xl font-bold leading-tight">{card.value}</div>
              <div className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>
                {card.label}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
