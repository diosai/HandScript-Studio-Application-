import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pkg = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Relative base so the built bundle also loads from file:// inside Electron.
  base: './',
  resolve: {
    alias: {
      '@handscript/utils': pkg('utils'),
      '@handscript/shared': pkg('shared'),
      '@handscript/handwriting-engine': pkg('handwriting-engine'),
      '@handscript/paper-engine': pkg('paper-engine'),
      '@handscript/export-engine': pkg('export-engine'),
      '@handscript/print-engine': pkg('print-engine'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
