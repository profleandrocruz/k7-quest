/**
 * src/game/rules/progress.ts — INTERACAO COM O MUNDO: coletaveis, checkpoints, dano.
 *
 * Regras de ouro aplicadas aqui:
 *   - Lente #40 (Recompensas): toda recompensa tem impacto IMEDIATO e visivel.
 *   - Lente #41 (Punicao): dano tira pouco e nunca reinicia a fase inteira.
 *   - Lente #49 (Progresso visivel): cada fragmento move a restauracao da regiao.
 *   - Lente #34 (Prazer x Dor): espinho tira 1 de vida — ensina, nao humilha.
 */
import { BALANCE } from '../gameBalance';
import type { Entity, EntityKind, GameEvent, GameProgress, GameState, Objective, PlayerState } from '../types';
import { boxOf, entityBox, gridHazard, overlaps } from './geometry';
import { grantAbilityToPlayer } from './tapes';
import { ECHO_ABILITY } from './echoes';
import { isEnemy } from './tilemap';

export function applyDamage(player: PlayerState, amount: number, from?: Entity): PlayerState {
  // Invencibilidade pos-dano: o jogador entende que o erro foi o CONTATO,
  // nao a falta de reflexo (Lente #53).
  if (player.invulnerableMs > 0 || amount <= 0) return player;

  const goingRight = from ? from.position.x < player.position.x : player.facing === 'left';
  const knockback = BALANCE.player.knockback;

  return {
    ...player,
    health: Math.max(0, player.health - amount),
    invulnerableMs: BALANCE.player.invulnerableAfterHitMs,
    velocity: { x: goingRight ? knockback.x : -knockback.x, y: knockback.y },
  };
}

export function healPlayer(player: PlayerState, amount: number): PlayerState {
  return { ...player, health: Math.min(player.maxHealth, player.health + amount) };
}

export function isDead(player: PlayerState): boolean {
  return player.health <= 0;
}

/** Categoria de coletavel. Tabela em vez de switch: novo tipo = uma linha (Lente #24). */
export type CollectorKind = 'fragment' | 'floppy' | 'cartridge' | 'memory';

export const COLLECTIBLE_OF_KIND: Partial<Record<EntityKind, CollectorKind>> = {
  pixelFragment: 'fragment',
  floppy: 'floppy',
  cartridge: 'cartridge',
  lostMemory: 'memory',
};

const COLLECTOR_EVENT: Record<CollectorKind, GameEvent['kind']> = {
  fragment: 'fragmentCollected',
  floppy: 'floppyCollected',
  cartridge: 'cartridgeCollected',
  memory: 'memoryCollected',
};

/** Aplica um coletavel ao progresso. Cada um tem UM efeito claro (Lente #40). */
function collect(
  progress: GameProgress,
  kind: CollectorKind,
  entity: Entity,
  levelId: string,
): GameProgress {
  switch (kind) {
    case 'fragment':
      return {
        ...progress,
        fragments: progress.fragments + 1,
        // Lente #49: restauracao ACUMULA e e visivel, nao um contador abstrato.
        regionRestoration: {
          ...progress.regionRestoration,
          [levelId]: Math.min(
            1,
            (progress.regionRestoration[levelId] ?? 0) +
              1 / BALANCE.rewards.fragmentsPerRestorationStep,
          ),
        },
      };
    case 'floppy':
      return { ...progress, floppies: [...progress.floppies, entity.id] };
    case 'cartridge':
      return { ...progress, cartridges: [...progress.cartridges, entity.id] };
    case 'memory':
      return { ...progress, lostMemories: [...progress.lostMemories, entity.id] };
  }
}

/**
 * Resolve TODAS as interacoes do tick: um unico lugar decide o que o contato significa.
 * Ordem importa: perigo primeiro (feedback), recompensa depois (reforco) — Lente #58.
 */
export function stepInteractions(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const layer = state.level.eras[state.player.era];
  if (!layer) return state;

  const events: GameEvent[] = [];
  const playerBox = boxOf(state.player);
  const collected = new Set<string>();

  let player = state.player;
  let progress = state.progress;
  let activeCheckpointId = state.level.activeCheckpointId;
  let levelComplete = false;

  // -------------------------------------------------------------------------
  // 1. Perigo da GRADE: espinhos (o mapa manda, nao a entidade)
  // -------------------------------------------------------------------------
  if (gridHazard(layer.collision, playerBox) && !state.debug.invulnerable) {
    const before = player.health;
    player = applyDamage(player, BALANCE.enemies.spikeDamage);
    if (player.health < before) {
      events.push({ kind: 'damaged', tick: state.tick, message: 'espinho', at: player.position });
    }
  }

  // -------------------------------------------------------------------------
  // 2. Contato com entidades da era ativa
  // -------------------------------------------------------------------------
  for (const entity of layer.entities) {
    if (entity.collected) continue;
    if (entity.era !== null && entity.era !== state.player.era) continue;
    if (!overlaps(playerBox, entityBox(entity))) continue;

    const collector = COLLECTIBLE_OF_KIND[entity.kind];
    if (collector) {
      collected.add(entity.id);
      progress = collect(progress, collector, entity, state.level.id);
      events.push({
        kind: COLLECTOR_EVENT[collector],
        tick: state.tick,
        message: entity.id,
        at: entity.position,
      });
      continue;
    }

    if (entity.kind === 'checkpoint') {
      if (activeCheckpointId !== entity.id) {
        activeCheckpointId = entity.id;
        // Lente #41: respirar de graca faz parte de respeitar o tempo do jogador.
        player = healPlayer(player, player.maxHealth);
        events.push({
          kind: 'checkpointReached',
          tick: state.tick,
          message: entity.id,
          at: entity.position,
        });
      }
      continue;
    }

    if (entity.kind === 'echoAnchor') {
      // A ancora ENSINA o conceito e depois desaparece: uma vez por partida.
      const before = player.unlockedAbilities.length;
      player = grantAbilityToPlayer(player, ECHO_ABILITY);
      if (player.unlockedAbilities.length > before) {
        collected.add(entity.id);
        events.push({
          kind: 'echoAnchorFound',
          tick: state.tick,
          message: 'gravador',
          at: entity.position,
        });
      }
      continue;
    }

    if (entity.kind === 'goal') {
      levelComplete = true;
      events.push({ kind: 'levelComplete', tick: state.tick, at: entity.position });
      continue;
    }

    if (entity.kind === 'spike') {
      if (!state.debug.invulnerable) {
        const before = player.health;
        player = applyDamage(player, BALANCE.enemies.spikeDamage);
        if (player.health < before) {
          events.push({
            kind: 'damaged',
            tick: state.tick,
            message: 'espinho',
            at: entity.position,
          });
        }
      }
      continue;
    }

    if (entity.kind === 'breakableBlock' || entity.kind === 'bossGate') continue;

    // Inimigo: dano por contato. Sem estados de ataque longos (Lente #42).
    if (isEnemy(entity.kind) && !state.debug.invulnerable && player.health > 0) {
      const before = player.health;
      player = applyDamage(player, BALANCE.enemies.damageContact, entity);
      if (player.health < before) {
        events.push({
          kind: 'damaged',
          tick: state.tick,
          message: entity.kind,
          at: player.position,
        });
      }
      if (player.health <= 0) {
        events.push({ kind: 'died', tick: state.tick, at: player.position });
      }
    }
  }

  let next: GameState = {
    ...state,
    player,
    progress,
    level: { ...state.level, activeCheckpointId, eras: markCollected(state.level.eras, collected) },
    events: events.length > 0 ? [...state.events, ...events] : state.events,
  };

  if (levelComplete) next = completeObjectives(next);
  return next;
}

/** Marca como coletadas as entidades consumidas neste tick. */
function markCollected(
  eras: GameState['level']['eras'],
  collected: Set<string>,
): GameState['level']['eras'] {
  if (collected.size === 0) return eras;

  const out: GameState['level']['eras'] = {};
  for (const [eraId, layer] of Object.entries(eras)) {
    out[eraId] = {
      ...layer,
      entities: layer.entities.map((e) => (collected.has(e.id) ? { ...e, collected: true } : e)),
    };
  }
  return out;
}

/** Progresso ATUAL de um objetivo, medido DENTRO desta fase (nunca no total global). */
export function objectiveProgress(state: GameState, objective: Objective): number {
  if (objective.kind === 'collectFragments') {
    return Math.max(0, state.progress.fragments - state.level.fragmentsAtStart);
  }
  return state.progress.objectivesDone.includes(objective.id) ? 1 : 0;
}

/** Quanto falta para o objetivo. `collectFragments` usa `target`; os outros sao binarios. */
export function objectiveTarget(objective: Objective): number {
  return objective.kind === 'collectFragments' ? objective.target ?? 0 : 1;
}

/** Marca os objetivos satisfeitos pelo estado atual (idempotente). */
export function completeObjectives(state: GameState): GameState {
  const done = new Set(state.progress.objectivesDone);
  const events: GameEvent[] = [];

  for (const objective of state.level.objectives) {
    if (done.has(objective.id)) continue;

    // `reachGoal` nao tem progresso parcial: ele e cumprido no instante do contato —
    // que e exatamente o unico motivo pelo qual esta funcao e chamada.
    const satisfied =
      objective.kind === 'reachGoal' ||
      (objective.kind === 'collectFragments' &&
        objectiveProgress(state, objective) >= (objective.target ?? 0));

    if (satisfied) {
      done.add(objective.id);
      events.push({ kind: 'objectiveComplete', tick: state.tick, message: objective.description });
    }
  }

  return {
    ...state,
    progress: { ...state.progress, objectivesDone: [...done] },
    events: events.length > 0 ? [...state.events, ...events] : state.events,
  };
}
