import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import {
  statusSnapshotSchema,
  summarySchema,
  historyResponseSchema,
  uptimeResponseSchema,
  incidentSchema,
  type ServiceStatusDTO,
} from '@monitor-sefaz/contracts';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { RedisStatusStore } from '../../src/store/RedisStatusStore.js';

const services: ServiceStatusDTO[] = [
  {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'producao',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: 'ok',
    latencyMs: 100,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
  },
  {
    id: 'NFe:RS',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'RS',
    authorizer: 'RS',
    environment: 'producao',
    state: 'DOWN',
    cStat: 109,
    xMotivo: 'parado',
    latencyMs: 50,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
  },
];

describe('statusRoutes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const redis = new RedisMock() as unknown as Redis;
    const store = new RedisStatusStore(redis, () => 1_000_000);
    await store.saveSnapshot('producao', services);
    app = await buildApp({ store, now: () => 1_000_000 });
  });

  it('GET /api/v1/health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/status retorna snapshot válido conforme schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/status?env=producao' });
    expect(res.statusCode).toBe(200);
    const parsed = statusSnapshotSchema.parse(res.json());
    expect(parsed.services).toHaveLength(2);
  });

  it('GET /api/v1/status filtra por UF', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/status?uf=SP' });
    const parsed = statusSnapshotSchema.parse(res.json());
    expect(parsed.services).toHaveLength(1);
    expect(parsed.services[0]?.uf).toBe('SP');
  });

  it('GET /api/v1/summary agrega disponibilidade conforme schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/summary' });
    const parsed = summarySchema.parse(res.json());
    expect(parsed.total).toBe(2);
    expect(parsed.operational).toBe(1);
    expect(parsed.availability).toBe(50);
    expect(parsed.byDocument.find((g) => g.key === 'NFe')?.total).toBe(2);
  });

  it('GET /api/v1/services/:id/history retorna série conforme schema', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/services/NFe%3ASP/history?period=24h',
    });
    const parsed = historyResponseSchema.parse(res.json());
    expect(parsed.id).toBe('NFe:SP');
    expect(parsed.points.length).toBeGreaterThanOrEqual(1);
  });

  it('GET de serviço inexistente responde 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/status/NFe/ZZ' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/services/:id/uptime retorna uptime conforme schema', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/services/NFe%3ASP/uptime?period=24h',
    });
    const parsed = uptimeResponseSchema.parse(res.json());
    expect(parsed.id).toBe('NFe:SP');
    expect(parsed.uptime).toBe(100); // único ponto é OPERATIONAL
    expect(parsed.totalChecks).toBe(1);
  });

  it('GET /api/v1/incidents retorna lista conforme schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/incidents?period=24h' });
    const body = z.object({ period: z.string(), incidents: z.array(incidentSchema) }).parse(res.json());
    expect(Array.isArray(body.incidents)).toBe(true);
  });
});
