import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../src/App.js';

function tree() {
  return (
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
}

/**
 * Renderiza como o prerender e hidrata como o navegador. Qualquer diferença
 * entre os dois markups vira erro de hidratação — e o React descartaria o HTML
 * pré-renderizado para renderizar tudo de novo no cliente.
 */
async function hydrate(): Promise<{ container: HTMLElement; errors: unknown[] }> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(tree());
  document.body.appendChild(container);

  const errors: unknown[] = [];
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args);
  });
  let root: Root | undefined;
  await act(async () => {
    root = hydrateRoot(container, tree(), { onRecoverableError: (err) => errors.push(err) });
  });
  consoleError.mockRestore();
  roots.push(root!);
  return { container, errors };
}

const roots: Root[] = [];

describe('hidratação do HTML pré-renderizado', () => {
  // O fetch do status nunca resolve: o teste é sobre o primeiro render.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );

  afterEach(() => {
    act(() => roots.splice(0).forEach((r) => r.unmount()));
    document.body.innerHTML = '';
    document.documentElement.classList.remove('dark');
  });

  it('hidrata a home sem divergência de markup', async () => {
    const { errors } = await hydrate();
    expect(errors).toEqual([]);
  });

  it('hidrata igual com o tema escuro já aplicado no <html>', async () => {
    document.documentElement.classList.add('dark');
    const { errors } = await hydrate();
    expect(errors).toEqual([]);
  });

  it('desenha o mapa assim que hidrata', async () => {
    const { container } = await hydrate();
    expect(container.querySelectorAll('svg[viewBox="0 0 620 640"] path').length).toBe(27);
  });
});
