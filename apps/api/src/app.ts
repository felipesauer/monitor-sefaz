import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { SummaryService } from './services/SummaryService.js';
import { registerStatusRoutes } from './routes/statusRoutes.js';
import type { StatusStore } from './store/StatusStore.js';

export interface BuildAppDeps {
  readonly store: StatusStore;
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

  registerStatusRoutes(app, {
    store: deps.store,
    summaryService: new SummaryService(),
    now: deps.now ?? (() => Date.now()),
  });

  return app;
}
