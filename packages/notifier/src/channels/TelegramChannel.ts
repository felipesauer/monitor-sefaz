import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { toTelegramPayload } from '../format/telegram.js';
import { postJson, type Channel, type DeliveryOptions } from './Channel.js';

/**
 * Entrega eventos via Bot API do Telegram (sendMessage). Precisa do token do bot
 * e do chat de destino; a URL do endpoint é derivada do token.
 */
export class TelegramChannel implements Channel {
  public readonly name = 'telegram';
  private readonly url: string;

  constructor(
    botToken: string,
    private readonly chatId: string,
    private readonly opts: DeliveryOptions = {}
  ) {
    this.url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  }

  public async send(event: NotificationEventDTO): Promise<void> {
    await postJson(this.url, toTelegramPayload(event, this.chatId), this.opts);
  }
}
