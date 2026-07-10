import { describe, it, expect } from 'vitest';
import type { NotificationEventDTO } from '@monitor-sefaz/contracts';
import { toDiscordPayload } from '../src/format/discord.js';
import { toSlackPayload } from '../src/format/slack.js';
import { toTelegramPayload } from '../src/format/telegram.js';

const AT = '2026-07-10T00:00:00.000Z';

const down: NotificationEventDTO = {
  type: 'SERVICE_DOWN',
  serviceId: 'NFe:SP',
  uf: 'SP',
  previousState: 'OPERATIONAL',
  currentState: 'DOWN',
  cStat: 109,
  source: 'svrs',
  occurredAt: AT,
};

const degraded: NotificationEventDTO = {
  type: 'SOURCE_DEGRADED',
  source: 'availability',
  occurredAt: AT,
};

describe('formatters', () => {
  describe('Discord', () => {
    it('gera um embed com título, descrição, cor e timestamp', () => {
      const p = toDiscordPayload(down);
      expect(p.embeds).toHaveLength(1);
      expect(p.embeds[0]!.title).toContain('fora do ar');
      expect(p.embeds[0]!.description).toBe('NFe:SP: OPERATIONAL → DOWN');
      expect(p.embeds[0]!.color).toBe(0xe4_3f_52); // vermelho DOWN
      expect(p.embeds[0]!.timestamp).toBe(AT);
      expect(p.embeds[0]!.footer?.text).toBe('fonte: svrs');
    });

    it('descreve SOURCE_DEGRADED pela fonte, sem exigir serviceId', () => {
      const p = toDiscordPayload(degraded);
      expect(p.embeds[0]!.description).toContain('availability');
    });
  });

  describe('Slack', () => {
    it('gera attachment com cor hex e ts em epoch', () => {
      const p = toSlackPayload(down);
      expect(p.attachments[0]!.color).toBe('#e43f52');
      expect(p.attachments[0]!.text).toBe('NFe:SP: OPERATIONAL → DOWN');
      expect(p.attachments[0]!.ts).toBe(Math.floor(Date.parse(AT) / 1000));
    });
  });

  describe('Telegram', () => {
    it('gera texto Markdown com chat_id', () => {
      const p = toTelegramPayload(down, '12345');
      expect(p.chat_id).toBe('12345');
      expect(p.parse_mode).toBe('Markdown');
      expect(p.text).toContain('*');
      expect(p.text).toContain('NFe:SP: OPERATIONAL → DOWN');
    });
  });

  it('cores diferem por tipo de evento (DOWN vermelho ≠ RECOVERED verde)', () => {
    const recovered: NotificationEventDTO = { ...down, type: 'SERVICE_RECOVERED' };
    expect(toDiscordPayload(down).embeds[0]!.color).not.toBe(
      toDiscordPayload(recovered).embeds[0]!.color
    );
  });
});
