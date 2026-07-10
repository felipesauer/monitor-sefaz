import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { describeEvent, labelFor } from './labels.js';

/** Payload do método sendMessage da Bot API do Telegram. */
export interface TelegramPayload {
  chat_id: string;
  text: string;
  parse_mode: 'Markdown';
}

/** Formata um evento como mensagem Markdown do Telegram (função pura). */
export function toTelegramPayload(event: NotificationEventDTO, chatId: string): TelegramPayload {
  const label = labelFor(event.type);
  return {
    chat_id: chatId,
    text: `*${label.title}*\n${describeEvent(event)}`,
    parse_mode: 'Markdown',
  };
}
