import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { SummaryService } from './services/SummaryService.js';
import { UptimeCalculator } from './services/UptimeCalculator.js';
import { registerStatusRoutes } from './routes/statusRoutes.js';
import { registerStreamRoutes } from './routes/streamRoutes.js';
import type { StatusStore } from './store/StatusStore.js';
import type { StatusBroadcaster } from './realtime/StatusBroadcaster.js';

export interface BuildAppDeps {
  readonly store: StatusStore;
  /** Broadcaster de tempo real; quando ausente, a rota SSE não é registrada. */
  readonly broadcaster?: StatusBroadcaster;
  /** Máximo de requisições por minuto por IP. 0 desativa o rate limit. */
  readonly rateLimitMax?: number;
  /** Diretório do front buildado a servir como estático (produção). */
  readonly webDistDir?: string;
  /** Função de tempo, injetável para testes determinísticos. */
  readonly now?: () => number;
  readonly logger?: boolean;
}

/**
 * Monta a instância Fastify com as rotas, sem efeitos colaterais de rede.
 * Mantido separado do `server.ts` para permitir testes com `app.inject()`.
 */
export async function buildApp(deps: BuildAppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false });
  await app.register(cors, { origin: true });

  if (deps.rateLimitMax && deps.rateLimitMax > 0) {
    await app.register(rateLimit, { max: deps.rateLimitMax, timeWindow: '1 minute' });
  }

  registerStatusRoutes(app, {
    store: deps.store,
    summaryService: new SummaryService(),
    uptimeCalculator: new UptimeCalculator(),
    now: deps.now ?? (() => Date.now()),
  });

  if (deps.broadcaster) {
    registerStreamRoutes(app, { broadcaster: deps.broadcaster });
  }

  // Em produção, serve o dashboard buildado como SPA (fallback para index.html).
  if (deps.webDistDir && existsSync(deps.webDistDir)) {
    await app.register(fastifyStatic, { root: deps.webDistDir });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.code(404).send({ message: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
