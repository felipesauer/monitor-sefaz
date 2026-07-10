import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { postJson, type Channel, type DeliveryOptions } from './Channel.js';

/**
 * Webhook genérico: envia o próprio NotificationEvent como JSON cru, deixando a
 * formatação para o consumidor. Útil para integrações que não são Discord/Slack/
 * Telegram (um endpoint próprio, um n8n, etc.).
 */
export class WebhookChannel implements Channel {
  public readonly name = 'webhook';

  constructor(
    private readonly url: string,
    private readonly opts: DeliveryOptions = {}
  ) {}

  public async send(event: NotificationEventDTO): Promise<void> {
    await postJson(this.url, event, this.opts);
  }
}
