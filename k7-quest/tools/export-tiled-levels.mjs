/**
 * tools/export-tiled-levels.mjs — EXPORTA AS FASES PARA O TILED MAP EDITOR.
 *
 * POR QUE UM EXPORTADOR (e nao um importador) primeiro: o codigo e a fonte da verdade
 * (Lente #90 — fases sao dados, versionaveis em Git). O Tiled e a FERRAMENTA de autoria
 * visual. Este script derrama os dados do jogo em `.tmj` para o designer abrir, ver e
 * ajustar no editor de mapa — sem duvida no texto.
 *
 *   npm run levels:export  ->  public/levels/*.tmj + k7-terrain.png + manifest.json
 *
 * UM MAPA POR (FASE x ERA). Um mapa tem uma camada de tiles por era e uma de objetos
 * por era (os spawns), porque no jogo as duas coisas sao DIFERENTES: o terreno e estatico,
 * as entidades se movem. Achatar os dois num mapa so faria o designer mover um inimigo e o
 * validador do jogo nao ver nada.
 *
 * COMO LE O CODIGO: pelo resolver do proprio Vite (`ssrLoadModule`). Sem build previo e
 * sem `ts-node`: carrega os `.ts` da fase com o mesmo resolvedor que o app usa, entao o
 * exportador nunca sai de sincronia com `src/game/`.
 *
 * A DIRECAO INVERSA (ler `.tmj` de volta para o codigo) e o proximo passo em
 * `docs/loops.md`. O `manifest.json` escrito aqui ja carrega o id da fase para permitir
 * essa leitura inversa.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import {
  TILE_LEGEND,
  TILE_PX,
  TILESET_COLUMNS,
  TILESET_ROWS,
  writeTilesetPng,
} from './pngTileset.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'levels');
const TILESET_IMAGE = 'k7-terrain.png';
const TILESET_NAME = 'k7-terrain';

/** Codigo de tile -> GID do Tiled (indice + 1). GID 0 e sempre "vazio". */
const GID_BY_CODE = new Map(TILE_LEGEND.map((tile, index) => [tile.code, index + 1]));

// ---------------------------------------------------------------------------
// Conversao
// ---------------------------------------------------------------------------

function rowsToGids(rows) {
  return rows.flatMap((line, y) =>
    [...line].map((code, x) => {
      if (code === '.') return 0;
      const gid = GID_BY_CODE.get(code);
      if (gid === undefined) {
        throw new Error(
          `Tile desconhecido "${code}" em (${x}, ${y}) da fase. ` +
            `Legenda valida: . ${[...GID_BY_CODE.keys()].join(' ')}`,
        );
      }
      return gid;
    }),
  );
}

/**
 * Propriedades de um objeto do Tiled. O tipo e derivado do valor: inteiro vira `int`,
 * fracao vira `float` — assim o designer ve um numero, e nao texto entre aspas.
 */
function toTiledProperties(source) {
  return Object.entries(source)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => {
      if (typeof value === 'number') {
        return { name, type: Number.isInteger(value) ? 'int' : 'float', value };
      }
      if (typeof value === 'boolean') return { name, type: 'bool', value };
      return { name, type: 'string', value: String(value) };
    });
}

function entityLayer(level, era, counter) {
  const objects = level.spawns
    .filter((spawn) => (spawn.era ?? era) === era)
    .map((spawn) => ({
      id: counter.id++,
      name: spawn.kind,
      type: spawn.kind,
      // Ponto (sem tamanho): o Tiled mostra um marcador, e nao um retangulo que o
      // designer pode arrastar e alterar a geometria sem querer.
      point: true,
      x: spawn.at.x,
      y: spawn.at.y,
      properties: toTiledProperties({ kind: spawn.kind, era: spawn.era, ...spawn.props }),
    }));

  return {
    name: `${era}__entidades`,
    type: 'objectgroup',
    draworder: 'topdown',
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects,
  };
}

function tileLayer(level, era) {
  const rows = level.tilemaps[era];
  return {
    name: era,
    type: 'tilelayer',
    width: rows[0].length,
    height: rows.length,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data: rowsToGids(rows),
  };
}

function buildMap(level, era, tileset) {
  const counter = { id: 1 };

  return {
    // Metadados do proprio Tiled.
    compressionlevel: -1,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    nextlayerid: 4,
    nextobjectid: 1,

    // Metadados do K7. Sem eles o designer abre o mapa e nao sabe o que esta editando
    // nem o que a fase pretende ensinar (Lente #90 — o mapa documenta a intencao).
    properties: toTiledProperties({
      k7LevelId: level.id,
      k7World: level.world,
      k7LevelName: level.name,
      k7StartEra: level.startEra,
      k7UnlockedEras: level.unlockedEras.join(','),
      k7Objectives: level.objectives.map((objective) => `${objective.id}:${objective.kind}`).join('|'),
      k7MusicRef: level.musicRef,
      k7RewardTape: level.rewards?.tape,
      k7RewardAbilities: level.rewards?.abilities?.join(','),
      k7DesignNote: level.designNote,
    }),

    width: level.tilemaps[era][0].length,
    height: level.tilemaps[era].length,
    tilewidth: TILE_PX,
    tileheight: TILE_PX,

    tilesets: [
      {
        firstgid: 1,
        name: TILESET_NAME,
        image: TILESET_IMAGE,
        imagewidth: tileset.width,
        imageheight: tileset.height,
        columns: TILESET_COLUMNS,
        tilecount: TILESET_COLUMNS * TILESET_ROWS,
        tilewidth: TILE_PX,
        tileheight: TILE_PX,
        margin: 0,
        spacing: 0,
      },
    ],

    layers: [tileLayer(level, era), entityLayer(level, era, counter)],
  };
}

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

async function loadLevels() {
  // O resolver do Vite: os `.ts` sao carregados como o app carrega, sem build.
  const vite = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const mod = await vite.ssrLoadModule('/src/game/content/levels/index.ts');
    return mod.LEVELS;
  } finally {
    await vite.close();
  }
}

/**
 * O exportador nao pode gerar um mapa invalido: a checagem roda no MESMO lugar da
 * geracao, para o erro de autoria aparecer aqui e nao num playtest.
 */
function assertExportable(map) {
  const problems = [];
  const layers = map.layers.filter((layer) => layer.type === 'tilelayer');

  for (const layer of layers) {
    if (layer.data.length !== layer.width * layer.height) {
      problems.push(
        `camada "${layer.name}": ${layer.data.length} tiles para ${layer.width}x${layer.height}`,
      );
    }
  }

  const entities = map.layers
    .filter((layer) => layer.type === 'objectgroup')
    .reduce((total, layer) => total + layer.objects.length, 0);
  if (entities === 0) problems.push('nenhum objeto (entidade) exportado');

  const goalGid = GID_BY_CODE.get('G');
  const hasGoal = layers.some((layer) => layer.data.some((gid) => gid === goalGid));
  if (!hasGoal) problems.push('nenhum tile de objetivo (G) na camada');

  return problems;
}

async function main() {
  const levels = await loadLevels();
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error('Nenhuma fase encontrada em src/game/content/levels/index.ts');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const tileset = writeTilesetPng(join(OUT_DIR, TILESET_IMAGE), TILESET_IMAGE);

  const manifest = [];
  const problems = [];

  for (const level of levels) {
    for (const era of Object.keys(level.tilemaps)) {
      const map = buildMap(level, era, tileset);
      problems.push(...assertExportable(map));

      const fileName = `${level.id}--${era}.tmj`;
      writeFileSync(join(OUT_DIR, fileName), `${JSON.stringify(map, null, 2)}\n`, 'utf8');
      manifest.push({
        file: fileName,
        levelId: level.id,
        world: level.world,
        era,
        width: map.width,
        height: map.height,
        entities: map.layers.find((layer) => layer.type === 'objectgroup')?.objects.length ?? 0,
      });
    }
  }

  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ tileset: TILESET_IMAGE, maps: manifest }, null, 2)}\n`,
    'utf8',
  );

  console.log(`[levels] ${manifest.length} mapa(s) -> public/levels/`);
  console.log(`[tileset] ${tileset.count} tiles em ${tileset.width}x${tileset.height} -> ${TILESET_IMAGE}`);
  for (const entry of manifest) {
    console.log(`  - ${entry.file} (${entry.width}x${entry.height}, ${entry.entities} entidades)`);
  }

  if (problems.length > 0) {
    console.error('[levels] FALHAS:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[levels] erro:', error);
  process.exitCode = 1;
});

