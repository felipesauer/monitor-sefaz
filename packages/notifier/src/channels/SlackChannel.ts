import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { toSlackPayload } from '../format/slack.js';
import { postJson, type Channel, type DeliveryOptions } from './Channel.js';

/** Entrega eventos a um Incoming Webhook do Slack (attachment por evento). */
export class SlackChannel implements Channel {
  public readonly name = 'slack';

  constructor(
    private readonly webhookUrl: string,
    private readonly opts: DeliveryOptions = {}
  ) {}

  public async send(event: NotificationEventDTO): Promise<void> {
    await postJson(this.webhookUrl, toSlackPayload(event), this.opts);
  }
}
