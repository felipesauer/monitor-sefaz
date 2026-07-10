import { describe, it, expect } from 'vitest';
import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { postJson, type FetchLike } from '../src/channels/Channel.js';
import { DiscordChannel } from '../src/channels/DiscordChannel.js';
import { WebhookChannel } from '../src/channels/WebhookChannel.js';
import { TelegramChannel } from '../src/channels/TelegramChannel.js';

const AT = '2026-07-10T00:00:00.000Z';
const event: NotificationEventDTO = {
  type: 'SERVICE_DOWN',
  serviceId: 'NFe:SP',
  uf: 'SP',
  previousState: 'OPERATIONAL',
  currentState: 'DOWN',
  cStat: 109,
  occurredAt: AT,
};

const noSleep = async (): Promise<void> => {};

/** Fetch fake que registra as chamadas e responde conforme uma sequência. */
function recordingFetch(statuses: Array<number | 'throw'>): {
  fetch: FetchLike;
  calls: Array<{ url: string; body: string }>;
} {
  const calls: Array<{ url: string; body: string }> = [];
  let i = 0;
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, body: init.body });
    const s = statuses[Math.min(i, statuses.length - 1)];
    i += 1;
    if (s === 'throw') throw new Error('rede caiu');
    return { ok: s >= 200 && s < 300, status: s };
  };
  return { fetch, calls };
}

describe('postJson (entrega robusta)', () => {
  it('sucesso na 1ª tentativa não faz retry', async () => {
    const { fetch, calls } = recordingFetch([200]);
    await postJson('https://x', { a: 1 }, { fetchImpl: fetch, sleep: noSleep });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toBe('{"a":1}');
  });

  it('tenta 1 retry e tem sucesso após falha transitória', async () => {
    const { fetch, calls } = recordingFetch(['throw', 200]);
    await postJson('https://x', {}, { fetchImpl: fetch, sleep: noSleep });
    expect(calls).toHaveLength(2);
  });

  it('lança após as 2 tentativas falharem (HTTP 500)', async () => {
    const { fetch, calls } = recordingFetch([500, 500]);
    await expect(
      postJson('https://x', {}, { fetchImpl: fetch, sleep: noSleep })
    ).rejects.toThrow(/HTTP 500/);
    expect(calls).toHaveLength(2);
  });

  it('respeita o timeout por tentativa', async () => {
    const hang: FetchLike = () => new Promise(() => {}); // nunca resolve
    await expect(
      postJson('https://x', {}, { fetchImpl: hang, sleep: noSleep, timeoutMs: 5 })
    ).rejects.toThrow(/timeout/);
  });
});

describe('canais', () => {
  it('DiscordChannel envia embed para a URL do webhook', async () => {
    const { fetch, calls } = recordingFetch([204]);
    await new DiscordChannel('https://discord/webhook', {
      fetchImpl: fetch,
      sleep: noSleep,
    }).send(event);
    expect(calls[0]!.url).toBe('https://discord/webhook');
    expect(JSON.parse(calls[0]!.body)).toHaveProperty('embeds');
  });

  it('WebhookChannel envia o evento cru', async () => {
    const { fetch, calls } = recordingFetch([200]);
    await new WebhookChannel('https://meu/hook', {
      fetchImpl: fetch,
      sleep: noSleep,
    }).send(event);
    expect(JSON.parse(calls[0]!.body)).toMatchObject({ type: 'SERVICE_DOWN', serviceId: 'NFe:SP' });
  });

  it('TelegramChannel deriva a URL do token e inclui chat_id no corpo', async () => {
    const { fetch, calls } = recordingFetch([200]);
    await new TelegramChannel('BOT:TOKEN', '999', {
      fetchImpl: fetch,
      sleep: noSleep,
    }).send(event);
    expect(calls[0]!.url).toBe('https://api.telegram.org/botBOT:TOKEN/sendMessage');
    expect(JSON.parse(calls[0]!.body).chat_id).toBe('999');
  });
});
