import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { describeEvent, labelFor } from './labels.js';

/** Payload de Incoming Webhook do Slack (attachment com barra colorida). */
export interface SlackPayload {
  attachments: Array<{
    color: string;
    title: string;
    text: string;
    ts: number;
  }>;
}

/** Converte cor RGB inteiro para hex `#rrggbb` (formato que o Slack espera). */
function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Formata um evento como attachment do Slack (função pura). */
export function toSlackPayload(event: NotificationEventDTO): SlackPayload {
  const label = labelFor(event.type);
  return {
    attachments: [
      {
        color: toHex(label.color),
        title: label.title,
        text: describeEvent(event),
        // Slack usa epoch em segundos; occurredAt é ISO. Guarda contra data
        // inválida (Date.parse → NaN viraria "ts":null no JSON): cai em 0.
        ts: Number.isNaN(Date.parse(event.occurredAt))
          ? 0
          : Math.floor(Date.parse(event.occurredAt) / 1000),
      },
    ],
  };
}
