import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TechnicalNotesProvider } from '../../src/technical-notes/TechnicalNotesProvider.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  join(here, '..', 'fixtures', 'technical-notes', 'lista.html'),
  'latin1'
);
const noSleep = async (): Promise<void> => {};

describe('TechnicalNotesProvider', () => {
  it('parseia a fixture real (3 notas)', async () => {
    const provider = new TechnicalNotesProvider(async () => fixture, noSleep);
    const notes = await provider.fetch();
    expect(notes).toHaveLength(3);
  });

  it('faz retry e tem sucesso após falha transitória', async () => {
    let calls = 0;
    const provider = new TechnicalNotesProvider(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error('rede caiu');
        return fixture;
      },
      noSleep,
      () => 0.5
    );
    const notes = await provider.fetch();
    expect(calls).toBe(2);
    expect(notes).toHaveLength(3);
  });

  it('lança após esgotar as tentativas', async () => {
    const provider = new TechnicalNotesProvider(
      async () => {
        throw new Error('sempre falha');
      },
      noSleep,
      () => 0.5
    );
    await expect(provider.fetch()).rejects.toThrow(/sempre falha/);
  });
});
