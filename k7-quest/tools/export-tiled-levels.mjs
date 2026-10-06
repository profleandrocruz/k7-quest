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
 * ESTE ARQUIVO NAO CONHECE O FORMATO `.tmj`. A conversao mora em
 * `src/game/content/levels/tiledFormat.ts`, que e testado; aqui so ha I/O (ler as fases,
 * escrever arquivos, desenhar o PNG). O motivo e o do ADR 0001 aplicado ao tooling: uma
 * regra testada em um lugar nao pode ter uma segunda copia nao testada em outro. E o
 * importador (`import-tiled-levels.mjs`) carrega o MESMO modulo — os dois lados do ciclo
 * sao, por construcao, a mesma regra.
 *
 * COMO LE O CODIGO: pelo resolver do proprio Vite (`ssrLoadModule`). Sem build previo e
 * sem `ts-node`: carrega os `.ts` da fase com o mesmo resolvedor que o app usa, entao o
 * exportador nunca sai de sincronia com `src/game/`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { TILE_LEGEND, TILE_PX, TILESET_COLUMNS, TILESET_ROWS, writeTilesetPng } from './pngTileset.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'levels');
const TILESET_IMAGE = 'k7-terrain.png';
const TILESET_NAME = 'k7-terrain';

/**
 * O PNG desenha os tiles na ordem de `pngTileset.TILE_LEGEND`, e o `.tmj` le o GID
 * pela ordem de `TILED_TILE_ORDER` (a legenda do dominio). As duas listas precisam
 * concordar — e nao podem concordar por sorte: se alguem acrescentar um tile em uma e
 * nao na outra, todo mapa ja exportado passa a apontar para o tile ERRADO, em
 * silencio. Este e o ponto onde a divergencia vira um erro de build.
 */
function assertLegendasConcordam(format) {
  const codigos = TILE_LEGEND.map((tile) => tile.code);
  const esperado = [...format.TILED_TILE_ORDER];
  if (codigos.join('') !== esperado.join('')) {
    throw new Error(
      'A ordem do tileset NAO bate com a legenda do dominio.\n' +
        `  pngTileset.mjs: ${codigos.join(' ')}\n` +
        `  tiledFormat.ts:  ${esperado.join(' ')}\n` +
        '  Um tile foi acrescentado em uma lista e nao na outra. Todos os .tmj ' +
        'exportados ate agora apontam para o tile errado.',
    );
  }
}

/**
 * Carrega as fases E a conversao com o resolver do Vite: os `.ts` sao carregados como o
 * app carrega, sem build. E o mesmo par que o importador usa.
 */
async function loadGame() {
  const vite = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const levels = await vite.ssrLoadModule('/src/game/content/levels/index.ts');
    const format = await vite.ssrLoadModule('/src/game/content/levels/tiledFormat.ts');
    return { LEVELS: levels.LEVELS, format };
  } finally {
    await vite.close();
  }
}

async function main() {
  const { LEVELS, format } = await loadGame();
  if (!Array.isArray(LEVELS) || LEVELS.length === 0) {
    throw new Error('Nenhuma fase encontrada em src/game/content/levels/index.ts');
  }
  assertLegendasConcordam(format);

  mkdirSync(OUT_DIR, { recursive: true });
  const tileset = writeTilesetPng(join(OUT_DIR, TILESET_IMAGE), TILESET_IMAGE);

  // As medidas do tileset sao as do PNG recem-gerado. A assinatura do formato recebe um
  // objeto simples justamente para o dominio nao conhecer PNG.
  const tilesetInfo = {
    name: TILESET_NAME,
    image: TILESET_IMAGE,
    columns: TILESET_COLUMNS,
    rows: TILESET_ROWS,
    imagewidth: tileset.width,
    imageheight: tileset.height,
    tileSize: TILE_PX,
  };

  const manifest = [];
  const problems = [];

  for (const level of LEVELS) {
    for (const era of Object.keys(level.tilemaps)) {
      const map = format.buildTiledMap(level, era, tilesetInfo);
      // O exportador nao pode gerar um mapa invalido: a checagem roda no MESMO lugar da
      // geracao, para o erro de autoria aparecer aqui e nao num playtest.
      problems.push(...format.exportIssues(level, era, map));

      const entry = format.manifestEntryFor(level, era, map);
      writeFileSync(join(OUT_DIR, entry.file), `${JSON.stringify(map, null, 2)}\n`, 'utf8');
      manifest.push(entry);
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
  console.log('[levels] para devolver o que voce editou no Tiled: npm run levels:import');

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