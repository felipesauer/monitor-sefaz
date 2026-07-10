import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { describeEvent, labelFor } from './labels.js';

/** Payload de webhook do Discord (subset que usamos: um embed). */
export interface DiscordPayload {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    timestamp: string;
    footer?: { text: string };
  }>;
}

/** Formata um evento como embed do Discord (função pura). */
export function toDiscordPayload(event: NotificationEventDTO): DiscordPayload {
  const label = labelFor(event.type);
  const footer =
    event.source !== undefined ? { text: `fonte: ${event.source}` } : undefined;
  return {
    embeds: [
      {
        title: label.title,
        description: describeEvent(event),
        color: label.color,
        timestamp: event.occurredAt,
        ...(footer ? { footer } : {}),
      },
    ],
  };
}
