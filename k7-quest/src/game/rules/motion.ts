/**
 * src/game/rules/motion.ts — MOVIMENTO: o "game feel" e obrigatorio.
 *
 * Em um plataforma, o movimento E o jogo. Se andar e pular nao for gostoso,
 * nenhuma arte salva (Lente #15 - o brinquedo precisa ser divertido sozinho).
 *
 * Implementado DESDE O PROTOTIPO 1, nao como polimento posterior:
 *   - Coyote time     -> o jogador sente controle, nao injustica (Lente #53)
 *   - Jump buffer     -> a interface "entende" a intencao (Lente #56)
 *   - Pulo variavel   -> a mesma tecla produz decisoes expressivas (Lente #24)
 *   - Atrito assimet. -> a fita muda o feel, nao so o numero (Lente #33)
 *   - Squash & stretch reportado por evento -> juciness (Lente #58)
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 5.
 */
import { BALANCE } from '../gameBalance';
import type { CollisionGrid, GameEventKind, MotionInput, PlayerState, Vec2 } from '../types';
import { approach, gridCollides } from './geometry';

export type { MotionInput };

export const IDLE_INPUT: MotionInput = {
  dir: 0,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
};

export interface MotionResult {
  player: PlayerState;
  events: GameEventKind[];
  /** Deslocamento efetivo no tick: a engine usa para saber o que redesenhar. */
  moved: Vec2;
}

export function stepMotion(
  player: PlayerState,
  dtMs: number,
  input: MotionInput,
  grid: CollisionGrid,
): MotionResult {
  const dt = dtMs / 1000;
  const events: GameEventKind[] = [];
  const era = BALANCE.eras[player.era];
  const tape = BALANCE.tapes[player.activeTape];

  const motion = { ...player.motion, cooldowns: { ...player.motion.cooldowns } };
  const before = { ...player.position };

  // Impulso (Sprint da Fita Pop): decai por tempo e multiplica a velocidade.
  motion.boostMs = Math.max(0, motion.boostMs - dtMs);
  const boost = motion.boostMs > 0 ? motion.boostSpeedScale : 1;

  // -------------------------------------------------------------------------
  // 1. Cooldowns e temporizadores (decai sempre, mesmo parado)
  // -------------------------------------------------------------------------
  motion.dashCooldownMs = Math.max(0, motion.dashCooldownMs - dtMs);
  for (const key of Object.keys(motion.cooldowns)) {
    motion.cooldowns[key] = Math.max(0, (motion.cooldowns[key] ?? 0) - dtMs);
  }

  // -------------------------------------------------------------------------
  // 2. Dash (habilidade ASSINATURA da Fita Eletronica — Game Bible).
  //    Gate explicito: sem a habilidade, o botao nao faz nada. Isso mantem
  //    "toda fita tem uma assinatura" como fato do codigo, nao como promessa.
  // -------------------------------------------------------------------------
  const hasDash = player.unlockedAbilities.includes('electronic.dash');
  if (input.dashPressed && hasDash && motion.dashCooldownMs <= 0 && !motion.isDashing) {
    motion.isDashing = true;
    motion.dashMs = BALANCE.player.dash.durationMs;
    motion.dashCooldownMs = BALANCE.player.dash.cooldownMs;
    events.push('dashed');
  }
  if (motion.isDashing) {
    motion.dashMs -= dtMs;
    if (motion.dashMs <= 0) motion.isDashing = false;
  }

  // -------------------------------------------------------------------------
  // 3. Velocidade horizontal — aceleracao ASSIMETRICA (Lente #33)
  // -------------------------------------------------------------------------
  const speed = BALANCE.player.moveSpeed * era.moveSpeedScale * tape.moveSpeedScale * boost;
  let targetVx: number;
  let accel: number;

  if (motion.isDashing) {
    targetVx = player.facing === 'left' ? -BALANCE.player.dash.speed : BALANCE.player.dash.speed;
    accel = BALANCE.player.dash.speed * 12 * dt;
  } else if (input.dir === 0) {
    targetVx = 0;
    accel =
      BALANCE.player.friction *
      (motion.isGrounded ? 1 : 0.35) *
      tape.frictionScale *
      dt;
  } else {
    targetVx = input.dir * speed;
    accel =
      BALANCE.player.acceleration *
      tape.accelerationScale *
      (motion.isGrounded ? 1 : tape.airControlScale) *
      dt;
  }

  let vx = approach(player.velocity.x, targetVx, accel);
  let vy = player.velocity.y;
  let facing = player.facing;
  if (input.dir !== 0 && !motion.isDashing) facing = input.dir < 0 ? 'left' : 'right';

  // -------------------------------------------------------------------------
  // 4. Pulo: buffer + coyote time + altura variavel (Lentes #24, #53, #56)
  // -------------------------------------------------------------------------
  motion.jumpBufferMs = input.jumpPressed
    ? BALANCE.player.jumpBufferMs
    : Math.max(0, motion.jumpBufferMs - dtMs);

  const canJump = motion.isGrounded || motion.coyoteMs > 0;
  if (motion.jumpBufferMs > 0 && canJump) {
    vy = BALANCE.player.jumpVelocity;
    motion.jumpBufferMs = 0;
    motion.coyoteMs = 0;
    motion.isGrounded = false;
    motion.jumpCutMs = 180; // janela para cortar o pulo
    events.push('jumped');
  }

  // Soltar cedo corta o pulo — a MESMA tecla vira decisao de altura (Lente #24)
  if (motion.jumpCutMs > 0) {
    motion.jumpCutMs = Math.max(0, motion.jumpCutMs - dtMs);
    if (!input.jumpHeld && vy < 0) {
      vy *= BALANCE.player.jumpCutMultiplier;
      motion.jumpCutMs = 0;
    }
  }

  // -------------------------------------------------------------------------
  // 5. Gravidade da era + flutuacao da Fita Jazz
  // -------------------------------------------------------------------------
  if (!motion.isDashing) {
    vy += BALANCE.player.gravity * era.gravityScale * dt;
  }

  const hovering =
    input.jumpHeld && !motion.isGrounded && vy > 0 && player.unlockedAbilities.includes('jazz.flutuacao');
  if (hovering) {
    // Planeio: o tempo fica negociavel (tema da Fita Jazz, Lente #33)
    vy = Math.min(vy, BALANCE.player.maxFallSpeed * 0.22);
  } else {
    vy = Math.min(vy, BALANCE.player.maxFallSpeed);
  }

  // -------------------------------------------------------------------------
  // 6. Integracao + resolucao de colisao por eixo (evita "grudar" em paredes)
  // -------------------------------------------------------------------------
  let position = { ...player.position };
  const wasGrounded = motion.isGrounded;
  let grounded = false;

  const stepX = moveAxis(grid, position, player.size, vx * dt, 0);
  position = stepX.position;
  if (stepX.blocked) {
    vx = 0;
    motion.isDashing = false; // bater na parede encerra o dash (Lente #30)
  }

  const stepY = moveAxis(grid, position, player.size, 0, vy * dt);
  position = stepY.position;
  if (stepY.blocked) {
    if (vy > 0) {
      grounded = true;
      if (!wasGrounded) events.push('landed');
    }
    vy = 0;
  }

  // -------------------------------------------------------------------------
  // 7. Coyote time: sem chao, a tolerancia decai e o pulo e perdido — mas NUNCA
  //    de forma injusta, porque o buffer ainda pode ter salvado a intencao.
  // -------------------------------------------------------------------------
  if (grounded) {
    motion.coyoteMs = BALANCE.player.coyoteMs;
  } else {
    motion.coyoteMs = Math.max(0, motion.coyoteMs - dtMs);
  }
  motion.isGrounded = grounded;

  return {
    player: { ...player, position, velocity: { x: vx, y: vy }, facing, motion },
    events,
    moved: { x: position.x - before.x, y: position.y - before.y },
  };
}

/**
 * Move a caixa por um eixo e resolve a colisao em sub-passos.
 *
 * Por que sub-passos: em um tick de 16 ms, um dash a 420 px/s anda ~7 px.
 * Mover direto atravessaria paredes de 1 tile (16 px). Sub-passos de 4 px
 * garantem que nenhuma parede fina seja atravessada — a fisica e "honesta".
 */
const MAX_SUBSTEP_PX = 4;

/**
 * Exportado porque os INIMIGOS usam exatamente a mesma resolucao de colisao do
 * jogador. Duas fisicas diferentes no mesmo jogo seriam duas fontes de injustica
 * (Lente #30): o jogador nunca entenderia onde uma plataforma "termina".
 */
export function moveAxis(
  grid: CollisionGrid,
  position: Vec2,
  size: Vec2,
  dx: number,
  dy: number,
): { position: Vec2; blocked: boolean } {
  if (dx === 0 && dy === 0) return { position, blocked: false };

  const total = Math.abs(dx) + Math.abs(dy);
  const steps = Math.max(1, Math.ceil(total / MAX_SUBSTEP_PX));
  const stepX = dx / steps;
  const stepY = dy / steps;

  let x = position.x;
  let y = position.y;

  for (let i = 0; i < steps; i += 1) {
    const tryX = x + stepX;
    const tryY = y + stepY;
    const box = { x: tryX, y: tryY, w: size.x, h: size.y };
    if (gridCollides(grid, box)) {
      // Encosta no tile e para: nunca "afunda" nem treme (Lente #56).
      return { position: { x, y }, blocked: true };
    }
    x = tryX;
    y = tryY;
  }

  return { position: { x, y }, blocked: false };
}
