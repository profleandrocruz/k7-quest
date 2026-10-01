/**
 * src/game/rules/abilities.ts — APLICAR UMA HABILIDADE AO MUNDO.
 *
 * Separado de `tapes.ts` (que decide SE pode usar) porque aqui a pergunta e
 * diferente: O QUE acontece. Manter as duas perguntas separadas e o que permite
 * ajustar custo/cooldown sem tocar em efeito — e vice-versa (Lente #47).
 *
 * Regra de ouro: nenhuma habilidade pode ser recusada silenciosamente. Se falhar,
 * o jogador recebe um evento com MOTIVO legivel (Lente #56).
 */
import { ABILITIES } from '../content/abilities';
import { effectOf } from '../content/abilityEffects';
import { BALANCE } from '../gameBalance';
import { createRng } from '../rng';
import type { AbilityId, CollisionGrid, Entity, GameEvent, GameState, Vec2 } from '../types';
import { canUseAbility, payAbilityCost } from './tapes';
import { centerOf, boxOf } from './geometry';
import { isEnemy } from './tilemap';

export function useAbility(state: GameState, abilityId: AbilityId): GameState {
  if (state.phase !== 'playing') return state;

  const ability = ABILITIES[abilityId];
  if (!ability) return state;

  const check = canUseAbility(state, abilityId);
  if (!check.ok) {
    const event: GameEvent = {
      kind: 'abilityBlocked',
      tick: state.tick,
      message: check.reason ?? 'Habilidade indisponivel',
      at: state.player.position,
    };
    return { ...state, events: [...state.events, event] };
  }

  const center = centerOf(boxOf(state.player));
  let next: GameState = { ...state, player: payAbilityCost(state.player, abilityId) };
  const events: GameEvent[] = [
    { kind: 'abilityUsed', tick: state.tick, message: ability.name, at: center },
  ];

  const effect = effectOf(abilityId);

  switch (effect.kind) {
    case 'breakArea': {
      const grid = state.level.eras[state.player.era]?.collision;
      if (grid) {
        const result = breakTilesInRadius(grid, center, effect.radiusTiles);
        if (result.broken > 0) {
          next = replaceGrid(next, result.grid);
          events.push({
            kind: 'abilityUsed',
            tick: state.tick,
            message: `${result.broken} bloco(s) quebrado(s)`,
            at: center,
          });
        }
      }
      if (effect.alsoDamage) {
        const hit = damageEnemies(next, center, effect.radiusTiles, effect.alsoDamage);
        next = hit.state;
        events.push(...hit.events);
      }
      break;
    }

    case 'boost':
      next = {
        ...next,
        player: {
          ...next.player,
          motion: {
            ...next.player.motion,
            boostMs: effect.durationMs,
            boostSpeedScale: effect.speedScale,
          },
        },
      };
      break;

    case 'shield':
      // Escudo = invulnerabilidade temporaria. Simples de comunicar (Lente #42).
      next = {
        ...next,
        player: {
          ...next.player,
          invulnerableMs: Math.max(next.player.invulnerableMs, effect.durationMs),
        },
      };
      break;

    case 'freezeWorld':
      next = { ...next, timeFreezeMs: Math.max(next.timeFreezeMs, effect.durationMs) };
      break;

    case 'passive':
      // Sem efeito instantaneo: a habilidade age em outro sistema, documentado em
      // content/abilityEffects.ts. Ela nunca e um "botao morto silencioso".
      break;
  }

  return { ...next, events: [...state.events, ...events] };
}

/** Decai o congelamento temporal do mundo. */
export function tickAbilityTimers(state: GameState, dtMs: number): GameState {
  const timeFreezeMs = Math.max(0, state.timeFreezeMs - dtMs);
  if (timeFreezeMs === state.timeFreezeMs) return state;
  return { ...state, timeFreezeMs };
}

/** Quebra todos os Blocos ('B') dentro do raio. Espinhos e paredes NAO sao afetados. */
export function breakTilesInRadius(
  grid: CollisionGrid,
  center: Vec2,
  radiusTiles: number,
): { grid: CollisionGrid; broken: number } {
  const ts = grid.tileSize;
  const cx = center.x / ts;
  const cy = center.y / ts;
  const r2 = radiusTiles * radiusTiles;
  let broken = 0;

  const rows = grid.rows.map((line, ty) => {
    let out = '';
    for (let tx = 0; tx < line.length; tx += 1) {
      const ch = line[tx] ?? '.';
      if (ch !== 'B') {
        out += ch;
        continue;
      }
      const dx = tx + 0.5 - cx;
      const dy = ty + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        out += '.';
        broken += 1;
      } else {
        out += ch;
      }
    }
    return out;
  });

  if (broken === 0) return { grid, broken: 0 };
  return { grid: { ...grid, rows }, broken };
}

/** Troca a grade de colisao da era ATIVA (blocos quebrados sao permanentes na fase). */
function replaceGrid(state: GameState, grid: CollisionGrid): GameState {
  const era = state.player.era;
  const layer = state.level.eras[era];
  if (!layer) return state;
  return {
    ...state,
    level: {
      ...state.level,
      eras: { ...state.level.eras, [era]: { ...layer, collision: grid } },
    },
  };
}

/**
 * Dano em area com drop SEMEADO.
 * O drop usa `seed + tick`: reproduzivel e auditavel (Lente #29).
 */
function damageEnemies(
  state: GameState,
  center: Vec2,
  radiusTiles: number,
  damage: number,
): { state: GameState; events: GameEvent[] } {
  const era = state.player.era;
  const layer = state.level.eras[era];
  if (!layer) return { state, events: [] };

  const radius = radiusTiles * layer.collision.tileSize;
  const rng = createRng(state.seed + state.tick);
  const events: GameEvent[] = [];
  let defeated = 0;

  const entities: Entity[] = layer.entities.map((entity) => {
    if (entity.collected || !isEnemy(entity.kind)) return entity;

    const ec = centerOf({
      x: entity.position.x,
      y: entity.position.y,
      w: entity.size.x,
      h: entity.size.y,
    });
    if (Math.hypot(ec.x - center.x, ec.y - center.y) > radius) return entity;

    const health = (entity.health ?? 1) - damage;
    if (health > 0) return { ...entity, health };

    defeated += 1;
    events.push({
      kind: 'enemyDefeated',
      tick: state.tick,
      message: entity.kind,
      at: entity.position,
    });

    // Lente #29: probabilidade visivel em BALANCE, nunca escondida no codigo.
    if (rng.chance(BALANCE.floppyDropChance.enemy)) {
      events.push({
        kind: 'floppyCollected',
        tick: state.tick,
        message: `drop.${entity.id}`,
        at: entity.position,
      });
    }
    return { ...entity, collected: true };
  });

  if (defeated === 0) return { state, events: [] };

  return {
    state: {
      ...state,
      level: {
        ...state.level,
        eras: { ...state.level.eras, [era]: { ...layer, entities } },
      },
    },
    events,
  };
}
