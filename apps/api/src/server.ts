import { Redis } from 'ioredis';
import { BatchChecker, CatalogAuthorizerRegistry, CheckerFactory } from '@monitor-sefaz/core';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { RedisStatusStore } from './store/RedisStatusStore.js';
import { Scheduler } from './scheduler/Scheduler.js';
import { StatusBroadcaster } from './realtime/StatusBroadcaster.js';

/** Entrypoint: conecta o Redis, monta a API e inicia o scheduler de checagens. */
async function main(): Promise<void> {
  const config = loadConfig();
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  // Conexão dedicada para subscribe (não pode emitir comandos normais).
  const subscriber = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

  const store = new RedisStatusStore(redis, () => Date.now(), config.historyRetentionMs);
  const broadcaster = new StatusBroadcaster(subscriber);
  await broadcaster.start();

  const checker = CheckerFactory.create({
    options: { timeoutMs: config.timeoutMs },
  });
  const batch = new BatchChecker(checker, config.concurrency);
  const registry = new CatalogAuthorizerRegistry();

  const app = await buildApp({ store, broadcaster, logger: true });

  const scheduler = new Scheduler(
    batch,
    registry,
    store,
    { cronExpression: config.cronExpression, environments: config.environments },
    { info: (m) => app.log.info(m), error: (m) => app.log.error(m) }
  );

  const shutdown = async (): Promise<void> => {
    app.log.info('Encerrando...');
    scheduler.stop();
    await broadcaster.stop();
    await app.close();
    redis.disconnect();
    subscriber.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await app.listen({ port: config.port, host: config.host });
  scheduler.start();
}

void main();
