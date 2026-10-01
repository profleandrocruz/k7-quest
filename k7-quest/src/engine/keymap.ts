/**
 * src/engine/keymap.ts — INPUT SEMANTICO (Lentes #53, #54, #55, #56).
 *
 * Regras do projeto (ver GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 8):
 *   1. Mapeia SEMANTICA, nunca teclas: o jogo entende "pular" e "trocar de era", nao
 *      "Space" e "Digit3". Isso e o que permite remapear, gamepad, toque e teclado sem
 *      tocar em nenhuma regra (Lente #56 — a interface precisa se tornar invisivel).
 *   2. Usa `event.code` (posicao FISICA), nunca `event.key`: assim Shift, CapsLock e
 *      teclado ABNT nao quebram o controle.
 *   3. Nenhum componente visual le input. Quem le e este arquivo, e o resultado sai
 *      como `GameAction` (o reducer nao sabe que existe teclado).
 *
 * O que este arquivo NAO faz: decidir regra. Ele TRADUZ tecla em intencao; validar se a
 * intencao e possivel (energia, era bloqueada, fase) e trabalho do dominio.
 */
import { ERA_ORDER, ERA_SHORTCUTS, TAPE_ORDER, TAPE_SHORTCUTS } from '../game';
import type { AvatarId, EraId, GameAction, GameState, TapeId } from '../game';

/** Intencao do jogador. Uma tecla produz UMA destas; a regra decide o que fazer com ela. */
export type KeyRole =
  /** Pular / avancar dialogo / comecar / renascer — depende do MODO (Lente #60). */
  | { kind: 'confirm' }
  | { kind: 'dash' }
  | { kind: 'era'; era: EraId }
  | { kind: 'tape'; tape: TapeId }
  /** Pausar, retomar ou fechar menu — tambem depende do modo. */
  | { kind: 'pause' }
  | { kind: 'openTape' }
  | { kind: 'openEra' };

export interface ResolveContext {
  state: GameState;
  /** Avatar escolhido na tela de titulo (o dominio so o conhece no `START_GAME`). */
  avatar: AvatarId;
  seed?: number;
}

/**
 * Teclas de ACAO (borda). Os atalhos de era e de fita sao DERIVADOS das tabelas
 * canonicas em `constants.ts`: o que o HUD mostra e exatamente a tecla que funciona.
 */
const ERA_KEYS: Record<string, KeyRole> = Object.fromEntries(
  ERA_ORDER.map((era, index) => [
    `Digit${ERA_SHORTCUTS[index] ?? ''}`,
    { kind: 'era', era } as KeyRole,
  ]),
);

const TAPE_KEYS: Record<string, KeyRole> = Object.fromEntries(
  TAPE_ORDER.map((tape, index) => [
    `Key${(TAPE_SHORTCUTS[index] ?? '').toUpperCase()}`,
    { kind: 'tape', tape } as KeyRole,
  ]),
);

export const KEYMAP: Readonly<Record<string, KeyRole>> = {
  // Pular / confirmar. Space divide as duas funcoes de proposito: e o que o jogador
  // ja espera de um plataforma, e a FASE decide qual das duas acontece.
  Space: { kind: 'confirm' },
  Enter: { kind: 'confirm' },
  NumpadEnter: { kind: 'confirm' },
  ArrowUp: { kind: 'confirm' },
  KeyW: { kind: 'confirm' },

  // Dash (Lente #55: uma tecla de compromisso, curta e clara).
  ShiftLeft: { kind: 'dash' },
  ShiftRight: { kind: 'dash' },
  KeyK: { kind: 'dash' },

  // Atalhos diretos dos dois canais de decisao.
  ...ERA_KEYS,
  ...TAPE_KEYS,

  // Menus: "T" de tape, "R" de realidade (a era). Mnemonicas, nao convencoes.
  KeyT: { kind: 'openTape' },
  KeyR: { kind: 'openEra' },

  Escape: { kind: 'pause' },
};

/** Teclas de DIRECAO SEGURADA. Andar e o unico caso em que a continuidade e a mecanica. */
export const AXIS_KEYS: Readonly<Record<string, -1 | 1>> = {
  ArrowLeft: -1,
  KeyA: -1,
  ArrowRight: 1,
  KeyD: 1,
};

/** Teclas do jogo: nenhuma delas pode rolar a pagina nem roubar o foco (Lente #48). */
export function isGameKey(code: string): boolean {
  return KEYMAP[code] !== undefined || AXIS_KEYS[code] !== undefined;
}

/**
 * Eixo horizontal a partir das teclas PRESAS.
 *
 * As duas direcoes juntas = parar. Decisao (Lente #53): o jogador nunca deve "brigar
 * consigo mesmo" — apertar os dois lados por acidente tem resultado previsivel.
 */
export function axisFromHeld(held: Iterable<string>): -1 | 0 | 1 {
  let left = false;
  let right = false;
  for (const code of held) {
    const dir = AXIS_KEYS[code];
    if (dir === -1) left = true;
    else if (dir === 1) right = true;
  }
  if (left && right) return 0;
  if (right) return 1;
  if (left) return -1;
  return 0;
}


/**
 * Traduz intencao + MODO em acoes. Funcao PURA: da para testar todo o controle sem
 * navegador nenhum (Lente #22).
 *
 * `pressed = false` significa "a tecla foi solta" — usado apenas pelo pulo variavel.
 */
export function actionsFor(role: KeyRole, pressed: boolean, ctx: ResolveContext): GameAction[] {
  const { phase } = ctx.state;

  switch (role.kind) {
    case 'confirm': {
      // O MESMO botao, quatro significados: e o MODO que escolhe (Lente #60).
      if (phase === 'dialogue') return pressed ? [{ type: 'ADVANCE_DIALOGUE' }] : [];
      if (phase === 'title') {
        return pressed ? [{ type: 'START_GAME', avatar: ctx.avatar, seed: ctx.seed }] : [];
      }
      if (phase === 'gameOver') return pressed ? [{ type: 'RESPAWN' }] : [];
      // No jogo soltar IMPORTA: e o que corta o pulo (Lente #24).
      if (phase === 'playing') return [{ type: 'JUMP', pressed }];
      return [];
    }

    case 'dash':
      return pressed && phase === 'playing' ? [{ type: 'DASH' }] : [];

    case 'era':
      if (!pressed) return [];
      if (phase === 'eraSelect') {
        return [{ type: 'SWITCH_ERA', era: role.era }, { type: 'CLOSE_MENU' }];
      }
      return phase === 'playing' ? [{ type: 'SWITCH_ERA', era: role.era }] : [];

    case 'tape':
      if (!pressed) return [];
      if (phase === 'tapeSelect') {
        return [{ type: 'SWITCH_TAPE', tape: role.tape }, { type: 'CLOSE_MENU' }];
      }
      return phase === 'playing' ? [{ type: 'SWITCH_TAPE', tape: role.tape }] : [];

    case 'pause':
      if (!pressed) return [];
      if (phase === 'tapeSelect' || phase === 'eraSelect') return [{ type: 'CLOSE_MENU' }];
      if (phase === 'paused') return [{ type: 'RESUME' }];
      // Pausar SEMPRE, inclusive no dialogo: sair a qualquer momento (Lente #39).
      if (phase === 'playing' || phase === 'dialogue' || phase === 'bossIntro') {
        return [{ type: 'PAUSE' }];
      }
      return [];

    case 'openTape':
      return pressed && phase === 'playing' ? [{ type: 'OPEN_TAPE_SELECT' }] : [];

    case 'openEra':
      return pressed && phase === 'playing' ? [{ type: 'OPEN_ERA_SELECT' }] : [];
  }
}
