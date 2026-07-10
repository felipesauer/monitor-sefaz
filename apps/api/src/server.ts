import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Redis } from 'ioredis';
import {
  BatchChecker,
  CatalogAuthorizerRegistry,
  CheckerFactory,
  type ClientCertificate,
} from '@monitor-sefaz/core';
import { Notifier, parseNotifierConfig } from '@monitor-sefaz/notifier';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { RedisStatusStore } from './store/RedisStatusStore.js';
import { Scheduler } from './scheduler/Scheduler.js';
import { StatusBroadcaster } from './realtime/StatusBroadcaster.js';
import type { StatusSource } from './sources/StatusSource.js';
import { SoapStatusSource } from './sources/SoapStatusSource.js';
import { AvailabilityStatusSource } from './sources/AvailabilityStatusSource.js';
import { HybridStatusSource } from './sources/HybridStatusSource.js';

/**
 * Carrega variáveis de um arquivo `.env` para `process.env` (Node ≥20.12), sem
 * dependência externa. Procura o `.env` na raiz do monorepo (dois níveis acima
 * de apps/api) e, como fallback, no diretório de trabalho atual. Variáveis já
 * definidas no ambiente têm precedência (o .env não sobrescreve). Se o arquivo
 * não existir, segue silenciosamente — em produção as vars vêm do ambiente.
 */
function loadDotEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, '../../../.env'), resolve(process.cwd(), '.env')];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      process.loadEnvFile(path);
    } catch {
      // arquivo ilegível/malformado: ignora e usa só o ambiente do processo
    }
    return;
  }
}

/** Entrypoint: conecta o Redis, monta a API e inicia o scheduler de checagens. */
async function main(): Promise<void> {
  loadDotEnv();
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

  // Seleciona a fonte de status. Padrão: consenso multi-fonte (SVRS e página
  // oficial — oficiais — com o IntegraNotas preenchendo lacunas), o MESMO motor
  // do collector e do worker — assim os números batem entre as três pontas.
  // Opt-in: 'soap' (consulta direta, exige cert A1) ou 'availability' (só
  // scraping da página oficial).
  let source: StatusSource;
  if (config.statusSource === 'soap') {
    const checker = CheckerFactory.create({
      certificate,
      options: { timeoutMs: config.timeoutMs },
    });
    source = new SoapStatusSource(
      new BatchChecker(checker, config.concurrency),
      new CatalogAuthorizerRegistry()
    );
  } else if (config.statusSource === 'availability') {
    source = new AvailabilityStatusSource();
  } else {
    source = new HybridStatusSource();
  }

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

  // Notificador externo (opcional): ativo só se houver NOTIFY_* no ambiente.
  const notifier = new Notifier(parseNotifierConfig(process.env));
  if (notifier.enabled) {
    app.log.info('Notificações externas habilitadas');
  }

  const scheduler = new Scheduler(
    source,
    store,
    { cronExpression: config.cronExpression, environments: config.environments },
    { info: (m) => app.log.info(m), error: (m) => app.log.error(m) },
    notifier
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
