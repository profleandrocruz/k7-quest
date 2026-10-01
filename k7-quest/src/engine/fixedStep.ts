/**
 * src/engine/fixedStep.ts — O RELOGIO DO JOGO (Lentes #18, #29).
 *
 * O problema: o `requestAnimationFrame` entrega intervalos irregulares (16,7 ms na
 * maioria, 33 ms quando a maquina engasga, 400 ms quando a aba volta do background).
 * Se a fisica usasse esse intervalo direto, o jogador de uma maquina lenta atravessaria
 * paredes e uma curva de dificuldade deixaria de existir.
 *
 * A solucao: ACUMULAR o tempo real e executar passos LOGICOS de tamanho fixo.
 * Consequencias que importam para o design:
 *   - o jogo se comporta igual em 30 Hz e em 144 Hz (Lente #30 — Justica);
 *   - o replay e os testes reproduzem exatamente (Lentes #22, #29);
 *   - a colisao por varredura nunca "pula" por um tile.
 *
 * Este arquivo NAO conhece React nem Phaser: e um acumulador puro, testavel headless.
 * A UI usa via `useGameLoop`; a cena Phaser poderia usar o mesmo objeto.
 */
import { MAX_FRAME_MS, MAX_STEPS_PER_FRAME, SIM_STEP_MS } from '../game';

export interface FixedStepLoop {
  /**
   * Informa quanto tempo real passou e recebe quantos passos logicos executar.
   * O chamador roda `step(stepMs)` essa quantidade de vezes.
   */
  advance(elapsedMs: number): number;
  /** Zera o acumulador. Obrigatorio ao (re)iniciar: evita rajada de passos. */
  reset(): void;
}

export function createFixedStepLoop(
  stepMs: number = SIM_STEP_MS,
  maxSteps: number = MAX_STEPS_PER_FRAME,
): FixedStepLoop {
  let accumulator = 0;

  return {
    advance(elapsedMs: number): number {
      // Um frame absurdo (aba em background, travada do sistema) e DESCARTADO, nao
      // recuperado em rajada: "recuperar" o tempo parado faria o jogador voltar para
      // um mundo que andou sem ele (Lente #41 — respeitar o tempo de quem jogou).
      const frame = Math.min(Math.max(elapsedMs, 0), MAX_FRAME_MS);
      accumulator += frame;

      let steps = 0;
      while (accumulator >= stepMs && steps < maxSteps) {
        accumulator -= stepMs;
        steps += 1;
      }

      // Estourou o teto: o resto e perdido (espiral da morte nunca acontece).
      if (steps === maxSteps) accumulator = 0;

      return steps;
    },

    reset(): void {
      accumulator = 0;
    },
  };
}
