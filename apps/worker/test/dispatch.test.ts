import { describe, it, expect, vi } from 'vitest';
import { dispatchCollect } from '../src/dispatch.js';

const env = { GITHUB_DISPATCH_TOKEN: 'tok', GITHUB_REPOSITORY: 'dono/repo' };

describe('dispatchCollect', () => {
  it('pede ao GitHub uma execução do collect.yml no main', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await dispatchCollect(env, fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ ok: true, status: 204, detail: 'coleta despachada' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://api.github.com/repos/dono/repo/actions/workflows/collect.yml/dispatches'
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ref: 'main' });
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['User-Agent']).toBeTruthy();
  });

  it('não chama a rede sem token', async () => {
    const fetchImpl = vi.fn();
    const result = await dispatchCollect(
      { GITHUB_REPOSITORY: 'dono/repo' },
      fetchImpl as unknown as typeof fetch
    );
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('devolve o status e o corpo quando o GitHub recusa', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('{"message":"Bad credentials"}', { status: 401 })
    );
    const result = await dispatchCollect(env, fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(result.detail).toContain('Bad credentials');
  });

  it('não lança quando a rede falha', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await dispatchCollect(env, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, status: null, detail: 'fetch failed' });
  });
});
