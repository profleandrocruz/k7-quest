/**
 * src/game/content/levels/authoring.ts — AUTORIA SEGURA DE MAPAS EM TEXTO.
 *
 * Por que existe: contar 60 caracteres a mao e a forma mais rapida de introduzir
 * uma fase impossivel. Aqui o mapa e descrito por SEGMENTOS, e o helper garante
 * que toda linha tenha exatamente a largura declarada — o erro de autoria deixa
 * de ser possivel, em vez de ser detectado depois.
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 8 (fases sao dados).
 */

/** Um segmento: [caractere, quantidade]. */
export type Seg = readonly [tile: string, count: number];

/** Uma linha: lista de segmentos OU uma string literal (validada). */
export type Row = readonly Seg[] | string;

export function widthOf(rows: readonly string[]): number {
  return rows[0]?.length ?? 0;
}

/** Monta uma linha de `width` colunas a partir de segmentos; o resto e preenchido. */
export function row(width: number, segs: readonly Seg[], fill = '.'): string {
  let out = '';
  for (const [tile, count] of segs) {
    if (tile.length !== 1) {
      throw new Error(`row: tile "${tile}" deve ter exatamente 1 caractere`);
    }
    if (count < 0) throw new Error(`row: quantidade negativa para "${tile}"`);
    out += tile.repeat(count);
  }
  if (out.length > width) {
    throw new Error(`row: linha tem ${out.length} colunas, excede a largura ${width}`);
  }
  return out + fill.repeat(width - out.length);
}

/** Linha totalmente vazia. */
export function empty(width: number): string {
  return '.'.repeat(width);
}

/** Substitui o caractere em uma coluna. Usado para 'G', 'E' e 'B' pontuais. */
export function put(line: string, col: number, tile: string): string {
  if (col < 0 || col >= line.length) {
    throw new Error(`put: coluna ${col} fora da linha (0..${line.length - 1})`);
  }
  if (tile.length !== 1) throw new Error('put: tile deve ter 1 caractere');
  return line.slice(0, col) + tile + line.slice(col + 1);
}

/** Coloca varios tiles: `putAll(line, [[col, 'G'], [col, 'E']])`. */
export function putAll(line: string, entries: readonly (readonly [number, string])[]): string {
  return entries.reduce((acc, [col, tile]) => put(acc, col, tile), line);
}

/** Monta o tilemap completo e valida a largura de TODAS as linhas. */
export function tilemap(width: number, rows: readonly Row[]): string[] {
  return rows.map((r, index) => {
    const line = typeof r === 'string' ? r : row(width, r);
    if (line.length !== width) {
      throw new Error(`tilemap: linha ${index} tem ${line.length} colunas, esperado ${width}`);
    }
    return line;
  });
}

/** Converte tiles de mundo para pixels (usado nos `spawns`). */
export function at(tx: number, ty: number, tileSize = 16): { x: number; y: number } {
  return { x: tx * tileSize, y: ty * tileSize };
}
