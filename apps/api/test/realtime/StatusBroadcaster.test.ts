import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { UPDATES_CHANNEL } from '../../src/store/StatusStore.js';
import {
  StatusBroadcaster,
  type UpdatePayload,
} from '../../src/realtime/StatusBroadcaster.js';

describe('StatusBroadcaster', () => {
  let publisher: Redis;
  let subscriber: Redis;

  beforeEach(() => {
    // ioredis-mock compartilha o mesmo barramento entre instâncias.
    publisher = new RedisMock() as unknown as Redis;
    subscriber = publisher.duplicate() as unknown as Redis;
  });

  it('repassa mensagens publicadas no canal para os listeners', async () => {
    const broadcaster = new StatusBroadcaster(subscriber);
    await broadcaster.start();

    const received: UpdatePayload[] = [];
    broadcaster.subscribe((payload) => received.push(payload));

    const payload: UpdatePayload = {
      environment: 'producao',
      services: [],
    };
    await publisher.publish(UPDATES_CHANNEL, JSON.stringify(payload));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toHaveLength(1);
    expect(received[0]?.environment).toBe('producao');
  });

  it('para de notificar após o unsubscribe do listener', async () => {
    const broadcaster = new StatusBroadcaster(subscriber);
    await broadcaster.start();

    const received: UpdatePayload[] = [];
    const off = broadcaster.subscribe((payload) => received.push(payload));
    off();

    await publisher.publish(
      UPDATES_CHANNEL,
      JSON.stringify({ environment: 'producao', services: [] })
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toHaveLength(0);
  });

  it('ignora mensagens malformadas sem lançar', async () => {
    const broadcaster = new StatusBroadcaster(subscriber);
    await broadcaster.start();
    broadcaster.subscribe(() => {});

    await expect(
      publisher.publish(UPDATES_CHANNEL, 'not-json{')
    ).resolves.toBeDefined();
  });
});
