import type { Redis } from 'ioredis';
import type { EnvironmentValue, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { UPDATES_CHANNEL } from '../store/StatusStore.js';

/** Payload publicado no canal de atualizações. */
export interface UpdatePayload {
  environment: EnvironmentValue;
  services: ServiceStatusDTO[];
}

/** Assinante que recebe deltas de atualização de status. */
export type UpdateListener = (payload: UpdatePayload) => void;

/**
 * Faz a ponte entre o pub/sub do Redis e os assinantes locais (conexões SSE).
 *
 * Usa uma conexão Redis dedicada em modo subscribe (o ioredis não permite
 * comandos normais numa conexão inscrita). Os listeners locais recebem os
 * deltas e cada conexão SSE decide se repassa ao cliente conforme o ambiente.
 */
export class StatusBroadcaster {
  private readonly listeners = new Set<UpdateListener>();

  constructor(private readonly subscriber: Redis) {}

  /** Inicia a assinatura do canal de atualizações. */
  public async start(): Promise<void> {
    await this.subscriber.subscribe(UPDATES_CHANNEL);
    this.subscriber.on('message', (channel, message) => {
      if (channel !== UPDATES_CHANNEL) {
        return;
      }
      try {
        const payload = JSON.parse(message) as UpdatePayload;
        for (const listener of this.listeners) {
          listener(payload);
        }
      } catch {
        // mensagem malformada: ignora silenciosamente
      }
    });
  }

  /** Registra um listener; retorna função para remover. */
  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async stop(): Promise<void> {
    await this.subscriber.unsubscribe(UPDATES_CHANNEL);
    this.listeners.clear();
  }
}
