import { useEffect, useState } from 'react';
import { fetchStars, readCachedStars, writeCachedStars } from '../lib/githubStars.js';

/**
 * Número de estrelas do repositório, ou `null` enquanto não se sabe.
 *
 * Só roda depois de montar: o HTML pré-renderizado sai sem número, igual para
 * todo mundo, e a hidratação bate. A falha é silenciosa — o botão continua
 * funcionando sem a contagem — e fica no cache, para não martelar a API
 * quando ela limitar as chamadas.
 */
export function useGitHubStars(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const cached = readCachedStars();
    if (cached) setCount(cached.count);
    if (cached?.fresh) return;

    const controller = new AbortController();
    fetchStars(controller.signal)
      .then((stars) => {
        writeCachedStars(stars);
        setCount(stars);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        writeCachedStars(cached?.count ?? null);
      });
    return () => controller.abort();
  }, []);

  return count;
}
