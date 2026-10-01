/**
 * src/game/rng.ts — GERADOR SEMEADO (Lente #29).
 *
 * Por que: `Math.random()` dentro de `src/game/` e um anti-padrao explicito
 * (GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 12). Sem aleatoriedade reproduzivel:
 *   - nao existe replay confiavel;
 *   - ecos gravados deixariam de funcionar;
 *   - o epilogo nao pode reexibir as acoes reais do jogador;
 *   - bugs de balanceamento ficam impossiveis de reproduzir.
 *
 * Algoritmo: mulberry32 — pequeno, rapido e deterministico entre plataformas.
 */

export interface Rng {
  /** Proximo float em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Escolha uniforme de um array nao vazio. */
  pick<T>(items: readonly T[]): T;
  /** Teste com probabilidade `p` (0..1). */
  chance(p: number): boolean;
  /** Estado interno serializavel: permite salvar/restaurar a sequencia exata. */
  readonly state: number;
}

/**
 * Cria um RNG a partir de um seed. O seed vive no `GameState`, nunca fora dele.
 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number): number {
      if (max < min) throw new Error(`rng.int: intervalo invalido [${min}, ${max}]`);
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick: lista vazia');
      const item = items[Math.floor(next() * items.length)];
      // `items` e readonly e nao vazio: o indice sempre existe.
      return item as T;
    },
    chance(p: number): boolean {
      return next() < p;
    },
    get state(): number {
      return s;
    },
  };
}

/** Hash estavel de string para seed. Usado em `?seed=` e em ids de nivel. */
export function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
