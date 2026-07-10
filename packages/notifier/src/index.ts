export { detectTransitions } from './diff.js';

// Formatters (funções puras evento → payload)
export { toDiscordPayload, type DiscordPayload } from './format/discord.js';
export { toSlackPayload, type SlackPayload } from './format/slack.js';
export { toTelegramPayload, type TelegramPayload } from './format/telegram.js';
export { labelFor, describeEvent, type EventLabel } from './format/labels.js';

// Canais (I/O via fetch injetável)
export {
  postJson,
  type Channel,
  type FetchLike,
  type DeliveryOptions,
} from './channels/Channel.js';
export { DiscordChannel } from './channels/DiscordChannel.js';
export { SlackChannel } from './channels/SlackChannel.js';
export { TelegramChannel } from './channels/TelegramChannel.js';
export { WebhookChannel } from './channels/WebhookChannel.js';

// Config + orquestrador
export { parseNotifierConfig, type Env, type NotifierConfig } from './config.js';
export { Notifier, type NotifyResult } from './Notifier.js';
