/**
 * src/game/content/levels/tiledFormat.ts — A PONTE ENTRE O CODIGO E O TILED (.tmj).
 *
 * POR QUE ESTE ARQUIVO EXISTE (item 2 do `docs/loops.md`):
 * sem ele, o Tiled e um VISUALIZADOR — o designer abre o mapa, arrasta um inimigo e
 * nao tem como publicar. Um editor que nao publica nao e autoria (Lente #90).
 *
 * A REGRA QUE ELE CUMPRE: o CODIGO continua sendo a fonte da verdade, e a conversao
 * nos dois sentidos mora no MESMO lugar. Exportar e importar nao sao dois
 * interpretadores que podem divergir: sao duas metades de uma regra, conferidas por
 * um unico teste de ida-e-volta (Lente #29 — o que nao e verificado nao e verdade).
 *
 * POR QUE ELE VIVE EM `src/game/` E NAO EM `tools/`:
 * `tools/` faz I/O (ler `.tmj`, escrever arquivo) e nao pode ser testado; aqui mora
 * a REGRA (tile 3 vira GID 4, spawn sem era existe em todas as camadas) e ela roda
 * headless, sem Node, sem Tiled, sem navegador. E o mesmo criterio do ADR 0001:
 * este arquivo nao importa `node:*`, nao importa React e nao importa motor.
 *
 * O `.tmj` gerado carrega o contexto de design em `Map Properties` (`k7*`), e por
 * isso ele se explica sozinho: quem abre o mapa no Tiled ve o que a fase pretende
 * ensinar, e quem importa de volta tem tudo o que o codigo precisa.
 */
import { TILE_SIZE } from '../../constants';
import { TILE_LEGEND } from '../../rules/tilemap';
import type { EraId, EntityKind, EntitySpawn, LevelDefinition, TileCode } from '../../types';

/**
 * ORDEM CANONICA DOS TILES. O indice na lista e o GID do Tiled (GID = indice + 1).
 *
 * DERIVADA de `TILE_LEGEND` (a legenda do dominio) em vez de reescrita aqui: duas
 * listas de tiles sao dois mapas mentais, e o designer precisa de UM. O '.', que
 * existe no dominio, nao entra: no Tiled "vazio" e GID 0.
 *
 * REGRA DE OURO DO AUTOR: so ADICIONE tiles no FIM da legenda. Inserir no meio muda
 * o GID de todos os tiles seguintes e quebra silenciosamente todos os `.tmj` ja
 * editados no Tiled.
 */
export const TILED_TILE_ORDER: readonly TileCode[] = Object.keys(TILE_LEGEND).filter(
  (code): code is TileCode => code !== '.',
);

const GID_BY_CODE = new Map<TileCode, number>(
  TILED_TILE_ORDER.map((code, index) => [code, index + 1]),
);

/** Codigo de tile -> GID. `.` e GID 0 (a primeira coluna do Tiled e sempre vazia). */
export function codeToGid(code: string): number {
  if (code === '.') return 0;
  const gid = GID_BY_CODE.get(code as TileCode);
  if (gid === undefined) {
    throw new Error(`Tile desconhecido "${code}". Legenda valida: . ${TILED_TILE_ORDER.join(' ')}`);
  }
  return gid;
}

/** GID -> codigo de tile. GID fora da legenda e erro de autoria, nao `undefined`. */
export function gidToCode(gid: number): TileCode {
  if (gid === 0) return '.';
  const code = TILED_TILE_ORDER[gid - 1];
  if (code === undefined) {
    throw new Error(
      `GID ${gid} nao existe no tileset (0..${TILED_TILE_ORDER.length}). ` +
        'Se voce adicionou tiles no MEIO da legenda, os mapas antigos apontam para o tile errado.',
    );
  }
  return code;
}

/** Uma linha de texto -> GIDs. Tile invalido e erro de autoria, com a coluna. */
export function rowToGids(line: string, context: string): number[] {
  return [...line].map((code, x) => {
    try {
      return codeToGid(code);
    } catch (error) {
      throw new Error(`${context} (coluna ${x}): ${(error as Error).message}`);
    }
  });
}

/** GIDs -> uma linha de texto. */
export function gidsToRow(gids: readonly number[], context: string): string {
  return gids
    .map((gid) => {
      try {
        return gidToCode(gid);
      } catch (error) {
        throw new Error(`${context}: ${(error as Error).message}`);
      }
    })
    .join('');
}

/** O tilemap inteiro -> o array plano de GIDs que o Tiled chama de `data`. */
export function tilemapToGids(rows: readonly string[], context: string): number[] {
  return rows.flatMap((line, y) => rowToGids(line, `${context}, linha ${y}`));
}

/** O inverso: `data` + largura -> as linhas de texto que o jogo consome. */
export function gidsToTilemap(
  data: readonly number[],
  width: number,
  height: number,
  context: string,
): string[] {
  if (data.length !== width * height) {
    throw new Error(
      `${context}: a camada tem ${data.length} tiles, mas o mapa declara ${width}x${height}. ` +
        'No Tiled, fixe o tamanho do mapa antes de salvar.',
    );
  }
  const rows: string[] = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(gidsToRow(data.slice(y * width, y * width + width), `${context}, linha ${y}`));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// O formato .tmj (somente o que o K7 Quest usa)
// ---------------------------------------------------------------------------

export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool';
  value: string | number | boolean;
}

export interface TiledTileLayer {
  name: string;
  type: 'tilelayer';
  width: number;
  height: number;
  data: number[];
}

export interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  /** Spawns do K7 sao sempre `point: true`; o Tiled aceita outras formas. */
  point?: boolean;
  width?: number;
  height?: number;
  x: number;
  y: number;
  properties?: TiledProperty[];
}

export interface TiledObjectLayer {
  name: string;
  type: 'objectgroup';
  objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  properties?: TiledProperty[];
  layers: TiledLayer[];
  [key: string]: unknown;
}

export function isTileLayer(layer: TiledLayer): layer is TiledTileLayer {
  return layer.type === 'tilelayer';
}

export function isObjectLayer(layer: TiledLayer): layer is TiledObjectLayer {
  return layer.type === 'objectgroup';
}

/** Sufixo da camada de spawns. O `__` evita colisao com o nome de uma era. */
export const ENTITY_LAYER_SUFFIX = '__entidades';

export function entityLayerName(era: EraId): string {
  return `${era}${ENTITY_LAYER_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Propriedades: o `.tmj` se explica sozinho
// ---------------------------------------------------------------------------

/**
 * O tipo e DERIVADO do valor: inteiro vira `int`, fracao vira `float`. Assim o
 * designer ve um numero editavel no painel do Tiled, e nao texto entre aspas.
 */
export function toTiledProperties(source: Record<string, unknown>): TiledProperty[] {
  return Object.entries(source)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => {
      if (typeof value === 'number') {
        return { name, type: Number.isInteger(value) ? 'int' : 'float', value } as TiledProperty;
      }
      if (typeof value === 'boolean') return { name, type: 'bool', value } as TiledProperty;
      return { name, type: 'string', value: String(value) } as TiledProperty;
    });
}

/** Propriedades -> objeto simples, para leitura pontual. */
export function fromTiledProperties(
  properties: readonly TiledProperty[] = [],
): Record<string, string | number | boolean> {
  return Object.fromEntries(properties.map((p) => [p.name, p.value]));
}

/**
 * A METADADOS DA FASE, sem os tiles (que sao as camadas) e sem os spawns (que sao
 * os objetos). Tudo o mais — nome, objetivos, dialogo, recompensa, intencao — e
 * metadado, e precisa atravessar a ida-e-volta intacto.
 */
export function levelMeta(level: LevelDefinition): Record<string, unknown> {
  const { tilemaps: _tilemaps, spawns: _spawns, ...meta } = level;
  return meta;
}

/** Nome da propriedade que carrega o JSON da fase. */
export const META_PROPERTY = 'k7Meta';

/**
 * As propriedades do mapa: as `k7*` para o olho do designer e `k7Meta` para a
 * maquina.
 *
 * Por que uma propriedade JSON e nao so as `k7*`: elas JA NAO devolvem a fase
 * inteira — o `k7Objectives` de hoje e so `id:kind` e perde `target` e
 * `description`. Uma ida-e-volta que perde dado NAO e ida-e-volta.
 */
export function buildMapProperties(level: LevelDefinition): TiledProperty[] {
  const rewards = level.rewards;
  return toTiledProperties({
    // --- leitura humana no Tiled ---
    k7LevelId: level.id,
    k7LevelName: level.name,
    k7World: level.world,
    k7StartEra: level.startEra,
    k7UnlockedEras: level.unlockedEras.join(','),
    k7Objectives: level.objectives.map((o) => `${o.id}:${o.kind}`).join('|'),
    k7MusicRef: level.musicRef,
    k7RewardTape: rewards?.tape,
    k7RewardAbilities: rewards?.abilities?.join(','),
    k7RewardUnlockEra: rewards?.unlockEra,
    k7DesignNote: level.designNote,
    // --- maquina: a fase inteira, sem os tiles ---
    [META_PROPERTY]: JSON.stringify(levelMeta(level)),
  });
}

/**
 * Le `k7Meta`. Se faltar, a mensagem diz o que fazer em vez de estourar um
 * `undefined` no meio da geracao: um mapa antigo (exportado antes desta propriedade
 * existir) precisa ser re-exportado, e o autor precisa saber disso.
 */
export function readMapMeta(map: TiledMap, fileName: string): Record<string, unknown> {
  const raw = fromTiledProperties(map.properties)[META_PROPERTY];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error(
      `${fileName}: mapa sem a propriedade "${META_PROPERTY}". ` +
        'Ele foi exportado antes de o importador existir. Rode `npm run levels:export` ' +
        'e edite a partir do arquivo novo.',
    );
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${fileName}: a propriedade "${META_PROPERTY}" nao e um JSON valido. ` +
        'No Tiled, edite o mapa e NAO a propriedade a mao — ela e reescrita na exportacao.',
    );
  }
}

// ---------------------------------------------------------------------------
// IDA: a fase vira um mapa do Tiled
// ---------------------------------------------------------------------------

/**
 * As dimensoes do tileset exportado. Vem do `tools/` porque o PNG e arte do
 * TILESET, e nao da fase — mas o formato do mapa precisa das medidas, entao a
 * assinatura aceita um objeto simples e o dominio nao conhece PNG.
 */
export interface TilesetInfo {
  name: string;
  image: string;
  columns: number;
  rows: number;
  imagewidth: number;
  imageheight: number;
  tileSize: number;
}

/**
 * Um spawn vira um PONTO (sem largura/altura). O Tiled mostra um marcador, e nao um
 * retangulo que o designer pode arrastar e alterar a geometria sem querer: no
 * jogo, um spawn NAO tem dimensao propria — ele ocupa um tile (ou dois, se for
 * checkpoint).
 *
 * `k7Order` e a POSICAO original no array `spawns`. Sem ela, a volta agruparia os
 * spawns por mapa (todos os de 8 bits, depois todos os de 16) e a ordem mudaria a
 * cada ciclo de exportacao — um diff que mexe em linhas sem mudar nada. Com ela, um
 * spawn novo no Tiled (sem ordem) entra no FIM, que e o comportamento desejado.
 */
function spawnToObject(spawn: EntitySpawn, id: number, order: number): TiledObject {
  return {
    id,
    name: spawn.kind,
    type: spawn.kind,
    point: true,
    x: spawn.at.x,
    y: spawn.at.y,
    properties: toTiledProperties({
      kind: spawn.kind,
      era: spawn.era,
      k7Order: order,
      ...spawn.props,
    }),
  };
}

/**
 * A camada de spawns de UMA era.
 *
 * Um spawn SEM `era` e repetido em todas as camadas: ele existe em todas as eras
 * com a MESMA identidade (a regra de `buildEntities`). Exportar so uma vez daria ao
 * jogador um coletavel que some ao trocar de era; exportar com `era` explicita daria
 * ao mesmo coletavel DUAS entidades distintas, e a contagem de fragmentos quebraria
 * — `domain.test.ts` cobre exatamente esse caso.
 */
function entityLayer(level: LevelDefinition, era: EraId, counter: { id: number }): TiledObjectLayer {
  return {
    name: entityLayerName(era),
    type: 'objectgroup',
    objects: level.spawns
      .map((spawn, order) => ({ spawn, order }))
      .filter(({ spawn }) => (spawn.era ?? era) === era)
      .map(({ spawn, order }) => spawnToObject(spawn, counter.id++, order)),
  };
}

function tileLayer(level: LevelDefinition, era: EraId): TiledTileLayer {
  const rows = level.tilemaps[era];
  if (!rows) throw new Error(`buildTiledMap: a fase ${level.id} nao tem tilemap para a era ${era}`);
  return {
    name: era,
    type: 'tilelayer',
    width: rows[0]?.length ?? 0,
    height: rows.length,
    data: tilemapToGids(rows, `${level.id}/${era}`),
  };
}

/** Constroi o `.tmj` de UM par (fase x era). Um mapa por par, como o exportador ja fazia. */
export function buildTiledMap(
  level: LevelDefinition,
  era: EraId,
  tileset: TilesetInfo,
): TiledMap {
  const counter = { id: 1 };
  const rows = level.tilemaps[era];
  if (!rows) throw new Error(`buildTiledMap: a fase ${level.id} nao tem tilemap para a era ${era}`);

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
    nextobjectid: counter.id,

    // Metadados do K7 (ver `buildMapProperties`).
    properties: buildMapProperties(level),

    width: rows[0]?.length ?? 0,
    height: rows.length,
    tilewidth: tileset.tileSize,
    tileheight: tileset.tileSize,

    tilesets: [
      {
        firstgid: 1,
        name: tileset.name,
        image: tileset.image,
        imagewidth: tileset.imagewidth,
        imageheight: tileset.imageheight,
        columns: tileset.columns,
        tilecount: tileset.columns * tileset.rows,
        tilewidth: tileset.tileSize,
        tileheight: tileset.tileSize,
        margin: 0,
        spacing: 0,
      },
    ],

    layers: [tileLayer(level, era), entityLayer(level, era, counter)],
  };
}

/** A entrada de `manifest.json`: a ligacao entre um arquivo em disco e a fase. */
export interface ManifestEntry {
  file: string;
  levelId: string;
  world: number;
  era: EraId;
  width: number;
  height: number;
  entities: number;
}

export function manifestEntryFor(level: LevelDefinition, era: EraId, map: TiledMap): ManifestEntry {
  return {
    file: `${level.id}--${era}.tmj`,
    levelId: level.id,
    world: level.world,
    era,
    width: map.width,
    height: map.height,
    entities: map.layers.filter(isObjectLayer)[0]?.objects.length ?? 0,
  };
}

/**
 * O exportador nao pode gerar um mapa invalido: a checagem roda no MESMO lugar da
 * geracao, para o erro de autoria aparecer aqui e nao num playtest.
 */
export function exportIssues(level: LevelDefinition, era: EraId, map: TiledMap): string[] {
  const problems: string[] = [];
  const label = `${level.id}/${era}`;

  for (const layer of map.layers) {
    if (!isTileLayer(layer)) continue;
    if (layer.data.length !== layer.width * layer.height) {
      problems.push(`${label}: camada "${layer.name}" tem ${layer.data.length} tiles para ${layer.width}x${layer.height}`);
    }
  }

  const entities = map.layers.filter(isObjectLayer).reduce((total, l) => total + l.objects.length, 0);
  if (entities === 0) problems.push(`${label}: nenhum objeto (entidade) exportado`);

  const goalGid = codeToGid('G');
  const hasGoal = map.layers.some((l) => isTileLayer(l) && l.data.some((gid) => gid === goalGid));
  if (!hasGoal) problems.push(`${label}: nenhum tile de objetivo (G) na camada`);

  return problems;
}

// ---------------------------------------------------------------------------
// VOLTA: os mapas voltam a ser uma fase
// ---------------------------------------------------------------------------

/** Identidade de um spawn, para reconhecer o MESMO spawn em varias eras. */
function spawnKey(spawn: EntitySpawn): string {
  return JSON.stringify([spawn.kind, spawn.at.x, spawn.at.y, spawn.props ?? null]);
}

/**
 * Um objeto do Tiled vira um spawn.
 *
 * A posicao volta em PIXELS (o Tiled fala em pixels) e o codigo fala em tiles via
 * `at(tx, ty)`. Um spawn fora da grade e erro de autoria: o tileset e de 16 px e nao
 * existe "entre tiles" para um spawn.
 */
function objectToSpawn(object: TiledObject, fileName: string): EntitySpawn & { order: number } {
  const raw = fromTiledProperties(object.properties);
  const kind = (raw.kind ?? object.type ?? object.name) as EntityKind;
  if (typeof kind !== 'string' || kind.length === 0) {
    throw new Error(
      `${fileName}: objeto ${object.id} sem a propriedade "kind". ` +
        'No Tiled, defina a propriedade `kind` com um valor da lista de entidades.',
    );
  }
  if (object.x % TILE_SIZE !== 0 || object.y % TILE_SIZE !== 0) {
    throw new Error(
      `${fileName}: spawn "${kind}" em (${object.x}, ${object.y}) esta fora da grade de ` +
        `${TILE_SIZE} px. Um spawn ocupa um tile inteiro; encaixe-o no tile mais proximo.`,
    );
  }

  const { kind: _kind, era, k7Order, ...props } = raw;
  return {
    kind,
    at: { x: object.x, y: object.y },
    ...(era ? { era: era as EraId } : {}),
    ...(Object.keys(props).length > 0 ? { props } : {}),
    // Um spawn novo no Tiled nao tem ordem: ele vai para o fim, que e o que o
    // designer quer ao arrastar algo novo para o mapa.
    order: typeof k7Order === 'number' ? k7Order : Number.MAX_SAFE_INTEGER,
  };
}

/** Os tilemaps do conjunto de mapas, indexados por era. */
function readTilemaps(maps: readonly TiledMap[], fileName: string): Partial<Record<EraId, string[]>> {
  const tilemaps: Partial<Record<EraId, string[]>> = {};
  for (const map of maps) {
    for (const layer of map.layers) {
      if (!isTileLayer(layer)) continue;
      tilemaps[layer.name as EraId] = gidsToTilemap(
        layer.data,
        layer.width,
        layer.height,
        `${fileName}/${layer.name}`,
      );
    }
  }
  return tilemaps;
}

/**
 * Os spawns do conjunto de mapas.
 *
 * O CASO DIFICIL (e o motivo desta funcao existir) e o spawn SEM era: ele aparece nas
 * camadas de TODAS as eras. Duas leituras erradas seriam plausiveis e ambas quebram o
 * jogo:
 *
 *   a) tratar toda copia como exclusiva de uma era — o coletavel passa a contar DUAS
 *      vezes no objetivo de fragmentos;
 *   b) escolher "a primeira era que achou" — o spawn vira exclusivo de uma era e
 *      desaparece quando o jogador troca (ele ganha um eco, perde um item).
 *
 * A regra implementada: se o MESMO spawn esta em todas as camadas de era da fase, ele
 * e global (volta sem `era`). Se esta em parte delas, ele e exclusivo daquelas.
 */
function readSpawns(
  maps: readonly TiledMap[],
  eraOf: ReadonlyMap<TiledMap, EraId>,
  fileName: string,
): EntitySpawn[] {
  const layers = maps.map((map) => map.layers.find(isObjectLayer));
  const total = layers.length;

  // Indexa por identidade, guardando a PRIMEIRA ocorrencia (a ordem no array `spawns`
  // e a `k7Order` que veio do codigo, nao a ordem de leitura do Tiled).
  const firstSeen = new Map<string, EntitySpawn & { order: number }>();
  const erasSeen = new Map<string, Set<string>>();
  layers.forEach((layer, index) => {
    const era = String(eraOf.get(maps[index] as TiledMap));
    for (const object of layer?.objects ?? []) {
      const spawn = objectToSpawn(object, fileName);
      const key = spawnKey(spawn);
      if (!firstSeen.has(key)) {
        firstSeen.set(key, { ...spawn, era: spawn.era ?? (era as EraId) });
      }
      const set = erasSeen.get(key) ?? new Set<string>();
      set.add(era);
      erasSeen.set(key, set);
    }
  });

  return [...firstSeen.entries()]
    .map(([key, spawn]) => {
      const present = erasSeen.get(key) as Set<string>;
      // Presente em TODAS as camadas de era da fase: e global, e `era: undefined` e o
      // codigo do dominio. Nao ha ressalva para fases de uma era so: nesse caso o
      // unico mapa cobre todas as camadas, e um spawn sem `era` continua global.
      const resolved = present.size === total ? { ...spawn, era: undefined } : spawn;
      const { order: _order, ...rest } = resolved;
      return { spawn: rest as EntitySpawn, order: resolved.order };
    })
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.spawn);
}

/**
 * O ponto de entrada do importador: N mapas (um por era) viram UMA fase.
 *
 * Por que recebe um CONJUNTO e nao um mapa: uma fase tem varias eras, e um mapa do
 * Tiled so tem uma. Importar era por era exigiria juntar na mao e produziria meio
 * nivel a cada passada.
 */
export function levelFromMaps(fileName: string, maps: readonly TiledMap[]): LevelDefinition {
  if (maps.length === 0) throw new Error(`${fileName}: nenhum mapa para importar`);

  // A era de cada mapa vem do NOME DA CAMADA de tiles (o exportador nomeia a camada
  // com a era), e nao do manifest.json: assim o importador funciona com uma pasta de
  // `.tmj` soltos, que e como o designer salva depois de editar.
  const eraOf = new Map<TiledMap, EraId>();
  for (const map of maps) {
    const tile = map.layers.find(isTileLayer);
    if (!tile) throw new Error(`${fileName}: o mapa nao tem camada de tiles`);
    eraOf.set(map, tile.name as EraId);
  }

  const tilemaps = readTilemaps(maps, fileName);
  const spawns = readSpawns(maps, eraOf, fileName);
  const meta = readMapMeta(maps[0] as TiledMap, fileName);

  const startEra = meta.startEra as EraId;
  if (!tilemaps[startEra]) {
    throw new Error(
      `${fileName}: a fase declara comecar em "${String(meta.startEra)}", mas essa era nao tem ` +
        `camada de tiles. Eras encontradas: ${[...new Set(eraOf.values())].join(', ')}`,
    );
  }

  return {
    ...(meta as Omit<LevelDefinition, 'tilemaps' | 'spawns'>),
    tilemaps,
    spawns,
  };
}

/**
 * O mapa nao pode mentir sobre o tamanho que declara: a camada precisa ter as
 * dimensoes do mapa. Erro aqui e do proprio `.tmj`.
 */
export function assertMapShape(map: TiledMap, fileName: string): void {
  const tile = map.layers.find(isTileLayer);
  if (!tile) throw new Error(`${fileName}: nenhuma camada de tiles`);
  if (tile.width !== map.width || tile.height !== map.height) {
    throw new Error(
      `${fileName}: a camada "${tile.name}" e ${tile.width}x${tile.height}, mas o mapa declara ` +
        `${map.width}x${map.height}. No Tiled, o tamanho da camada acompanha o mapa.`,
    );
  }
}

/** Agrupa `.tmj` por fase, usando o `levelId` da propriedade `k7LevelId`. */
export function groupMapsByLevel(
  maps: readonly { file: string; map: TiledMap }[],
): { levelId: string; files: string[]; maps: TiledMap[] }[] {
  const groups = new Map<string, { file: string; map: TiledMap }[]>();
  for (const entry of maps) {
    const levelId = fromTiledProperties(entry.map.properties).k7LevelId;
    if (typeof levelId !== 'string' || levelId.length === 0) {
      throw new Error(`${entry.file}: sem a propriedade "k7LevelId" — o mapa nao diz a que fase pertence.`);
    }
    groups.set(levelId, [...(groups.get(levelId) ?? []), entry]);
  }
  return [...groups.entries()].map(([levelId, entries]) => ({
    levelId,
    files: entries.map((e) => e.file),
    maps: entries.map((e) => e.map),
  }));
}




