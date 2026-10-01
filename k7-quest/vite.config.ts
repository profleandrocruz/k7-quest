import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Cada motor de render vira um chunk separado (ADR: docs/decisions/0002-motores-por-trabalho.md).
 * Motivo de design (Lente #18 - Fluxo): o titulo do jogo nao pode esperar o download de um
 * motor que so sera usado no Mundo 4.
 *
 * REGRA DESTE BLOCO: um chunk so e declarado quando existe uma cena que importa o motor.
 * Configurar chunk para uma biblioteca que ninguem importa e configuracao morta — ela mente
 * sobre o que o jogo carrega. Cada motor entra aqui junto com a sua cena:
 *
 *   - `phaser`   -> src/engine/phaser/PlatformerScene.ts          (agora)
 *   - `three`    -> src/engine/three/...                          (marco 5: a era 3D)
 *   - `pixi`     -> src/engine/pixi/...                           (marco 4: o K7 Deck)
 *   - `matter`   -> src/engine/matter/...                         (marco 6: puzzles de fisica)
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
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
