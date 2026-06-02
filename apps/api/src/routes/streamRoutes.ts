import type { FastifyInstance } from 'fastify';
import { statusQuerySchema } from '@monitor-sefaz/contracts';
import type { StatusBroadcaster } from '../realtime/StatusBroadcaster.js';

export interface StreamRoutesDeps {
  readonly broadcaster: StatusBroadcaster;
  /** Intervalo do heartbeat para manter a conexão viva (ms). */
  readonly heartbeatMs?: number;
}

/**
 * Registra o endpoint SSE de tempo real. Cada cliente recebe apenas os deltas
 * do ambiente que pediu. Um heartbeat periódico (comentário SSE) evita que
 * proxies fechem a conexão ociosa.
 */
export function registerStreamRoutes(app: FastifyInstance, deps: StreamRoutesDeps): void {
  const heartbeatMs = deps.heartbeatMs ?? 25_000;

  app.get('/api/v1/stream', (request, reply) => {
    const env = statusQuerySchema.parse(request.query).env;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ environment: env })}\n\n`);

    const unsubscribe = deps.broadcaster.subscribe((payload) => {
      if (payload.environment !== env || payload.services.length === 0) {
        return;
      }
      reply.raw.write(`event: update\ndata: ${JSON.stringify(payload.services)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, heartbeatMs);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
