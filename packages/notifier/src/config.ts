import type { NotificationEventType } from '@monitor-sefaz/contracts';
import type { Channel, DeliveryOptions } from './channels/Channel.js';
import { DiscordChannel } from './channels/DiscordChannel.js';
import { SlackChannel } from './channels/SlackChannel.js';
import { TelegramChannel } from './channels/TelegramChannel.js';
import { WebhookChannel } from './channels/WebhookChannel.js';

/** Fonte de variáveis de ambiente (process.env ou um objeto nos testes). */
export type Env = Record<string, string | undefined>;

/** Configuração resolvida do notifier. */
export interface NotifierConfig {
  /** Canais ativos (só os que têm as vars necessárias). */
  readonly channels: Channel[];
  /** Filtro de tipos de evento; `null` = todos. */
  readonly eventFilter: Set<NotificationEventType> | null;
}

/**
 * Monta a configuração do notifier a partir do ambiente. Cada canal só é ativado
 * quando SUAS variáveis existem — sem nenhuma var, `channels` fica vazio e o
 * Notifier vira no-op (zero efeito no pipeline atual). NOTIFY_EVENTS (csv) filtra
 * os tipos; ausente = todos.
 *
 * Vars:
 * - NOTIFY_DISCORD_WEBHOOK_URL
 * - NOTIFY_SLACK_WEBHOOK_URL
 * - NOTIFY_TELEGRAM_BOT_TOKEN + NOTIFY_TELEGRAM_CHAT_ID (ambos obrigatórios)
 * - NOTIFY_WEBHOOK_URL
 * - NOTIFY_EVENTS (ex.: "SERVICE_DOWN,SERVICE_RECOVERED")
 */
export function parseNotifierConfig(env: Env, opts: DeliveryOptions = {}): NotifierConfig {
  const channels: Channel[] = [];

  const discord = env.NOTIFY_DISCORD_WEBHOOK_URL;
  if (discord) channels.push(new DiscordChannel(discord, opts));

  const slack = env.NOTIFY_SLACK_WEBHOOK_URL;
  if (slack) channels.push(new SlackChannel(slack, opts));

  const botToken = env.NOTIFY_TELEGRAM_BOT_TOKEN;
  const chatId = env.NOTIFY_TELEGRAM_CHAT_ID;
  if (botToken && chatId) channels.push(new TelegramChannel(botToken, chatId, opts));

  const webhook = env.NOTIFY_WEBHOOK_URL;
  if (webhook) channels.push(new WebhookChannel(webhook, opts));

  const rawFilter = env.NOTIFY_EVENTS?.trim();
  const eventFilter =
    rawFilter && rawFilter.length > 0
      ? new Set(
          rawFilter
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean) as NotificationEventType[]
        )
      : null;

  return { channels, eventFilter };
}
