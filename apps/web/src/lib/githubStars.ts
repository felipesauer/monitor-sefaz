/** Repositório do projeto — o destino do botão de estrela. */
export const REPO_URL = 'https://github.com/felipesauer/monitor-sefaz';

const API_URL = 'https://api.github.com/repos/felipesauer/monitor-sefaz';
const CACHE_KEY = 'monitor-sefaz:github-stars';

/**
 * Uma hora de cache. Estrelas mudam devagar, e sem token a API do GitHub
 * aceita só 60 chamadas por hora por IP — sem cache, quem navega entre as
 * páginas por UF gastaria uma a cada página.
 */
export const STARS_CACHE_MS = 60 * 60 * 1000;

export interface CachedStars {
  /** `null` registra uma falha: segura novas tentativas até o cache vencer. */
  count: number | null;
  fresh: boolean;
}

export function readCachedStars(now = Date.now()): CachedStars | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { count, at } = JSON.parse(raw) as { count?: unknown; at?: unknown };
    if ((typeof count !== 'number' && count !== null) || typeof at !== 'number') return null;
    return { count, fresh: now - at < STARS_CACHE_MS };
  } catch {
    // Storage bloqueado ou conteúdo corrompido: é como não ter cache.
    return null;
  }
}

export function writeCachedStars(count: number | null, now = Date.now()): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: now }));
  } catch {
    // Sem storage, a contagem só não é reaproveitada.
  }
}

/** Estrelas do repositório pela API pública do GitHub. Lança em qualquer falha. */
export async function fetchStars(signal?: AbortSignal): Promise<number> {
  const response = await fetch(API_URL, {
    signal,
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub API: HTTP ${response.status}`);
  }
  const { stargazers_count: count } = (await response.json()) as { stargazers_count?: unknown };
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    throw new Error('GitHub API: resposta sem stargazers_count');
  }
  return count;
}
