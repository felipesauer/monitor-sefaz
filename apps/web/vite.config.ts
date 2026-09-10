/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path da aplicação. No GitHub Pages de projeto, o site fica em
// `usuario.github.io/<repo>/`, então passamos `BASE_PATH=/<repo>/` no build.
const base = process.env.BASE_PATH ?? '/';

// URL pública absoluta do site. Open Graph e canonical NÃO aceitam caminho
// relativo — o crawler precisa da URL completa. Um fork sobrescreve com
// SITE_URL no build; o default aponta para o deploy oficial.
const siteUrl = (process.env.SITE_URL ?? 'https://felipesauer.github.io/monitor-sefaz/').replace(
  /\/?$/,
  '/'
);

/** Resolve `%SITE_URL%` no index.html (o `%BASE_URL%` já é nativo do Vite). */
function siteUrlPlugin() {
  return {
    name: 'monitor-sefaz-site-url',
    transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl),
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), siteUrlPlugin()],
  server: {
    port: 5173,
    proxy: {
      // Em dev, encaminha chamadas /api para o backend Fastify (modo self-host).
      '/api': 'http://localhost:3333',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
