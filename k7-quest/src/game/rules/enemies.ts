/**
 * src/game/rules/enemies.ts — VIDA NO MUNDO SEM O JOGADOR.
 *
 * Escopo do vertical slice: patrulha, gravidade e deteccao de beirada.
 * Motivo de design (Lente #44 — Interesse): o inimigo do K7 Quest existe para criar
 * RITMO no caminho, nao para ser um saco de pancada. Por isso ele anda, para, e
 * volta atras: o jogador aprende o padrao e escolhe o momento de passar.
 *
 * O congelamento temporal (`timeFreezeMs`) PARA os inimigos. Isso torna a Fita Jazz
 * e a Eletronica mecanicamente diferentes, e nao apenas mais rapidas (Lente #33).
 */
import { BALANCE } from '../gameBalance';
import type { Entity, GameState } from '../types';
import { gridCollides, isSolidCode, codeAt } from './geometry';
import { isEnemy } from './tilemap';
import { moveAxis } from './motion';

/** Velocidade base de patrulha, em px/s. */
const PATROL_SPEED = 46;

/** Meia-largura de amostra para detectar beirada (evita cair do mapa). */
const LEDGE_PROBE = 2;

export function stepEnemies(state: GameState, dtMs: number): GameState {
  // Mundo congelado: nada se move. Efeito de habilidade, nao de codigo de pausa.
  if (state.timeFreezeMs > 0) return state;

  const era = state.player.era;
  const layer = state.level.eras[era];
  if (!layer) return state;

  const dt = dtMs / 1000;
  let changed = false;

  const entities: Entity[] = layer.entities.map((entity) => {
    if (entity.collected || !isEnemy(entity.kind)) return entity;

    const patrol = Number(entity.props?.patrol ?? 0);
    let vx = entity.velocity?.x ?? 0;
    let vy = entity.velocity?.y ?? 0;
    let position = { ...entity.position };

    // Gravidade: o inimigo cai se a plataforma sob ele desaparecer (Bug de Memoria).
    vy = Math.min(vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);
    const vertical = moveAxis(layer.collision, position, entity.size, 0, vy * dt);
    position = vertical.position;
    if (vertical.blocked) vy = 0;

    if (patrol > 0) {
      if (vx === 0) vx = PATROL_SPEED;

      const horizontal = moveAxis(layer.collision, position, entity.size, vx * dt, 0);
      if (horizontal.blocked) {
        vx = -vx;
      } else {
        position = horizontal.position;
        // Beirada: sem chao a frente, o inimigo desiste — fica vivo e visivel (Lente #44).
        const aheadX = position.x + (vx > 0 ? entity.size.x + LEDGE_PROBE : -LEDGE_PROBE);
        const footY = position.y + entity.size.y + LEDGE_PROBE;
        const tileX = Math.floor(aheadX / layer.collision.tileSize);
        const tileY = Math.floor(footY / layer.collision.tileSize);
        if (!isSolidCode(codeAt(layer.collision, tileX, tileY))) vx = -vx;
      }
    }

    // Se estiver preso dentro de um bloco (troca de era), empurra para fora.
    if (gridCollides(layer.collision, { x: position.x, y: position.y, w: entity.size.x, h: entity.size.y })) {
      const nudge = moveAxis(layer.collision, position, entity.size, 0, -entity.size.y / 2);
      position = nudge.position;
    }

    if (position.x === entity.position.x && position.y === entity.position.y && vx === (entity.velocity?.x ?? 0)) {
      return entity;
    }

    changed = true;
    return { ...entity, position, velocity: { x: vx, y: vy } };
  });

  if (!changed) return state;

  return {
    ...state,
    level: {
      ...state.level,
      eras: { ...state.level.eras, [era]: { ...layer, entities } },
    },
  };
}

/** Inimigos vivos na era ativa (a Pixi/Phaser usa para desenhar). */
export function livingEnemies(state: GameState, era = state.player.era): Entity[] {
  return (state.level.eras[era]?.entities ?? []).filter((e) => isEnemy(e.kind) && !e.collected);
}
