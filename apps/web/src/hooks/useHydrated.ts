import { useSyncExternalStore } from 'react';

const noop = (): (() => void) => () => {};

/**
 * `false` no HTML pré-renderizado e durante a hidratação; `true` a partir daí.
 *
 * Serve para o que só faz sentido no navegador sem quebrar a hidratação: o
 * React usa o snapshot "de servidor" enquanto hidrata (então o markup bate com
 * o pré-render) e re-renderiza com o do cliente logo em seguida. Num render
 * sem pré-render (o `vite dev`), já começa em `true`.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}
