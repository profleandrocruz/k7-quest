import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Cada motor vira um chunk separado (ver docs/decisions/0002-motores-por-trabalho.md).
 * Motivo de design: Lente #18 (Fluxo) - o titulo do jogo nao pode esperar o download do Three.js.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          three: ['three', '@react-three/fiber'],
          pixi: ['pixi.js'],
          matter: ['matter-js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
