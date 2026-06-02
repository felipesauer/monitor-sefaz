import type { HistoryPointDTO, IncidentDTO, ServiceStateValue } from '@monitor-sefaz/contracts';

export interface UptimeStats {
  uptime: number;
  totalChecks: number;
  operationalChecks: number;
  avgLatencyMs: number | null;
}

/** "Pior" estado entre dois, para rotular um incidente. DOWN > ERROR > SLOWDOWN. */
const STATE_SEVERITY: Record<ServiceStateValue, number> = {
  OPERATIONAL: 0,
  SLOWDOWN: 1,
  ERROR: 2,
  DOWN: 3,
};

/**
 * Deriva métricas de disponibilidade e incidentes a partir da série temporal
 * de checagens. Lógica pura (sem I/O) — fácil de testar e reutilizar.
 */
export class UptimeCalculator {
  public computeUptime(points: readonly HistoryPointDTO[]): UptimeStats {
    const totalChecks = points.length;
    const operationalChecks = points.filter((p) => p.state === 'OPERATIONAL').length;
    const uptime =
      totalChecks === 0 ? 0 : Number(((operationalChecks / totalChecks) * 100).toFixed(2));

    const latencies = points.filter((p) => p.state === 'OPERATIONAL').map((p) => p.latencyMs);
    const avgLatencyMs =
      latencies.length === 0
        ? null
        : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

    return { uptime, totalChecks, operationalChecks, avgLatencyMs };
  }

  /**
   * Deriva incidentes a partir das transições da série: um incidente começa
   * quando o serviço deixa de estar operacional e termina quando volta.
   */
  public deriveIncidents(serviceId: string, points: readonly HistoryPointDTO[]): IncidentDTO[] {
    const incidents: IncidentDTO[] = [];
    // Acumulador mutável do incidente em curso (mais claro que spreads).
    let open: {
      startedAt: string;
      worstState: ServiceStateValue;
    } | null = null;

    const severityOf = (state: ServiceStateValue): number => STATE_SEVERITY[state] ?? 0;

    for (const point of points) {
      const isDown = point.state !== 'OPERATIONAL';
      if (isDown) {
        if (!open) {
          open = { startedAt: point.timestamp, worstState: point.state };
        } else if (severityOf(point.state) > severityOf(open.worstState)) {
          open.worstState = point.state;
        }
      } else if (open) {
        incidents.push({
          serviceId,
          startedAt: open.startedAt,
          endedAt: point.timestamp,
          worstState: open.worstState,
          lastMotivo: null,
        });
        open = null;
      }
    }

    if (open) {
      // incidente ainda em andamento
      incidents.push({
        serviceId,
        startedAt: open.startedAt,
        endedAt: null,
        worstState: open.worstState,
        lastMotivo: null,
      });
    }
    return incidents;
  }
}
