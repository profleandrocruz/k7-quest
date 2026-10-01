/**
 * src/game/content/levels/index.ts — REGISTRO DE FASES.
 *
 * Um unico lugar resolve "qual e a proxima fase?". Nenhum componente React deve
 * conhecer a ordem da campanha — se conhecesse, mudar a ordem exigiria mexer em UI.
 */
import type { LevelDefinition, LevelId, WorldId } from '../../types';
import { W1_BOSS, W1_L1, W1_L2, W1_L3 } from './world1';

export const LEVELS: readonly LevelDefinition[] = [W1_L1, W1_L2, W1_L3, W1_BOSS];

export const LEVELS_BY_ID: Record<LevelId, LevelDefinition> = Object.fromEntries(
  LEVELS.map((level) => [level.id, level]),
);

export const CAMPAIGN_ORDER: readonly LevelId[] = LEVELS.map((level) => level.id);

export const START_LEVEL_ID: LevelId = CAMPAIGN_ORDER[0] ?? 'w1-l1-parque';

export function getLevel(id: LevelId): LevelDefinition {
  const level = LEVELS_BY_ID[id];
  if (!level) throw new Error(`Fase desconhecida: "${id}". Registre-a em levels/index.ts.`);
  return level;
}

export function hasLevel(id: LevelId): boolean {
  return LEVELS_BY_ID[id] !== undefined;
}

/** Proxima fase, ou `null` quando o vertical slice termina. */
export function nextLevelId(id: LevelId): LevelId | null {
  const index = CAMPAIGN_ORDER.indexOf(id);
  if (index < 0) return null;
  return CAMPAIGN_ORDER[index + 1] ?? null;
}

export function levelsOfWorld(world: WorldId): LevelDefinition[] {
  return LEVELS.filter((level) => level.world === world);
}
