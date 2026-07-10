import { describe, it, expect } from 'vitest';
import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { parseNotifierConfig } from '../src/config.js';
import { Notifier } from '../src/Notifier.js';
import type { Channel } from '../src/channels/Channel.js';

const AT = '2026-07-10T00:00:00.000Z';
const ev = (type: NotificationEventDTO['type']): NotificationEventDTO => ({
  type,
  serviceId: 'NFe:SP',
  occurredAt: AT,
});

describe('parseNotifierConfig', () => {
  it('sem nenhuma var: nenhum canal (notifier vira no-op)', () => {
    const cfg = parseNotifierConfig({});
    expect(cfg.channels).toHaveLength(0);
    expect(cfg.eventFilter).toBeNull();
  });

  it('ativa só os canais cujas vars existem', () => {
    const cfg = parseNotifierConfig({
      NOTIFY_DISCORD_WEBHOOK_URL: 'https://discord/x',
      NOTIFY_WEBHOOK_URL: 'https://meu/hook',
    });
    expect(cfg.channels.map((c) => c.name).sort()).toEqual(['discord', 'webhook']);
  });

  it('Telegram exige token E chat_id (só um não ativa)', () => {
    expect(parseNotifierConfig({ NOTIFY_TELEGRAM_BOT_TOKEN: 'T' }).channels).toHaveLength(0);
    const cfg = parseNotifierConfig({
      NOTIFY_TELEGRAM_BOT_TOKEN: 'T',
      NOTIFY_TELEGRAM_CHAT_ID: '9',
    });
    expect(cfg.channels.map((c) => c.name)).toEqual(['telegram']);
  });

  it('NOTIFY_EVENTS vira filtro; ausente = todos (null)', () => {
    expect(parseNotifierConfig({}).eventFilter).toBeNull();
    const cfg = parseNotifierConfig({ NOTIFY_EVENTS: 'SERVICE_DOWN, CONTINGENCY_ENTERED' });
    expect([...cfg.eventFilter!]).toEqual(['SERVICE_DOWN', 'CONTINGENCY_ENTERED']);
  });
});

/** Canal fake que registra os eventos recebidos (ou falha, se `fail`). */
function fakeChannel(name: string, received: NotificationEventDTO[], fail = false): Channel {
  return {
    name,
    send: async (e) => {
      if (fail) throw new Error(`${name} caiu`);
      received.push(e);
    },
  };
}

describe('Notifier', () => {
  it('sem canais: notify é no-op', async () => {
    const n = new Notifier({ channels: [], eventFilter: null });
    expect(n.enabled).toBe(false);
    await expect(n.notify([ev('SERVICE_DOWN')])).resolves.toEqual({ sent: 0, failed: 0 });
  });

  it('faz fan-out eventos × canais', async () => {
    const a: NotificationEventDTO[] = [];
    const b: NotificationEventDTO[] = [];
    const n = new Notifier({
      channels: [fakeChannel('a', a), fakeChannel('b', b)],
      eventFilter: null,
    });
    const res = await n.notify([ev('SERVICE_DOWN'), ev('SERVICE_RECOVERED')]);
    expect(res).toEqual({ sent: 4, failed: 0 }); // 2 eventos × 2 canais
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  it('allSettled: um canal que falha não impede os demais', async () => {
    const ok: NotificationEventDTO[] = [];
    const n = new Notifier({
      channels: [fakeChannel('bad', [], true), fakeChannel('ok', ok)],
      eventFilter: null,
    });
    const res = await n.notify([ev('SERVICE_DOWN')]);
    expect(res).toEqual({ sent: 1, failed: 1 });
    expect(ok).toHaveLength(1); // o canal bom entregou apesar do outro falhar
  });

  it('aplica o filtro de tipos de evento', async () => {
    const got: NotificationEventDTO[] = [];
    const n = new Notifier({
      channels: [fakeChannel('a', got)],
      eventFilter: new Set(['SERVICE_DOWN']),
    });
    await n.notify([ev('SERVICE_DOWN'), ev('SERVICE_RECOVERED'), ev('DAILY_DIGEST')]);
    expect(got.map((e) => e.type)).toEqual(['SERVICE_DOWN']);
  });
});
