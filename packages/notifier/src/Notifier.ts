import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import type { NotifierConfig } from './config.js';

/** Resultado do fan-out: quantas entregas deram certo/erraram. */
export interface NotifyResult {
  readonly sent: number;
  readonly failed: number;
}

/**
 * Orquestra a entrega dos eventos aos canais configurados. Faz o produto
 * eventos × canais e envia tudo em paralelo com `allSettled`: uma falha (canal
 * fora do ar, URL inválida) é contabilizada mas NÃO interrompe as demais entregas.
 *
 * Sem canais configurados, `notify` é no-op — o pipeline de coleta segue idêntico
 * quando ninguém habilitou notificação.
 */
export class Notifier {
  constructor(private readonly config: NotifierConfig) {}

  /** Há ao menos um canal ativo? Útil para pular trabalho quando desligado. */
  public get enabled(): boolean {
    return this.config.channels.length > 0;
  }

  public async notify(events: readonly NotificationEventDTO[]): Promise<NotifyResult> {
    const { channels, eventFilter } = this.config;
    if (channels.length === 0 || events.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const selected = eventFilter
      ? events.filter((e) => eventFilter.has(e.type))
      : events;

    const deliveries: Array<Promise<void>> = [];
    for (const event of selected) {
      for (const channel of channels) {
        deliveries.push(channel.send(event));
      }
    }

    const results = await Promise.allSettled(deliveries);
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { sent: results.length - failed, failed };
  }
}
