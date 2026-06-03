/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path da aplicação. No GitHub Pages de projeto, o site fica em
// `usuario.github.io/<repo>/`, então passamos `BASE_PATH=/<repo>/` no build.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
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
