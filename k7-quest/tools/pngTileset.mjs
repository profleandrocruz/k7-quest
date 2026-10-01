/**
 * tools/pngTileset.mjs — TILESET PLACEHOLDER EM PNG, SEM DEPENDENCIAS.
 *
 * POR QUE ISTO EXISTE: o exportador gera mapas `.tmj` para o Tiled Map Editor. Se o
 * tileset nao tiver imagem, o Tiled abre o mapa mas nao mostra NADA — e um mapa que
 * nao se ve nao serve para autorar. Um PNG minimo (node:zlib + CRC32, ~60 linhas)
 * resolve isso e evita uma dependencia so para desenhar um placeholder.
 *
 * NAO E ARTE DO JOGO. O jogo desenha com a paleta de cada era (ver `PlatformerScene`).
 * Estes pixels existem para o DESIGNER enxergar o que esta editando, e sao verificaveis
 * no `git diff` de uma imagem.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/** 16 px: o tile do K7 Quest. Um tileset de 8 colunas comporta 64 tiles. */
export const TILE_PX = 16;
export const TILESET_COLUMNS = 8;
export const TILESET_ROWS = 8;

/**
 * INDICE DE TILE = posicao nesta lista. O indice e o que vira GID no `.tmj` (GID = indice + 1).
 *
 * REGRA DE OURO DO AUTOR: so ADICIONE tiles no FIM da lista. Inserir no meio muda o GID
 * de todos os tiles seguintes e quebra silenciosamente todos os mapas ja exportados.
 */
export const TILE_LEGEND = [
  { code: '#', name: 'solido', base: [0x6b, 0x7a, 0x63], edge: [0x4a, 0x56, 0x46] },
  { code: 'B', name: 'bloco-quebravel', base: [0xc8, 0x7a, 0x3a], edge: [0x8a, 0x52, 0x24] },
  { code: '^', name: 'espinho', base: [0xe7, 0x4c, 0x3c], edge: [0x8f, 0x2f, 0x25] },
  { code: '~', name: 'agua', base: [0x2f, 0x6f, 0xa8], edge: [0x1d, 0x47, 0x70] },
  { code: 'E', name: 'ancora-de-eco', base: [0x9b, 0x59, 0xb6], edge: [0x5e, 0x33, 0x70] },
  { code: 'D', name: 'porta', base: [0xf2, 0xe1, 0x4c], edge: [0xa9, 0x9d, 0x2c] },
  { code: 'G', name: 'objetivo', base: [0xf7, 0xf9, 0xff], edge: [0x9a, 0x9d, 0xa8] },
  { code: 'P', name: 'plataforma-movel', base: [0x8a, 0x8f, 0x98], edge: [0x4f, 0x53, 0x5b] },
];

// ---------------------------------------------------------------------------
// PNG minimo
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const label = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])), 0);
  return Buffer.concat([length, label, data, crc]);
}

/** `rgb` recebe `width * height * 3` bytes (RGB de 8 bits, sem alpha). */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "none": sem compressao por linha
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidade de bits
  ihdr[9] = 2; // RGB (o "vazio" de um tile e o pixel branco)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Um canvas minimo para desenhar 16x16
// ---------------------------------------------------------------------------

function createCanvas(width, height) {
  const rgb = Buffer.alloc(width * height * 3, 0xff); // branco = vazio

  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 3;
    rgb[offset] = r;
    rgb[offset + 1] = g;
    rgb[offset + 2] = b;
  };

  return {
    rgb,
    put,
    fill(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1) for (let dx = 0; dx < w; dx += 1) put(x + dx, y + dy, color);
    },
    /** Triangulo apontando para cima: leitura instantanea de perigo. */
    triangle(cx, baseY, halfWidth, height, color) {
      for (let row = 0; row < height; row += 1) {
        const span = Math.round(((height - row) / height) * halfWidth);
        for (let dx = -span; dx <= span; dx += 1) put(cx + dx, baseY - row, color);
      }
    },
    ring(cx, cy, radius, color) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const distance = Math.hypot(dx, dy);
          if (distance <= radius && distance >= radius - 1.4) put(cx + dx, cy + dy, color);
        }
      }
    },
  };
}

/**
 * Desenha cada tile da legenda. Os designs sao PROCEDURAIS (e nao pixel art feita a mao):
 * um placeholder precisa ser INEQUIVOCO — "isto e um espinho" — e nao bonito.
 */
function drawTile(canvas, index, tile) {
  const originX = (index % TILESET_COLUMNS) * TILE_PX;
  const originY = Math.floor(index / TILESET_COLUMNS) * TILE_PX;
  const at = (x, y, color) => canvas.put(originX + x, originY + y, color);
  const { base, edge } = tile;

  switch (tile.code) {
    case '#':
      // Tijolo: massa com junta superior e uma linha de junta.
      canvas.fill(originX, originY, TILE_PX, TILE_PX, base);
      canvas.fill(originX, originY, TILE_PX, 1, edge);
      canvas.fill(originX, originY + 7, TILE_PX, 1, edge);
      canvas.fill(originX + 7, originY + 1, 1, 6, edge);
      break;
    case 'B':
      // Rachadura dupla: precisa parecer FRAGIL, e nao solido.
      canvas.fill(originX, originY, TILE_PX, TILE_PX, base);
      for (let i = 0; i < TILE_PX; i += 1) {
        at(4 + Math.floor(i / 2), 2 + i, edge);
        at(9 - Math.floor(i / 2), 2 + i, edge);
      }
      break;
    case '^':
      // Dois espinhos com a base.
      canvas.triangle(originX + 4, originY + 13, 3, 8, base);
      canvas.triangle(originX + 11, originY + 13, 3, 8, base);
      canvas.fill(originX, originY + 13, TILE_PX, 2, edge);
      break;
    case '~':
      // Ondas: duas linhas deslocadas.
      canvas.fill(originX + 2, originY + 5, TILE_PX - 4, 2, base);
      canvas.fill(originX + 4, originY + 10, TILE_PX - 6, 2, edge);
      break;
    case 'E':
      canvas.ring(originX + 8, originY + 8, 6, base);
      canvas.fill(originX + 7, originY + 7, 2, 2, edge);
      break;
    case 'D':
      // Portal: arco com vao escuro no meio.
      canvas.ring(originX + 8, originY + 8, 6, base);
      canvas.fill(originX + 5, originY + 8, 6, 6, [0x20, 0x24, 0x28]);
      break;
    case 'G':
      // Bandeira xadrez de 4 px: nao pode parecer textura de chao.
      for (let dy = 0; dy < TILE_PX; dy += 4) {
        for (let dx = 0; dx < TILE_PX; dx += 4) {
          const even = (dx / 4 + dy / 4) % 2 === 0;
          canvas.fill(originX + dx, originY + dy, 4, 4, even ? base : edge);
        }
      }
      break;
    case 'P':
      // Barra fina com dois apoios: e plataforma, e nao parede.
      canvas.fill(originX, originY + 5, TILE_PX, 3, base);
      canvas.fill(originX + 2, originY + 8, 3, 4, edge);
      canvas.fill(originX + 11, originY + 8, 3, 4, edge);
      break;
    default:
      canvas.fill(originX, originY, TILE_PX, TILE_PX, base);
      break;
  }
}

/** Gera `public/levels/<imageName>`. Devolve os tiles desenhados (para o log do exportador). */
export function writeTilesetPng(filePath, imageName = 'k7-terrain.png') {
  const width = TILESET_COLUMNS * TILE_PX;
  const height = TILESET_ROWS * TILE_PX;
  const canvas = createCanvas(width, height);

  TILE_LEGEND.forEach((tile, index) => drawTile(canvas, index, tile));
  writeFileSync(filePath, encodePng(width, height, canvas.rgb));

  return { fileName: imageName, width, height, count: TILE_LEGEND.length };
}
