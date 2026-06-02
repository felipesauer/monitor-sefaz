import type { Redis } from 'ioredis';
import type { EnvironmentValue, HistoryPointDTO, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import {
  PERIOD_MS,
  UPDATES_CHANNEL,
  type HistoryPeriod,
  type StatusStore,
} from './StatusStore.js';

/**
 * Implementação de `StatusStore` sobre Redis.
 *
 * Layout de chaves:
 * - `snapshot:{env}`       HASH  field=`{id}` → JSON do `ServiceStatusDTO`
 * - `hist:{env}:{id}`      ZSET  score=timestamp(ms), member=JSON compacto
 *
 * O histórico é podado a cada escrita (`ZREMRANGEBYSCORE`) para manter apenas a
 * janela de retenção configurada.
 */
export class RedisStatusStore implements StatusStore {
  constructor(
    private readonly redis: Redis,
    /** Função de tempo, injetável para testes. */
    private readonly now: () => number = () => Date.now(),
    /** Janela de retenção do histórico (ms). */
    private readonly retentionMs: number = PERIOD_MS['72h']
  ) {}

  private snapshotKey(env: EnvironmentValue): string {
    return `snapshot:${env}`;
  }

  private historyKey(env: EnvironmentValue, id: string): string {
    return `hist:${env}:${id}`;
  }

  public async saveSnapshot(env: EnvironmentValue, services: ServiceStatusDTO[]): Promise<void> {
    if (services.length === 0) {
      return;
    }
    const ts = this.now();
    const cutoff = ts - this.retentionMs;
    const pipeline = this.redis.pipeline();

    const fields: Record<string, string> = {};
    for (const service of services) {
      fields[service.id] = JSON.stringify(service);
      const point: HistoryPointDTO = {
        timestamp: new Date(ts).toISOString(),
        state: service.state,
        cStat: service.cStat,
        latencyMs: service.latencyMs,
      };
      const historyKey = this.historyKey(env, service.id);
      pipeline.zadd(historyKey, ts, JSON.stringify(point));
      pipeline.zremrangebyscore(historyKey, 0, cutoff);
      pipeline.pexpire(historyKey, this.retentionMs);
    }
    pipeline.hset(this.snapshotKey(env), fields);
    await pipeline.exec();
  }

  public async getSnapshot(env: EnvironmentValue): Promise<ServiceStatusDTO[]> {
    const all = await this.redis.hgetall(this.snapshotKey(env));
    return Object.values(all).map((raw) => JSON.parse(raw) as ServiceStatusDTO);
  }

  public async getService(env: EnvironmentValue, id: string): Promise<ServiceStatusDTO | null> {
    const raw = await this.redis.hget(this.snapshotKey(env), id);
    return raw ? (JSON.parse(raw) as ServiceStatusDTO) : null;
  }

  public async getHistory(
    env: EnvironmentValue,
    id: string,
    period: HistoryPeriod
  ): Promise<HistoryPointDTO[]> {
    const from = this.now() - PERIOD_MS[period];
    const raws = await this.redis.zrangebyscore(this.historyKey(env, id), from, '+inf');
    return raws.map((raw) => JSON.parse(raw) as HistoryPointDTO);
  }

  public async publishUpdates(env: EnvironmentValue, changed: ServiceStatusDTO[]): Promise<void> {
    if (changed.length === 0) {
      return;
    }
    await this.redis.publish(UPDATES_CHANNEL, JSON.stringify({ environment: env, services: changed }));
  }
}
