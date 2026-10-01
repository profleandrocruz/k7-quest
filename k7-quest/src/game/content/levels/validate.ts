/**
 * src/game/content/levels/validate.ts — VALIDACAO AUTOMATIZADA DE FASES.
 *
 * Obrigatoria por design (GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 8, Lente #30):
 *   1. Existe caminho do spawn ate o objetivo em CADA era permitida.
 *   2. Nenhum obstaculo exige habilidade nao desbloqueada ate aquele ponto.
 *   3. Todo checkpoint e alcancavel e existe pelo menos 1 antes de cada chefe.
 *   4. Nenhuma fase tem mais de N obstaculos de solucao unica.
 *
 * Por que isto importa: "fase impossivel" e a categoria de bug mais CARA de descobrir
 * tarde. Um teste de 80 linhas elimina a categoria inteira.
 *
 * MODELO DE MOVIMENTO (conservador, nao uma replica da fisica):
 *   - anda para os lados;
 *   - sobe ate 3 tiles;
 *   - salta em arco de ate 4 tiles de distancia e 3 de altura;
 *   - cai, com deslocamento horizontal de ate 4 tiles.
 *
 * DUAS DECISOES QUE TORNAM O MODELO CONFAVEL (e nao apenas simples):
 *   a) ALTURA: o jogador de verdade tem 20 px (BALANCE.player.height), nao 16. Em pe, ele
 *      ocupa TODO o tile dos pes e os 4 px de baixo do tile acima. Entao `standing` exige
 *      os dois tiles livres. Sem isso o modelo diria que da para atravessar uma parede
 *      de 4 px de altura — e o jogo diria que nao.
 *   b) ARCO: para subir, o que precisa estar livre e a coluna ONDE O JOGADOR ESTA (a
 *      cabeca dele), nunca a coluna de DESTINO. A coluna de destino e o APOIO do pulo:
 *      exigir que ela esteja vazia fazia o validador recusar escaladas legitimas — o
 *      "erro por pessimismo" que este arquivo promete nunca cometer.
 */
import type { EraId, LevelDefinition, LevelId } from '../../types';
import { isEnemy } from '../../rules/tilemap';
import { SIGNATURE_ABILITY, ABILITIES } from '../abilities';

export interface LevelIssue {
  level: LevelId;
  era?: EraId;
  problem: string;
}

const MAX_JUMP_UP = 3;
const MAX_JUMP_ACROSS = 4;

/** Tiles que barram o movimento. 'B' e quebravel e '^' e apenas danoso. */
function isBlocking(tile: string, breakBlocks: boolean): boolean {
  if (tile === '#') return true;
  if (tile === 'B') return !breakBlocks;
  if (tile === 'D' || tile === 'P') return true;
  return false;
}

export interface ReachOptions {
  /** Se `true`, os Blocos Quebraveis contam como passagem (Fita Rock disponivel). */
  breakBlocks: boolean;
}

export function tileAt(rows: readonly string[], x: number, y: number): string {
  if (y < 0 || y >= rows.length) return '#';
  const row = rows[y];
  if (!row) return '#';
  if (x < 0 || x >= row.length) return '#';
  return row[x] ?? '.';
}

/**
 * Verifica se o objetivo da era e alcancavel a partir do ponto de renascimento.
 * Retorna o conjunto de tiles onde o jogador CONSEGUE ficar em pe.
 */
export function reachableTiles(
  level: LevelDefinition,
  era: EraId,
  options: ReachOptions,
): { visited: Set<string>; goal: { x: number; y: number } | null } {
  const rows = level.tilemaps[era];
  if (!rows) return { visited: new Set(), goal: null };

  const blocked = (x: number, y: number): boolean => isBlocking(tileAt(rows, x, y), options.breakBlocks);

  /**
   * "Consigo ficar em pe aqui?"
   * O jogador tem 20 px de altura: ele ocupa o tile dos PES (`y`) e os 4 px de baixo do
   * tile de CIMA (`y-1`). Por isso os dois precisam estar livres (ver o cabecalho).
   */
  const standing = (x: number, y: number): boolean =>
    y > 0 && !blocked(x, y) && !blocked(x, y - 1) && blocked(x, y + 1);

  const key = (x: number, y: number) => `${x},${y}`;
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [];

  // Ponto de partida: o primeiro checkpoint da era, com o jogador CAINDO ate o chao.
  const start = level.spawns.find((s) => s.kind === 'checkpoint' && (s.era ?? era) === era);
  const startTile: [number, number] = start
    ? [Math.floor(start.at.x / 16), Math.floor(start.at.y / 16)]
    : [2, 2];

  let sy = startTile[1];
  while (sy < rows.length && !blocked(startTile[0], sy)) sy += 1;
  const startStanding: [number, number] = [startTile[0], Math.max(1, sy - 1)];
  visited.add(key(startStanding[0], startStanding[1]));
  queue.push(startStanding);

  while (queue.length > 0) {
    const [x, y] = queue.pop() as [number, number];

    const push = (nx: number, ny: number) => {
      if (ny < 0 || ny >= rows.length) return;
      if (!standing(nx, ny)) return;
      const k = key(nx, ny);
      if (visited.has(k)) return;
      visited.add(k);
      queue.push([nx, ny]);
    };

    // Andar
    push(x - 1, y);
    push(x + 1, y);

    // Subir em degraus
    for (let dy = 1; dy <= MAX_JUMP_UP; dy += 1) {
      let clear = true;
      for (let k = 1; k <= dy; k += 1) if (blocked(x, y - k)) clear = false;
      if (!clear) break;
      push(x, y - dy);
    }

    // Salto em arco (com verificacao de vao e de espaco acima do jogador)
    for (let dx = -MAX_JUMP_ACROSS; dx <= MAX_JUMP_ACROSS; dx += 1) {
      for (let dy = 0; dy <= MAX_JUMP_UP; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y - dy;
        if (ny < 0) continue;
        const step = Math.sign(dx);
        let clear = true;
        // O corredor na ALTURA DE DESTINO precisa estar livre.
        for (let k = 1; k <= Math.abs(dx); k += 1) if (blocked(x + step * k, ny)) clear = false;
        // E a cabeca do jogador precisa de espaco para SUBIR, na coluna DE ONDE ELE SALTA.
        // A coluna de destino NAO entra aqui: e ela que sustenta o pulo.
        for (let k = 1; k <= dy; k += 1) if (blocked(x, y - k)) clear = false;
        if (clear) push(nx, ny);
      }
    }

    // Queda (inclusive com deslocamento horizontal no ar)
    for (let dx = -MAX_JUMP_ACROSS; dx <= MAX_JUMP_ACROSS; dx += 1) {
      const step = Math.sign(dx);
      let clear = true;
      for (let k = 1; k <= Math.abs(dx); k += 1) if (blocked(x + step * k, y)) clear = false;
      if (!clear) continue;
      const nx = x + dx;
      let ny = y + 1;
      while (ny < rows.length && !blocked(nx, ny)) ny += 1;
      const landing = ny - 1;
      if (landing >= y) push(nx, landing);
    }
  }

  // Localiza o 'G' da era (o primeiro, e a validacao exige que exista exatamente um).
  let goal: { x: number; y: number } | null = null;
  for (let y = 0; y < rows.length && goal === null; y += 1) {
    const x = (rows[y] ?? '').indexOf('G');
    if (x >= 0) goal = { x, y };
  }

  return { visited, goal };
}

/** O objetivo e considerado alcancavel se o jogador consegue encostar na caixa dele (2x2). */
export function goalReachable(
  visited: Set<string>,
  goal: { x: number; y: number } | null,
): boolean {
  if (!goal) return false;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (visited.has(`${goal.x + dx},${goal.y + dy}`)) return true;
    }
  }
  return false;
}

export function countTile(rows: readonly string[], tile: string): number {
  let total = 0;
  for (const row of rows) {
    for (const ch of row) if (ch === tile) total += 1;
  }
  return total;
}

/**
 * Valida uma fase. Lista vazia = aprovada.
 * Nenhuma fase entra no jogo com esta lista nao vazia (o teste da CI falha antes).
 */
export function validateLevel(level: LevelDefinition): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const add = (problem: string, era?: EraId) => issues.push({ level: level.id, era, problem });

  // ---- 1. Estrutura de eras ----
  if (!level.tilemaps[level.startEra]) {
    add(`era inicial "${level.startEra}" nao possui tilemap`);
  }
  for (const era of level.unlockedEras) {
    if (!level.tilemaps[era]) add(`era declarada como desbloqueada ("${era}") nao possui tilemap`);
  }

  const eraIds = Object.keys(level.tilemaps) as EraId[];
  const heights = new Map<EraId, number>();
  const bedrocks = new Map<EraId, string>();

  for (const era of eraIds) {
    const rows = level.tilemaps[era];
    if (!rows || rows.length === 0) {
      add('tilemap vazio', era);
      continue;
    }

    // ---- 2. Geometria consistente ----
    const width = (rows[0] ?? '').length;
    rows.forEach((line, index) => {
      if (line.length !== width) {
        add(`linha ${index} tem ${line.length} colunas, esperado ${width}`);
      }
    });
    if (rows.length < 4) add(`altura ${rows.length} e pequena demais para uma fase (minimo 4)`);

    heights.set(era, rows.length);
    bedrocks.set(era, rows.slice(-2).join('|'));

    // ---- 3. Exatamente um objetivo ----
    const goals = countTile(rows, 'G');
    if (goals !== 1) add(`${goals} tiles de objetivo ('G') encontrados, esperado exatamente 1`, era);

    // ---- 4. Alcançabilidade com o kit completo (quebra-blocos disponivel) ----
    const { visited, goal } = reachableTiles(level, era, { breakBlocks: true });
    if (!goalReachable(visited, goal)) {
      add('objetivo INALCANCAVEL a partir do spawn (mesmo com Blocos Quebraveis)', era);
    }
  }

  // ---- 5. Invariavel de justica: trocar de era nunca pode derrubar o jogador ----
  if (eraIds.length > 1) {
    const first = eraIds[0] as EraId;
    const baseHeight = heights.get(first);
    const baseBedrock = bedrocks.get(first);
    for (const era of eraIds.slice(1)) {
      if (heights.get(era) !== baseHeight) {
        add(
          `altura ${heights.get(era)} difere de "${first}" (${baseHeight}): os mapas de eras ` +
            'diferentes precisam ter o mesmo tamanho para a troca nao reposicionar o jogador',
          era,
        );
      }
      if (bedrocks.get(era) !== baseBedrock) {
        add(
          `as 2 linhas de base diferem de "${first}": trocar de era pode derrubar o jogador ` +
            'numa cova invisivel (viola a Lente #30 — Justica)',
          era,
        );
      }
    }
  }

  // ---- 6. Ritmo: precisa existir checkpoint, e pelo menos um ANTES do objetivo ----
  const checkpoints = level.spawns.filter((s) => s.kind === 'checkpoint');
  if (checkpoints.length === 0) add('nenhum checkpoint na fase (viola a Lente #41)');

  const goalXRaw = (() => {
    const rows = level.tilemaps[level.startEra];
    if (!rows) return 0;
    for (const row of rows) {
      const x = row.indexOf('G');
      if (x >= 0) return x;
    }
    return 0;
  })();

  if (checkpoints.length > 0 && !checkpoints.some((c) => c.at.x / 16 < goalXRaw)) {
    add('nenhum checkpoint antes do objetivo: uma morte perto do fim custa a fase inteira');
  }

  // ---- 6. Coerencia era x movimento (Lente #21: o espaco e a regra) ----
  // Uma entidade SEM era existe em TODAS as camadas com a MESMA identidade — correto
  // para o que nao se move (checkpoint, coletavel, ancora). Mas o corpo de um INIMIGO e
  // simulado por camada: a copia de outra era ficaria congelada, e trocar de era
  // "rebobinaria" o inimigo. Em fases com mais de uma era, inimigo precisa de era.
  const eraIdsForSpawns = Object.keys(level.tilemaps) as EraId[];
  if (eraIdsForSpawns.length > 1) {
    level.spawns.forEach((spawn, index) => {
      if (spawn.era === undefined && isEnemy(spawn.kind)) {
        add(
          `inimigo "${spawn.kind}" (spawns[${index}]) sem era numa fase de ${eraIdsForSpawns.length} eras: ` +
            'a posicao simulada e por camada, entao a copia de outra era congelaria. ' +
            "Declare `era` para decidir em qual realidade ele existe",
        );
      }
    });
  }

  // ---- 7. Recompensas declaradas precisam EXISTIR (integridade de dados) ----
  // A assinatura da fita entra automaticamente em `unlockTape`, entao nao listar
  // habilidades NAO e problema. O problema e a fase prometer algo que nao existe:
  // seria uma recompensa que nao entrega (Lente #40).
  const rewards = level.rewards;
  if (rewards?.tape && SIGNATURE_ABILITY[rewards.tape] === undefined) {
    add(
      `a fase entrega a fita "${rewards.tape}", que nao tem habilidade assinatura ` +
        'definida em SIGNATURE_ABILITY: a fita chegaria muda (Lente #32)',
    );
  }

  for (const ability of rewards?.abilities ?? []) {
    if (ABILITIES[ability] === undefined) {
      add(`a recompensa lista a habilidade "${ability}", que nao existe em ABILITIES`);
    } else if (rewards?.tape && ABILITIES[ability].tape !== rewards.tape) {
      // Coerencia tematica: uma fase que entrega a Fita Rock nao deve conceder uma
      // habilidade da Fita Jazz — o jogador nao saberia com qual fita usa-la.
      add(
        `a habilidade "${ability}" pertence a fita "${ABILITIES[ability].tape}", ` +
          `nao a "${rewards.tape}" entregue pela fase`,
      );
    }
  }

  return issues;
}

export function validateAllLevels(levels: readonly LevelDefinition[]): LevelIssue[] {
  return levels.flatMap(validateLevel);
}

/** Formata para leitura humana, util em relatorio de teste e em `?validate=1`. */
export function formatIssues(issues: readonly LevelIssue[]): string {
  if (issues.length === 0) return 'OK: nenhuma divergencia encontrada.';
  return issues
    .map((i) => `[${i.level}${i.era ? `/${i.era}` : ''}] ${i.problem}`)
    .join('\n');
}
