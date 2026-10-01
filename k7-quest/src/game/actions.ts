/**
 * src/game/actions.ts — COMANDOS ATOMICOS (Lente #24).
 *
 * Racional: toda acao do jogador e um comando serializavel.
 * Consequencias gratuitas: replay (= lista de comandos), depuracao, testes e
 * a possibilidade de o epilogo reexibir as acoes REAIS do jogador.
 *
 * Regra: uma acao nunca contem logica. Ela e um fato, nao uma instrucao complexa.
 */
import type { AbilityId, AvatarId, EraId, MotionInput, RenderMode, TapeId } from './types';

export type GameAction =
  // ----- Ciclo de vida -----
  | { type: 'BOOT_DONE' }
  | { type: 'OPEN_TITLE' }
  | { type: 'START_GAME'; avatar: AvatarId; seed?: number }
  | { type: 'UNLOCK_TAPE'; tape: TapeId; abilities: AbilityId[] }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'ENTER_ENDING' }

  // ----- Simulacao (Lente #24: poucas acoes, combinaveis) -----
  | { type: 'TICK'; deltaMs: number; input?: MotionInput }
  | { type: 'MOVE'; direction: -1 | 0 | 1 }
  | { type: 'JUMP'; pressed: boolean }
  | { type: 'DASH' }
  /** Habilidade da fita ativa. `ability` deve estar em unlockedAbilities. */
  | { type: 'USE_ABILITY'; ability: AbilityId }

  // ----- O diferencial do jogo (Lente #21) -----
  | { type: 'SWITCH_ERA'; era: EraId }
  /** Fitas alteram o ESTILO de jogo, nao apenas um numero (Lente #33). */
  | { type: 'SWITCH_TAPE'; tape: TapeId }

  // ----- Ecos (Lentes #8, #9) -----
  | { type: 'RECORD_ECHO' }
  | { type: 'STOP_RECORDING' }
  | { type: 'ACTIVATE_ECHO'; echoId: string }

  // ----- Fluxo de telas (Lente #60) -----
  | { type: 'OPEN_TAPE_SELECT' }
  | { type: 'OPEN_ERA_SELECT' }
  | { type: 'CLOSE_MENU' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ADVANCE_DIALOGUE' }
  | { type: 'RESPAWN' }
  | { type: 'SET_RENDER_MODE'; mode: RenderMode }

  // ----- Debug/playtest (Processo, secao 7.1) -----
  | { type: 'SET_DEBUG'; flags: Partial<{ invulnerable: boolean; showHitboxes: boolean; freeTapeSwitch: boolean }> };

/** Acoes que alteram o mundo e portanto NAO podem ser gravadas num eco. */
export const NON_SIMULATION_ACTIONS: ReadonlyArray<GameAction['type']> = [
  'BOOT_DONE',
  'OPEN_TITLE',
  'START_GAME',
  'UNLOCK_TAPE',
  'COMPLETE_LEVEL',
  'ENTER_ENDING',
  'OPEN_TAPE_SELECT',
  'OPEN_ERA_SELECT',
  'CLOSE_MENU',
  'PAUSE',
  'RESUME',
  'ADVANCE_DIALOGUE',
  'RESPAWN',
  'SET_RENDER_MODE',
  'SET_DEBUG',
  'RECORD_ECHO',
  'STOP_RECORDING',
];

export function isSimulationAction(action: GameAction): boolean {
  return !NON_SIMULATION_ACTIONS.includes(action.type);
}
