import { useEffect } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'monitor-sefaz:theme';

/**
 * O tema vigente é a classe `dark` no <html>. Quem a aplica na carga é o script
 * inline do index.html, antes do primeiro paint — a página chega
 * pré-renderizada e, esperando o React, quem usa o tema escuro veria um flash
 * do claro. Por isso o tema não vira estado do React: o render precisa sair
 * igual no servidor e na hidratação, e o ícone do botão é escolhido via CSS.
 */
function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function persist(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage bloqueado (modo privado, cookies desligados): o tema só não persiste.
  }
}

/** Alterna o tema claro/escuro, persistindo a escolha em localStorage. */
export function useTheme(): { toggle: () => void } {
  // Grava o tema da primeira visita, como antes: a escolha fica estável mesmo
  // que a preferência do sistema mude depois.
  useEffect(() => persist(currentTheme()), []);

  return {
    toggle: () => {
      const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      persist(next);
    },
  };
}
