/** Configuração da API, derivada de variáveis de ambiente com defaults seguros. */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly redisUrl: string;
  /** Expressão cron das checagens agendadas. */
  readonly cronExpression: string;
  /** Ambientes a monitorar (por padrão apenas produção). */
  readonly environments: ('producao' | 'homologacao')[];
  /** Concorrência de requisições à SEFAZ por lote. */
  readonly concurrency: number;
  /** Timeout por requisição SEFAZ (ms). */
  readonly timeoutMs: number;
  /** Retenção do histórico curto (ms). Padrão 72h. */
  readonly historyRetentionMs: number;
  /** Token para endpoints protegidos (ex: disparo manual). Vazio = aberto. */
  readonly adminToken: string;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): AppConfig {
  return {
    port: intEnv('PORT', 3333),
    host: process.env.HOST ?? '0.0.0.0',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    cronExpression: process.env.CRON_EXPRESSION ?? '*/5 * * * *',
    environments: ['producao'],
    concurrency: intEnv('SEFAZ_CONCURRENCY', 5),
    timeoutMs: intEnv('SEFAZ_TIMEOUT_MS', 15_000),
    historyRetentionMs: intEnv('HISTORY_RETENTION_MS', 72 * 60 * 60 * 1000),
    adminToken: process.env.ADMIN_TOKEN ?? '',
  };
}
