/**
 * src/engine/useGameLoop.ts — O UNICO DONO DO TEMPO (Lentes #18, #29, #60).
 *
 * Decisao de arquitetura: o loop NAO vive dentro do Phaser nem de um componente de tela.
 * Vive aqui, em um lugar so. Consequencias:
 *   - o jogo roda enquanto o canvas carrega, e continua correto se o motor falhar;
 *   - existe UM driver de tempo no projeto inteiro (dois drivers = dois mundos);
 *   - a cena Phaser apenas DESENHA o que o dominio decidiu (Lente #92).
 *
 * O loop roda FORA do ciclo de render do React: nada aqui chama setState direto. O que
 * chega ao React e o snapshot throttle da store (ver `store.ts`).
 */
import { useEffect } from 'react';
import { SIM_STEP_MS } from '../game';
import { createFixedStepLoop } from './fixedStep';
import { stepGame } from './store';

/**
 * Roda a simulacao enquanto `isRunning` for verdadeiro.
 *
 * `isRunning` vem do MODO (`phase === 'playing'`), nunca de um booleano paralelo:
 * pausar significa (fase = 'paused') **e** (loop parado) — as duas coisas, sempre.
 */
export function useGameLoop(isRunning: boolean): void {
  useEffect(() => {
    if (!isRunning) return;

    // Acumulador novo a cada partida/retomada: retomar nunca "recupera" o tempo pausado.
    const loop = createFixedStepLoop();
    let frameId = 0;
    let last = performance.now();

    const frame = (now: number): void => {
      const elapsed = now - last;
      last = now;

      const steps = loop.advance(elapsed);
      for (let i = 0; i < steps; i += 1) stepGame(SIM_STEP_MS);

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [isRunning]);
}
