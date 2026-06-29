import {
  averageLatency,
  isUp,
  type EnvironmentValue,
  type ServiceStatusDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';

interface Bucket {
  total: number;
  operational: number;
}

function availability(bucket: Bucket): number {
  return bucket.total === 0 ? 0 : Number(((bucket.operational / bucket.total) * 100).toFixed(1));
}

/** Calcula o resumo agregado de disponibilidade a partir do snapshot. */
export class SummaryService {
  public build(env: EnvironmentValue, services: ServiceStatusDTO[], generatedAt: string): SummaryDTO {
    const total = services.length;
    const operational = services.filter((s) => isUp(s.state)).length;
    const failing = total - operational;

    const latencies = services.filter((s) => isUp(s.state)).map((s) => s.latencyMs);
    const avgLatencyMs = averageLatency(latencies);

    const byDocument = this.group(services, (s) => s.document);
    const byAuthorizer = this.group(services, (s) => s.authorizer);

    return {
      environment: env,
      generatedAt,
      total,
      operational,
      failing,
      availability: availability({ total, operational }),
      avgLatencyMs,
      byDocument,
      byAuthorizer,
    };
  }

  private group(
    services: ServiceStatusDTO[],
    keyOf: (s: ServiceStatusDTO) => string
  ): SummaryDTO['byDocument'] {
    const buckets = new Map<string, Bucket>();
    for (const service of services) {
      const key = keyOf(service);
      const bucket = buckets.get(key) ?? { total: 0, operational: 0 };
      bucket.total += 1;
      if (isUp(service.state)) {
        bucket.operational += 1;
      }
      buckets.set(key, bucket);
    }
    return [...buckets.entries()]
      .map(([key, bucket]) => ({
        key,
        total: bucket.total,
        operational: bucket.operational,
        availability: availability(bucket),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }
}
