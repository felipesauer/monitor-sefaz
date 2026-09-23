import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GitHubStarButton } from '../src/components/GitHubStarButton.js';
import {
  REPO_URL,
  STARS_CACHE_MS,
  readCachedStars,
  writeCachedStars,
} from '../src/lib/githubStars.js';

function stubApi(respond: () => Promise<Response>) {
  const fetchMock = vi.fn(respond);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = (count: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify({ stargazers_count: count }), { status: 200 }));

describe('GitHubStarButton', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('leva ao repositório mesmo quando a API falha', async () => {
    const api = stubApi(() => Promise.reject(new TypeError('offline')));
    render(<GitHubStarButton />);

    const link = screen.getByRole('link', { name: /Star no GitHub/ });
    expect(link).toHaveAttribute('href', REPO_URL);
    expect(link).toHaveAttribute('target', '_blank');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(link).toHaveAccessibleName('Star no GitHub');
  });

  it('mostra a contagem da API e a guarda no cache', async () => {
    stubApi(ok(42));
    render(<GitHubStarButton />);

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName('Star no GitHub, 42 estrelas');
    expect(readCachedStars()).toEqual({ count: 42, fresh: true });
  });

  it('usa o cache fresco sem chamar a API', async () => {
    writeCachedStars(7);
    const api = stubApi(ok(99));
    render(<GitHubStarButton />);

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('com o cache vencido, mostra o último número enquanto revalida', async () => {
    writeCachedStars(7, Date.now() - STARS_CACHE_MS - 1);
    stubApi(ok(8));
    render(<GitHubStarButton />);

    expect(await screen.findByText('8')).toBeInTheDocument();
  });

  it('falha em silêncio e segura novas tentativas até o cache vencer', async () => {
    const api = stubApi(() => Promise.resolve(new Response('rate limited', { status: 403 })));
    const { unmount } = render(<GitHubStarButton />);
    await waitFor(() => expect(readCachedStars()).toEqual({ count: null, fresh: true }));
    unmount();

    render(<GitHubStarButton />);
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link')).toHaveAccessibleName('Star no GitHub');
  });

  it('não exibe zero nem resposta sem número', async () => {
    const api = stubApi(ok(0));
    render(<GitHubStarButton />);
    await waitFor(() => expect(readCachedStars()?.count).toBe(0));
    expect(screen.getByRole('link')).toHaveAccessibleName('Star no GitHub');

    localStorage.clear();
    api.mockImplementation(ok('muitas'));
    render(<GitHubStarButton />);
    await waitFor(() => expect(readCachedStars()).toEqual({ count: null, fresh: true }));
  });

  it('trata cache corrompido como ausente', () => {
    localStorage.setItem('monitor-sefaz:github-stars', '{quebrado');
    expect(readCachedStars()).toBeNull();
    localStorage.setItem('monitor-sefaz:github-stars', JSON.stringify({ count: 'x', at: 1 }));
    expect(readCachedStars()).toBeNull();
  });
});
