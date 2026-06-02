import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';

interface UptimeBarProps {
  points: HistoryPointDTO[];
}

/**
 * Barra de uptime estilo "status page": cada ponto da série vira um segmento
 * vertical colorido pelo estado. Sem dependências de chart externas.
 */
export function UptimeBar({ points }: UptimeBarProps) {
  if (points.length === 0) {
    return <p className="empty">Sem histórico no período.</p>;
  }
  return (
    <div className="uptime-bar" role="img" aria-label="Histórico de disponibilidade">
      {points.map((point, index) => (
        <span
          key={`${point.timestamp}-${index}`}
          className="uptime-bar__segment"
          style={{ backgroundColor: STATE_META[point.state].color }}
          title={`${new Date(point.timestamp).toLocaleString('pt-BR')} — ${
            STATE_META[point.state].label
          } (${point.latencyMs}ms)`}
        />
      ))}
    </div>
  );
}
