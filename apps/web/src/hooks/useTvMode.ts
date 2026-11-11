import { useSyncExternalStore } from 'react';

/** O endereço da visão de TV/NOC: a home com `#tv`. */
export const TV_HASH = '#tv';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * `true` quando a página está em `#tv`: a visão para tela de NOC (só o que
 * importa de longe, sem filtros nem blocos de leitura). Fica na URL, então dá
 * para salvar e compartilhar. No pré-render é sempre `false`.
 */
export function useTvMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash === TV_HASH,
    () => false
  );
}
