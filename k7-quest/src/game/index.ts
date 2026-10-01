/**
 * src/game/index.ts — API PUBLICA DO DOMINIO.
 *
 * Regra de arquitetura (GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 1):
 *   "Se um arquivo em src/game/ importa react, a arquitetura esta errada."
 * E o corolario usado aqui: se `src/ui/` importa `./game/rules/*`, a arquitetura tambem
 * esta errada. A UI consome ESTE barril: estado + acoes + seletores.
 *
 * `rules/*` continua publico para testes e para a camada de engine (que precisa dos
 * passos de simulacao), mas o caminho CURTO da UI nao passa por lá.
 */
export type * from './types';
export { ERA_ORDER, TAPE_ORDER } from './types';

// Comandos e transicao de estado
export type { GameAction } from './actions';
export { dispatch, reduce } from './reduce';
export { createInitialState, createMotionState, createPlayer, loadLevel, startGame } from './initialState';

// Leitura (a UI pergunta por aqui)
export * from './selectors';

// Numeros ajustaveis e constantes estruturais
export { BALANCE } from './gameBalance';
export {
  CAMPAIGN_START_WORLD,
  ERA_SHORTCUTS,
  HUD_PUBLISH_EVERY_STEPS,
  MAX_ECHO_FRAMES,
  MAX_FRAME_MS,
  MAX_LOG_ENTRIES,
  MAX_STEPS_PER_FRAME,
  SAVE_KEY,
  SIM_HZ,
  SIM_STEP_MS,
  TAPE_SHORTCUTS,
  TILE_SIZE,
  WORLD_ORDER,
} from './constants';

// Determinismo (replay, seeds, pesos)
export * from './rng';

// Conteudo (dados, nunca logica)
export { ABILITIES, SIGNATURE_ABILITY } from './content/abilities';
export { ABILITY_EFFECTS } from './content/abilityEffects';
export { ERAS } from './content/eras';
export { TAPES } from './content/tapes';
export {
  CAMPAIGN_ORDER,
  getLevel,
  hasLevel,
  LEVELS,
  LEVELS_BY_ID,
  levelsOfWorld,
  nextLevelId,
  START_LEVEL_ID,
} from './content/levels';
export { formatIssues, validateAllLevels, validateLevel } from './content/levels/validate';
