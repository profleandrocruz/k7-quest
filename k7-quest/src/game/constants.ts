/**
 * src/game/constants.ts — VALORES FIXOS (nao sao "ajustaveis de balanceamento").
 *
 * Distincao importante (Lente #47): `gameBalance.ts` guarda o que se TUNE;
 * aqui ficam constantes de estrutura, que mudar quebraria o dominio.
 */

/** Tamanho do tile em unidades de mundo. Um tile de 16 px e a base da pixel art do projeto. */
export const TILE_SIZE = 16;

/** Frequencia da simulacao. O render pode rodar a 144 fps; a regra nunca. */
export const SIM_HZ = 60;

/** Duracao fixa de um passo de simulacao, em ms. */
export const SIM_STEP_MS = 1000 / SIM_HZ;

/** Limite de passos por frame: evita "espiral da morte" quando a aba perde o foco. */
export const MAX_STEPS_PER_FRAME = 5;

/** Se a aba ficar ociosa por mais que isso, o tempo nao e "recuperado" em rajada. */
export const MAX_FRAME_MS = 250;

/** Capacidade do log de acoes (replay/depuracao). Anel: o mais antigo sai. */
export const MAX_LOG_ENTRIES = 2000;

/** Teto de amostras de uma gravacao de eco, derivado de BALANCE.echoes. */
export const MAX_ECHO_FRAMES = 1200;

/**
 * Atalhos CANONICOS dos dois canais de decisao (Lentes #32, #59).
 *
 * Ficam aqui, e nao no HUD nem no keymap, para que os dois nunca divirjam: o que o
 * jogador VE na tela e exatamente a tecla que funciona.
 *   - Eras: numeros (a linha do tempo le como sequencia).
 *   - Fitas: letras (sao escolha de identidade, nao ordem cronologica).
 */
export const ERA_SHORTCUTS: readonly string[] = ['1', '2', '3', '4', '5'];
export const TAPE_SHORTCUTS: readonly string[] = ['z', 'x', 'c', 'v'];

/**
 * De quanto em quanto tempo (em passos) o estado e publicado para o React.
 * 6 passos = 10 Hz. Motivo (Lente #18): a simulacao roda a 60 Hz, mas o HUD nao
 * precisa. Receber 60 atualizacoes por segundo seria trocar fluidez por jank.
 */
export const HUD_PUBLISH_EVERY_STEPS = 6;

/** Chave do save no armazenamento local (ver src/engine/storage.ts). */
export const SAVE_KEY = 'k7-quest.save.v1';

/** Mundo/era de origem da campanha. */
export const CAMPAIGN_START_WORLD = 1;

/** Ordem da campanha (GDD: 5 mundos) - a UI usa isto para desenhar a linha do tempo. */
export const WORLD_ORDER = [1, 2, 3, 4, 5] as const;
