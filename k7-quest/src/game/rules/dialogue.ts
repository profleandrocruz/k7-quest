/**
 * src/game/rules/dialogue.ts — NARRATIVA COMO DADO, NUNCA COMO CENA CODIFICADA.
 *
 * Lentes aplicadas:
 *   - #39 (Ritmo): toda fala e `skippable` na segunda vez. Nada e mais hostil que
 *     repetir um dialogo que o jogador ja leu.
 *   - #64 (Projecao): as falas sugerem emocao; nao explicam o que sentir.
 *   - #65 (Mostrar por mecanica): se uma cena explica algo que o jogador poderia
 *     JOGAR, ela deve virar gameplay. Por isso so existe dialogo onde ha motivo.
 */
import type { DialogueTrigger, GameState } from '../types';

export function findTrigger(
  state: GameState,
  when: DialogueTrigger['when'],
  zoneId?: string,
): DialogueTrigger | undefined {
  return state.level.dialogueSource.find(
    (trigger) => trigger.when === when && (zoneId === undefined || trigger.zoneId === zoneId),
  );
}

export function beginDialogue(state: GameState, trigger: DialogueTrigger): GameState {
  if (trigger.lines.length === 0) return state;
  return {
    ...state,
    phase: 'dialogue',
    dialogue: {
      id: trigger.id,
      lines: trigger.lines,
      index: 0,
      skippable: trigger.skippable,
    },
    events: [
      ...state.events,
      { kind: 'dialogueStart', tick: state.tick, message: trigger.id },
    ],
  };
}

/**
 * Avanca uma fala. No fim, volta para 'playing'.
 *
 * O retorno sempre e para 'playing': a alternativa ('cutscene') so existe para
 * sequencias sem controle do jogador, e mantê-las separadas evita o bug classico
 * de "o jogador ficou preso sem controle".
 */
export function advanceDialogue(state: GameState): GameState {
  const dialogue = state.dialogue;
  if (!dialogue) return state;

  const nextIndex = dialogue.index + 1;
  if (nextIndex < dialogue.lines.length) {
    return { ...state, dialogue: { ...dialogue, index: nextIndex } };
  }

  return {
    ...state,
    dialogue: null,
    phase: 'playing',
    events: [...state.events, { kind: 'dialogueEnd', tick: state.tick, message: dialogue.id }],
  };
}

/** Pula a sequencia inteira (Lente #39). */
export function skipDialogue(state: GameState): GameState {
  if (!state.dialogue) return state;
  return {
    ...state,
    dialogue: null,
    phase: 'playing',
    events: [...state.events, { kind: 'dialogueEnd', tick: state.tick, message: 'skipped' }],
  };
}

export function currentLine(state: GameState) {
  const dialogue = state.dialogue;
  if (!dialogue) return undefined;
  return dialogue.lines[dialogue.index];
}

/**
 * Dispara o bloco `onStart` da fase, se houver.
 *
 * Chamado ao CARREGAR uma fase jogavel (inicio de partida e avanco de fase), nunca no
 * estado de boot: o titulo do jogo nao tem dialogo (Lente #39 — cada fala no seu momento).
 */
export function triggerOnStart(state: GameState): GameState {
  const trigger = findTrigger(state, 'onStart');
  return trigger ? beginDialogue(state, trigger) : state;
}
