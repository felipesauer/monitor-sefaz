import cron, { type ScheduledTask } from 'node-cron';
import { type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { detectTransitions, type Notifier } from '@monitor-sefaz/notifier';
import type { StatusStore } from '../store/StatusStore.js';
import type { StatusSource } from '../sources/StatusSource.js';

export interface SchedulerOptions {
  readonly cronExpression: string;
  readonly environments: EnvironmentValue[];
}

/** Logger mínimo injetável (o Fastify expõe um compatível). */
export interface SchedulerLogger {
  info(msg: string): void;
  error(msg: string): void;
}

/**
 * Agenda e executa as rodadas de checagem. Coleta o status via uma `StatusSource`
 * (SOAP ou scraping da página oficial), persiste no store e publica os serviços
 * que mudaram de estado (para o fan-out em tempo real). Roda dentro da API.
 */
export class Scheduler {
  private task: ScheduledTask | null = null;
  /** Último estado conhecido por `{env}:{id}` para detectar transições. */
  private readonly lastState = new Map<string, string>();

  constructor(
    private readonly source: StatusSource,
    private readonly store: StatusStore,
    private readonly options: SchedulerOptions,
    private readonly logger: SchedulerLogger,
    /** Notificador opcional; quando habilitado, dispara eventos de transição. */
    private readonly notifier?: Notifier
  ) {}

  /** Inicia o cron e dispara uma rodada imediata. */
  public start(): void {
    void this.runAll();
    this.task = cron.schedule(this.options.cronExpression, () => {
      void this.runAll();
    });
    this.logger.info(`Scheduler ativo — cron "${this.options.cronExpression}"`);
  }

  public stop(): void {
    this.task?.stop();
    this.task = null;
  }

  /** Executa uma rodada para todos os ambientes configurados. */
  public async runAll(): Promise<void> {
    for (const env of this.options.environments) {
      await this.runOnce(env);
    }
  }

  /** Executa uma única rodada para um ambiente. */
  public async runOnce(env: EnvironmentValue): Promise<void> {
    try {
      const services = await this.source.collect(env);
      if (services.length === 0) {
        return;
      }

      // Reconstrói o estado ANTERIOR (para o diff de eventos) e detecta os serviços
      // que mudaram — tudo lendo o lastState antes de atualizá-lo.
      const prev: ServiceStatusDTO[] = [];
      const changed = services.filter((service) => {
        const key = `${env}:${service.id}`;
        const previous = this.lastState.get(key);
        if (previous !== undefined) {
          // Reconstrói o estado anterior carregando SÓ o `state` de fato antigo;
          // os demais campos (cStat/source/latency) do snapshot atual são apenas
          // preenchimento identitário (id/uf/document não mudam para o mesmo
          // serviço). O `cStat`/`source` reais de antes não são guardados no
          // lastState — e o diff só compara `state`, então não os inventamos:
          // zeramos cStat/source para não passar valores enganosos.
          prev.push({
            ...service,
            state: previous as ServiceStatusDTO['state'],
            cStat: null,
            source: undefined,
          });
        }
        this.lastState.set(key, service.state);
        return previous !== undefined && previous !== service.state;
      });

      await this.store.saveSnapshot(env, services);
      await this.store.publishUpdates(env, changed);

      // Notificação externa (opcional): reusa a MESMA detecção de transições do
      // caminho do collector, mantendo uma só semântica de eventos. No-op se o
      // Notifier não tiver canais configurados.
      if (this.notifier?.enabled && changed.length > 0) {
        const events = detectTransitions(prev, services, new Date().toISOString());
        const { sent, failed } = await this.notifier.notify(events);
        this.logger.info(`Notificações ${env}: ${events.length} eventos, ${sent} ok, ${failed} falha`);
      }

      this.logger.info(
        `Rodada ${env} [${this.source.name}]: ${services.length} serviços, ${changed.length} mudança(s)`
      );
    } catch (err) {
      this.logger.error(`Falha na rodada ${env}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
