import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { toDiscordPayload } from '../format/discord.js';
import { postJson, type Channel, type DeliveryOptions } from './Channel.js';

/** Entrega eventos a um webhook do Discord (embed por evento). */
export class DiscordChannel implements Channel {
  public readonly name = 'discord';

  constructor(
    private readonly webhookUrl: string,
    private readonly opts: DeliveryOptions = {}
  ) {}

  public async send(event: NotificationEventDTO): Promise<void> {
    await postJson(this.webhookUrl, toDiscordPayload(event), this.opts);
  }
}
