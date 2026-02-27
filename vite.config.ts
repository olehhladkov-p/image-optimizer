import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'client',
  server: {
    port: 5173,
    proxy: {
      '/optimize': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  plugins: [tailwindcss()]
});
