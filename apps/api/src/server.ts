import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Redis } from 'ioredis';
import {
  BatchChecker,
  CatalogAuthorizerRegistry,
  CheckerFactory,
  type ClientCertificate,
} from '@monitor-sefaz/core';
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

  // Carrega o certificado A1 opcional para mTLS.
  let certificate: ClientCertificate | undefined;
  if (config.certPath) {
    certificate = {
      pfx: readFileSync(config.certPath),
      passphrase: config.certPassphrase,
    };
  }

  const checker = CheckerFactory.create({
    certificate,
    options: { timeoutMs: config.timeoutMs },
  });
  const batch = new BatchChecker(checker, config.concurrency);
  const registry = new CatalogAuthorizerRegistry();

  // Diretório do front buildado (apps/web/dist), servido em produção.
  const here = dirname(fileURLToPath(import.meta.url));
  const webDistDir = resolve(here, '../../web/dist');

  const app = await buildApp({
    store,
    broadcaster,
    rateLimitMax: config.rateLimitMax,
    webDistDir,
    logger: true,
  });

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
