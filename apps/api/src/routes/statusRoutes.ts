import type { FastifyInstance } from 'fastify';
import {
  DocumentType,
  historyQuerySchema,
  statusQuerySchema,
  type EnvironmentValue,
} from '@monitor-sefaz/contracts';
import type { StatusStore } from '../store/StatusStore.js';
import { SummaryService } from '../services/SummaryService.js';
import { UptimeCalculator } from '../services/UptimeCalculator.js';

/**
 * Resolve o parâmetro de documento da rota para o valor canônico do enum
 * (case-insensitive): "nfe"/"NFE" → `DocumentType.NFe`. Retorna `undefined` se
 * não corresponder a nenhum documento conhecido.
 */
function normalizeDocument(raw: string): DocumentType | undefined {
  const lower = raw.toLowerCase();
  return Object.values(DocumentType).find((d) => d.toLowerCase() === lower);
}

export interface StatusRoutesDeps {
  readonly store: StatusStore;
  readonly summaryService: SummaryService;
  readonly uptimeCalculator: UptimeCalculator;
  readonly now: () => number;
}

/**
 * Registra as rotas de leitura de status. Toda validação de query/params usa os
 * schemas Zod de `@monitor-sefaz/contracts`, garantindo contrato único API↔Web.
 */
export function registerStatusRoutes(app: FastifyInstance, deps: StatusRoutesDeps): void {
  const { store, summaryService, uptimeCalculator, now } = deps;

  app.get('/api/v1/health', async () => ({ status: 'ok' }));

  app.get('/api/v1/status', async (request) => {
    const query = statusQuerySchema.parse(request.query);
    const all = await store.getSnapshot(query.env);
    const services = all
      .filter((s) => (query.document ? s.document === query.document : true))
      .filter((s) => (query.uf ? s.uf === query.uf.toUpperCase() : true));
    return {
      environment: query.env,
      generatedAt: new Date(now()).toISOString(),
      services,
    };
  });

  app.get<{ Params: { document: string; uf: string } }>(
    '/api/v1/status/:document/:uf',
    async (request, reply) => {
      const env = statusQuerySchema.parse(request.query).env;
      // Normaliza o document para o enum canônico do catálogo (case-sensitive,
      // ex.: "NFe") — o cliente pode passar "nfe"; a uf idem. Sem isso o id não
      // casaria com o armazenado (`NFe:SP`) e a rota devolveria 404 espúrio.
      const document = normalizeDocument(request.params.document);
      const id = `${document ?? request.params.document}:${request.params.uf.toUpperCase()}`;
      const service = await store.getService(env, id);
      if (!service) {
        return reply.code(404).send({ message: 'Serviço não encontrado' });
      }
      return service;
    }
  );

  app.get('/api/v1/summary', async (request) => {
    const env: EnvironmentValue = statusQuerySchema.parse(request.query).env;
    const services = await store.getSnapshot(env);
    return summaryService.build(env, services, new Date(now()).toISOString());
  });

  app.get<{ Params: { id: string } }>('/api/v1/services/:id/history', async (request) => {
    const { env, period } = historyQuerySchema.parse(request.query);
    const points = await store.getHistory(env, decodeURIComponent(request.params.id), period);
    return { id: request.params.id, period, points };
  });

  app.get<{ Params: { id: string } }>('/api/v1/services/:id/uptime', async (request) => {
    const { env, period } = historyQuerySchema.parse(request.query);
    const id = decodeURIComponent(request.params.id);
    const points = await store.getHistory(env, id, period);
    return { id, period, ...uptimeCalculator.computeUptime(points) };
  });

  app.get('/api/v1/incidents', async (request) => {
    const { env, period } = historyQuerySchema.parse(request.query);
    const snapshot = await store.getSnapshot(env);
    const incidents = (
      await Promise.all(
        snapshot.map(async (service) => {
          const points = await store.getHistory(env, service.id, period);
          return uptimeCalculator.deriveIncidents(service.id, points);
        })
      )
    ).flat();
    // mais recentes primeiro
    incidents.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return { period, incidents };
  });
}
