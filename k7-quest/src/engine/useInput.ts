/**
 * src/engine/useInput.ts — A TECLA VIRA INTENCAO, A INTENCAO VIRA ACAO (Lente #56).
 *
 * Este arquivo e o UNICO lugar do projeto que conhece teclado. Nenhum componente visual
 * le input (regra do doc de arquitetura, secao 8), e o dominio nunca soube que existe.
 *
 * Cuidados que existem por MOTIVO, nao por perfeccionismo:
 *   - `event.code` (posicao fisica): Shift, CapsLock e ABNT nao quebram o controle.
 *   - teclas presas: se a janela perde o foco, TUDO e solto. Sem isso o jogador volta
 *     para um personagem "andando sozinho" — e culpa o jogo (Lente #30).
 *   - foco em controle de formulario: o DOM cuida. Acessibilidade primeiro (Lente #48):
 *     um botao focado precisa continuar respondendo a Space/Enter.
 *   - `preventDefault` nas teclas do jogo: a pagina nao rola durante o play.
 */
import { useEffect } from 'react';
import { AXIS_KEYS, KEYMAP, actionsFor, axisFromHeld, isGameKey } from './keymap';
import type { ResolveContext } from './keymap';
import { getGameState, getRunSeed, getSelectedAvatar, refreshHud, send } from './store';

export function useInput(): void {
  useEffect(() => {
    /** Teclas de direcao atualmente presas (andar e o unico estado continuo). */
    const held = new Set<string>();

    const context = (): ResolveContext => ({
      state: getGameState(),
      avatar: getSelectedAvatar(),
      seed: getRunSeed(),
    });

    /** Um controle de formulario focado manda mais que o jogo (Lente #48). */
    const belongsToDom = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      if (!element || typeof element.closest !== 'function') return false;
      return element.closest('button, input, select, textarea, a, [contenteditable="true"]') !== null;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      // Auto-repeat do sistema NUNCA chega ao jogo: andar e tratado pelo conjunto de
      // teclas presas, e repetir troca de era so geraria eventos de recusa em serie.
      if (event.repeat) return;
      if (!isGameKey(event.code) || belongsToDom(event.target)) return;
      event.preventDefault();

      const axis = AXIS_KEYS[event.code];
      if (axis !== undefined) {
        if (held.has(event.code)) return; // auto-repeat do sistema: ignora
        held.add(event.code);
        send({ type: 'MOVE', direction: axisFromHeld(held) });
        return;
      }

      const role = KEYMAP[event.code];
      if (!role) return;
      for (const action of actionsFor(role, true, context())) send(action);
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (!isGameKey(event.code) || belongsToDom(event.target)) return;
      event.preventDefault();

      if (AXIS_KEYS[event.code] !== undefined) {
        held.delete(event.code);
        send({ type: 'MOVE', direction: axisFromHeld(held) });
        return;
      }

      const role = KEYMAP[event.code];
      if (!role) return;
      // Soltar importa: e assim que o pulo variavel corta a altura (Lente #24).
      for (const action of actionsFor(role, false, context())) send(action);
    };

    /** Janela perdeu o foco: solta tudo e para de andar. */
    const onBlur = (): void => {
      if (held.size > 0) held.clear();
      send({ type: 'MOVE', direction: 0 });
      refreshHud();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
