import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { pageFromId, pageFromPath } from './lib/pages.js';
import './styles.css';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root não encontrado');
}

// O build pré-renderiza o HTML (scripts/prerender.js), e aí o React só hidrata
// o que chegou — a página é a que o data-page diz. No `vite dev` não há
// pré-render: o #root vem vazio e a página sai do caminho da URL.
const prerendered = rootElement.firstElementChild;
const page =
  pageFromId(prerendered?.getAttribute('data-page') ?? '') ??
  pageFromPath(window.location.pathname, import.meta.env.BASE_URL);

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App page={page} />
    </QueryClientProvider>
  </StrictMode>
);

if (prerendered) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
