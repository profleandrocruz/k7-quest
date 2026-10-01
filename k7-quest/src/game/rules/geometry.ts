/**
 * src/game/rules/geometry.ts — PRIMITIVAS GEOMETRICAS DO DOMINIO.
 *
 * Nao depende de Phaser, Pixi, Three ou Matter: o dominio define o que e colisao,
 * e cada motor apenas obedece. Isso permite rodar a mesma logica em testes headless.
 */
import type { Aabb, CollisionGrid, Entity, PlayerState, Vec2 } from '../types';

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

/** Caixa do jogador derivada da posicao (a posicao e o canto superior esquerdo). */
export function boxOf(p: Pick<PlayerState, 'position' | 'size'>): Aabb {
  return { x: p.position.x, y: p.position.y, w: p.size.x, h: p.size.y };
}

export function entityBox(e: Entity): Aabb {
  return { x: e.position.x, y: e.position.y, w: e.size.x, h: e.size.y };
}

export function overlaps(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function centerOf(box: Aabb): Vec2 {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Interpola em direcao ao alvo SEM ultrapassar.
 * Motivo de design (Lente #56): movimento previsivel e legivel e sempre preferivel a
 * "aceleracao fisica pura", que o jogador nao consegue prever.
 */
export function approach(current: number, target: number, delta: number): number {
  return current < target ? Math.min(current + delta, target) : Math.max(current - delta, target);
}

// ---------------------------------------------------------------------------
// Acesso a tiles
// ---------------------------------------------------------------------------

export const SOLID_TILES = '#BPD';
export const HAZARD_TILES = '^';

export function codeAt(grid: CollisionGrid, tx: number, ty: number): string {
  if (tx < 0 || ty < 0 || ty >= grid.rows.length) return '.'; // fora do mapa acima = ar
  const row = grid.rows[ty];
  if (row === undefined) return '.';
  if (tx >= row.length) return '.'; // fora do mapa a direita = ar
  return row[tx] ?? '.';
}

export function isSolidCode(code: string): boolean {
  return SOLID_TILES.includes(code);
}

export function isHazardCode(code: string): boolean {
  return HAZARD_TILES.includes(code);
}

export function isSolidAt(grid: CollisionGrid, tx: number, ty: number): boolean {
  return isSolidCode(codeAt(grid, tx, ty));
}

/** Retorna `true` se a caixa tocar algum tile solido da grade. */
export function gridCollides(grid: CollisionGrid, box: Aabb): boolean {
  const ts = grid.tileSize;
  const x0 = Math.floor(box.x / ts);
  const x1 = Math.floor((box.x + box.w - 0.001) / ts);
  const y0 = Math.floor(box.y / ts);
  const y1 = Math.floor((box.y + box.h - 0.001) / ts);

  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (isSolidAt(grid, tx, ty)) return true;
    }
  }
  return false;
}

/** Retorna `true` se a caixa tocar um tile de perigo (espinho). */
export function gridHazard(grid: CollisionGrid, box: Aabb): boolean {
  const ts = grid.tileSize;
  const x0 = Math.floor(box.x / ts);
  const x1 = Math.floor((box.x + box.w - 0.001) / ts);
  const y0 = Math.floor(box.y / ts);
  const y1 = Math.floor((box.y + box.h - 0.001) / ts);

  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (isHazardCode(codeAt(grid, tx, ty))) return true;
    }
  }
  return false;
}

/**
 * Converte uma posicao de mundo em indice de tile.
 * Centralizado aqui porque Tiled, Phaser e Pixi usam convencoes diferentes.
 */
export function toTile(v: number, tileSize: number): number {
  return Math.floor(v / tileSize);
}

/** Quantos tiles de largura/altura uma determinada area possui. */
export function gridSize(grid: CollisionGrid): { w: number; h: number } {
  const first = grid.rows[0];
  return { w: first ? first.length : 0, h: grid.rows.length };
}
