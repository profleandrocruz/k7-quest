/**
 * src/game/rules/tilemap.ts — DE TEXTO PARA O MUNDO.
 *
 * Motivo de design (Lente #90 + Regra do Loop): fases sao DADOS legiveis.
 *   - Legivel em diff de Git: um designer ve exatamente o que mudou.
 *   - Editavel a mao E por ferramenta externa (Tiled / LDtk).
 *   - Testavel: um teste automatizado pode provar que a fase tem saida.
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 8.
 */
import { BALANCE } from '../gameBalance';
import { TILE_SIZE } from '../constants';
import { ERAS } from '../content/eras';
import type {
  CollisionGrid,
  Entity,
  EntityKind,
  EntitySpawn,
  EraId,
  EraLayer,
  EraModifiers,
  LevelDefinition,
  Vec2,
} from '../types';

/**
 * LEGENDA OFICIAL DOS MAPAS EM TEXTO.
 * Qualquer codigo novo precisa entrar aqui E em `TileCode` (types.ts).
 */
export const TILE_LEGEND = {
  '.': 'vazio',
  '#': 'solido',
  B: 'bloco quebravel (exige a Fita Rock)',
  '^': 'espinho',
  '~': 'agua',
  E: 'ancora de eco',
  D: 'porta entre eras',
  G: 'objetivo da fase',
  P: 'plataforma movel',
} as const;

/** Tiles que viram entidade ao serem carregados (o resto e colisao pura). */
const TILE_TO_ENTITY: Record<string, EntityKind> = {
  G: 'goal',
  E: 'echoAnchor',
};

export function parseGrid(rows: readonly string[], tileSize = TILE_SIZE): CollisionGrid {
  if (rows.length === 0) throw new Error('parseGrid: mapa vazio');
  const width = rows[0]?.length ?? 0;
  const ragged = rows.findIndex((r) => r.length !== width);
  if (ragged >= 0) {
    // Linhas de tamanhos diferentes sao um bug de AUTORIA, nao de runtime.
    throw new Error(
      `parseGrid: linha ${ragged} tem ${rows[ragged]?.length} colunas, esperado ${width}`,
    );
  }
  return { width, height: rows.length, tileSize, rows: [...rows] };
}

/** Combina o balanceamento (numeros) com a apresentacao (paleta, musica). */
export function eraModifiers(era: EraId): EraModifiers {
  const balance = BALANCE.eras[era];
  const display = ERAS[era];
  return {
    gravityScale: balance.gravityScale,
    moveSpeedScale: balance.moveSpeedScale,
    paletteTint: balance.paletteTint,
    musicTrack: display.music,
  };
}

export function entitySize(kind: EntityKind): Vec2 {
  switch (kind) {
    case 'goal':
    case 'checkpoint':
    case 'echoAnchor':
      return { x: TILE_SIZE * 2, y: TILE_SIZE * 2 };
    case 'pixelFragment':
    case 'floppy':
    case 'cartridge':
    case 'lostMemory':
      return { x: TILE_SIZE * 0.75, y: TILE_SIZE * 0.75 };
    case 'breakableBlock':
      return { x: TILE_SIZE, y: TILE_SIZE };
    default:
      return { x: TILE_SIZE * 1.25, y: TILE_SIZE * 1.25 };
  }
}

/**
 * Constroi as entidades a partir do mapa em texto + da lista `spawns` da fase.
 * Os ids sao DERIVADOS (nunca aleatorios): o determinismo comeca aqui (Lente #29).
 */
export function buildEntities(level: LevelDefinition, era: EraId): Entity[] {
  const rows = level.tilemaps[era];
  const entities: Entity[] = [];

  if (rows) {
    rows.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx += 1) {
        const code = row[tx];
        if (code === undefined) continue;
        const kind = TILE_TO_ENTITY[code];
        if (!kind) continue;
        entities.push({
          id: `${level.id}:${era}:${kind}:${tx}:${ty}`,
          kind,
          era,
          position: { x: tx * TILE_SIZE, y: ty * TILE_SIZE },
          size: entitySize(kind),
        });
      }
    });
  }

  const spawns: EntitySpawn[] = level.spawns.filter((s) => s.era === undefined || s.era === era);
  spawns.forEach((spawn) => {
    // O indice usado no id e o da lista ORIGINAL (`level.spawns`), nao o da lista
    // filtrada. Motivo: um spawn sem era entra em TODAS as camadas, e a lista filtrada
    // tem indices diferentes por era — o que geraria ids diferentes para a MESMA coisa
    // e faria um checkpoint "renascer" so por trocar de era (Lente #30).
    const index = level.spawns.indexOf(spawn);

    // Spawn SEM era = entidade GLOBAL: id sem a era, compartilhado por todas as camadas.
    // Efeito pratico (e o motivo): marcar `collected` uma vez vale para sempre, e um
    // checkpoint nao se multiplica. Coisas que MUDAM DE POSICAO (inimigos) precisam
    // declarar a era — o validador cobra isso (Lente #21: o espaco e a regra).
    const global = spawn.era === undefined;
    const id = global
      ? `${level.id}:global:spawn:${spawn.kind}:${index}`
      : `${level.id}:${era}:spawn:${spawn.kind}:${index}`;

    entities.push({
      id,
      kind: spawn.kind,
      era: spawn.era ?? null,
      position: { ...spawn.at },
      size: entitySize(spawn.kind),
      ...(spawn.kind === 'breakableBlock' ? { health: 1 } : {}),
      ...(isEnemy(spawn.kind) ? { health: enemyHealth(spawn.kind), velocity: { x: 0, y: 0 } } : {}),
      ...(spawn.props ? { props: spawn.props } : {}),
    });
  });

  return entities;
}

export const ENEMY_KINDS: readonly EntityKind[] = [
  'pixelSlime',
  'cloudHopper',
  'toyKnight',
  'memoryBug',
  'punkPixel',
  'speakerDrone',
  'corruptAmp',
  'cassetteCrawler',
  'workerBot',
  'dataSpider',
  'securityProgram',
  'packetGhost',
  'careDrone',
  'memoryBird',
  'linkBeast',
  'guardianRoot',
  'quantumShade',
  'archiveWisp',
  'echoSentinel',
  'neuralPhantom',
];

export function isEnemy(kind: EntityKind): boolean {
  return ENEMY_KINDS.includes(kind);
}

/**
 * Vida por tipo de inimigo. Deliberadamente baixa (Lente #42 - Simplicidade):
 * o desafio do K7 Quest e o ESPACO e a ERA, nao o combate.
 */
function enemyHealth(kind: EntityKind): number {
  switch (kind) {
    case 'guardianRoot':
    case 'securityProgram':
    case 'linkBeast':
      return 2;
    default:
      return 1;
  }
}

/**
 * Cria TODAS as eras do nivel em memoria (modelo de coexistencia).
 *
 * Uma era fica acessivel se QUALQUER destas condicoes valer:
 *   1. e a era inicial da fase; OU
 *   2. a propria fase a declara em `unlockedEras` (intencao de design da fase); OU
 *   3. a campanha ja a conectou (`campaignUnlocked`, persistido no progresso).
 *
 * Uma era que existe no tilemap mas nao cai em nenhuma das tres aparece como
 * FANTASMA: visivel, nao acessivel. O jogador ve o que ainda nao conquistou
 * (Lente #4 — Curiosidade), e nunca e punido por tentar.
 */
export function buildEraLayers(
  level: LevelDefinition,
  campaignUnlocked: readonly EraId[] = [],
): Record<string, EraLayer> {
  const eras: Record<string, EraLayer> = {};

  (Object.keys(level.tilemaps) as EraId[]).forEach((era) => {
    const rows = level.tilemaps[era];
    if (!rows) return;
    eras[era] = {
      era,
      collision: parseGrid(rows),
      entities: buildEntities(level, era),
      modifiers: eraModifiers(era),
      unlocked:
        era === level.startEra ||
        level.unlockedEras.includes(era) ||
        campaignUnlocked.includes(era),
    };
  });

  if (!eras[level.startEra]) {
    throw new Error(
      `buildEraLayers: a fase ${level.id} nao tem tilemap para a era inicial ${level.startEra}`,
    );
  }

  return eras;
}

/** Ponto de renascimento padrao: o primeiro checkpoint OU o primeiro tile livre com chao. */
export function findPlayerStart(era: EraLayer): Vec2 {
  const checkpoint = era.entities.find((e) => e.kind === 'checkpoint');
  if (checkpoint) return { ...checkpoint.position };

  const tileSize = era.collision.tileSize;
  for (let tx = 0; tx < era.collision.width; tx += 1) {
    for (let ty = 0; ty < era.collision.height - 1; ty += 1) {
      const here = era.collision.rows[ty]?.[tx];
      const below = era.collision.rows[ty + 1]?.[tx];
      if (here === '.' && below !== undefined && '#BPD'.includes(below)) {
        return { x: tx * tileSize, y: ty * tileSize };
      }
    }
  }
  return { x: tileSize * 2, y: tileSize * 2 };
}

/** Todas as entidades de uma era, incluindo as "de todas as eras" (era === null). */
export function entitiesOfEra(eras: Record<string, EraLayer>, era: EraId): Entity[] {
  const layer = eras[era];
  if (!layer) return [];
  return layer.entities.filter((e) => e.era === null || e.era === era);
}
