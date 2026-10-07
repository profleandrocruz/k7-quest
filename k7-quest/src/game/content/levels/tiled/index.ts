/**
 * src/game/content/levels/tiled/index.ts — FASES QUE VIERAM DO TILED.
 *
 * Gerado por `npm run levels:import -- --write`. Cada fase e um `LevelDefinition`
 * comum, com a mesma validacao de qualquer outra (ver `levels/validate.ts`): importar
 * do Tiled nao cria um caminho sem teste, so um caminho mais curto.
 */
import type { LevelDefinition } from '../../../types';
import { w1BossMeninoEterno } from './w1-boss-menino-eterno';
import { w1L1Parque } from './w1-l1-parque';
import { w1L2Castelo } from './w1-l2-castelo';
import { w1L3Bosque } from './w1-l3-bosque';

/** As fases vindas do Tiled, na ordem em que os mapas foram lidos. */
export const TILED_LEVELS: readonly LevelDefinition[] = [
  w1BossMeninoEterno,
  w1L1Parque,
  w1L2Castelo,
  w1L3Bosque,
];
