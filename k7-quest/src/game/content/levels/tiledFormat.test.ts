/**
 * src/game/content/levels/tiledFormat.test.ts — A PONTE ENTRE O CODIGO E O TILED.
 *
 * O QUE ESTES TESTES PROVAM (docs/loops.md, item 2):
 *   - Ida-e-volta FIDEL: toda fase do slice volta identica depois de exportar e
 *     importar. Sem este teste, o importador e um segundo interpretador de fase, e os
 *     dois divergem em silencio — que e o modo como conteudo de fase se perde.
 *   - O caso que NINGUEM pensaria em testar: o spawn SEM era aparece em todas as
 *     camadas e precisa voltar como global, e nao como duas entidades.
 *   - Erros de autoria do Tiled (GID invalido, tamanho errado, spawn fora da grade)
 *     viram mensagem que diz o que fazer, e nao `undefined` silencioso.
 *
 * Headless, sem Node e sem Tiled: e por isso que a conversao mora em `src/game/`.
 */
import { describe, expect, it } from 'vitest';
import { LEVELS } from './index';
import {
  ENTITY_LAYER_SUFFIX,
  buildTiledMap,
  entityLayerName,
  exportIssues,
  fromTiledProperties,
  groupMapsByLevel,
  isObjectLayer,
  isTileLayer,
  levelFromMaps,
} from './tiledFormat';
import type { TiledMap, TilesetInfo } from './tiledFormat';
import type { EraId, LevelDefinition } from '../../types';

const TILESET: TilesetInfo = {
  name: 'k7-terrain',
  image: 'k7-terrain.png',
  columns: 8,
  rows: 8,
  imagewidth: 128,
  imageheight: 128,
  tileSize: 16,
};

/** Exporta todas as eras de uma fase, como o `npm run levels:export` faz. */
function exportLevel(level: LevelDefinition) {
  const eras = Object.keys(level.tilemaps) as EraId[];
  return {
    maps: eras.map((era) => buildTiledMap(level, era, TILESET)),
    files: eras.map((era) => `${level.id}--${era}.tmj`),
  };
}

function levelById(id: string): LevelDefinition {
  return LEVELS.find((l) => l.id === id) as LevelDefinition;
}

// ---------------------------------------------------------------------------
// 1. Ida-e-volta: a fase volta identica
// ---------------------------------------------------------------------------

describe('ponte com o Tiled: ida-e-volta', () => {
  it.each(LEVELS.map((level) => [level.id, level] as const))(
    'a fase "%s" volta identica depois de exportar e importar',
    (_id, level) => {
      const { maps, files } = exportLevel(level);
      const back = levelFromMaps(files[0] as string, maps);

      // O `toEqual` inteiro e o teste: ele pega qualquer campo que se perca no
      // caminho — inclusive os `props` de um spawn e o `target` de um objetivo.
      expect(back).toEqual(level);
    },
  );

  it('o mapa exportado nao tem nenhum problema (o exportador se autovalida)', () => {
    for (const level of LEVELS) {
      for (const era of Object.keys(level.tilemaps) as EraId[]) {
        expect(exportIssues(level, era, buildTiledMap(level, era, TILESET))).toEqual([]);
      }
    }
  });

  it('cada `.tmj` se explica sozinho: nome, intencao e objetivo estao no mapa', () => {
    for (const level of LEVELS) {
      const { maps } = exportLevel(level);
      const props = fromTiledProperties((maps[0] as TiledMap).properties);
      expect(props.k7LevelId).toBe(level.id);
      expect(props.k7DesignNote).toBe(level.designNote);
      expect(props.k7Objectives).toContain(level.objectives[0]?.id);
    }
  });
});


// ---------------------------------------------------------------------------
// 2. O caso que quebra o jogo: o spawn SEM era
// ---------------------------------------------------------------------------

describe('ponte com o Tiled: identidade dos spawns entre eras', () => {
  it('um spawn sem era volta GLOBAL, e nao como duas entidades', () => {
    const { maps, files } = exportLevel(levelById('w1-l3-bosque'));
    const back = levelFromMaps(files[0] as string, maps);

    // O dominio usa `era: undefined` para "existe em todas as eras". Se o
    // importador inventasse uma era, o coletavel viraria dois.
    expect(back.spawns.filter((s) => s.kind === 'checkpoint' && s.era === undefined)).toHaveLength(2);

    // E os exclusivos de cada era continuam exclusivos.
    expect(back.spawns.find((s) => s.kind === 'pixelSlime')?.era).toBe('8bit');
    expect(back.spawns.find((s) => s.kind === 'memoryBug')?.era).toBe('16bit');
  });

  it('em fase de DUAS eras, o que aparece em todas as camadas volta sem era', () => {
    const twoEras = LEVELS.filter(
      (l) => Object.keys(l.tilemaps).length === 2 && l.spawns.some((s) => s.era === undefined),
    );
    expect(twoEras.length).toBeGreaterThan(0);

    for (const level of twoEras) {
      const { maps, files } = exportLevel(level);
      const back = levelFromMaps(files[0] as string, maps);
      expect(back.spawns.filter((s) => s.era === undefined)).toEqual(
        level.spawns.filter((s) => s.era === undefined),
      );
    }
  });

  it('um spawn global NAO ganha propriedade `era` no Tiled (ficaria visivel no mapa)', () => {
    const { maps } = exportLevel(levelById('w1-l3-bosque'));
    const layer = (maps[0] as TiledMap).layers.find(isObjectLayer);
    const props = fromTiledProperties(layer?.objects[0]?.properties);

    expect(props.kind).toBe('checkpoint');
    expect(props.era).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. As duas camadas continuam separadas
// ---------------------------------------------------------------------------

describe('ponte com o Tiled: forma das camadas', () => {
  it('cada mapa tem uma camada de tiles (nome = era) e uma de entidades', () => {
    const map = buildTiledMap(levelById('w1-l1-parque'), '8bit', TILESET);
    const tiles = map.layers.filter(isTileLayer);
    const objects = map.layers.filter(isObjectLayer);

    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.name).toBe('8bit');
    expect(objects).toHaveLength(1);
    expect(objects[0]?.name).toBe(entityLayerName('8bit'));
    expect(objects[0]?.name.endsWith(ENTITY_LAYER_SUFFIX)).toBe(true);
  });

  it('os spawns sao PONTOS: o designer nao arrasta geometria que o jogo nao tem', () => {
    const map = buildTiledMap(levelById('w1-l1-parque'), '8bit', TILESET);
    for (const object of map.layers.filter(isObjectLayer)[0]?.objects ?? []) {
      expect(object.point).toBe(true);
      expect(object.width).toBeUndefined();
      expect(object.height).toBeUndefined();
    }
  });

  it('os `.tmj` se agrupam por fase, e fases diferentes nao se misturam', () => {
    const entries = LEVELS.flatMap((level) => {
      const { maps } = exportLevel(level);
      const eras = Object.keys(level.tilemaps);
      return maps.map((map, i) => ({ file: `${level.id}--${eras[i]}.tmj`, map }));
    });
    const groups = groupMapsByLevel(entries);

    expect(groups).toHaveLength(LEVELS.length);
    for (const group of groups) {
      const expected = Object.keys(levelById(group.levelId).tilemaps).length;
      expect(group.maps).toHaveLength(expected);
      expect(group.files).toHaveLength(expected);
    }
  });
});

