/**
 * src/game/content/levels/world1.ts — MUNDO 1: O REINO DAS PRIMEIRAS MEMORIAS.
 *
 * Este arquivo e o VERTICAL SLICE. Ele existe para responder a pergunta mais cara
 * do projeto (GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 14):
 *
 *   "O Sistema de Eras e divertido por 5 minutos?"
 *
 * Nenhuma fase daqui usa mais de 2 eras e nenhuma dura mais de 5 minutos.
 * Se o vertical slice nao for divertido, mais conteudo nao conserta isso.
 *
 * CONVENCAO GEOMETRICA (importante para ler os mapas):
 *   - O chao e a linha `GROUND`: a superficie fica no TOPO dessa linha.
 *   - Um jogador em pe no chao ocupa as linhas GROUND-2 e GROUND-1.
 *   - Plataformas flutuantes em GROUND-3 deixam o jogador PASSAR POR BAIXO.
 */
import type { LevelDefinition } from '../../types';
import { at, empty, putAll, row, tilemap } from './authoring';

const W = 60;

/**
 * Convencao geometrica dos mapas do Mundo 1 (importante para ler os tilemaps):
 * o chao e a linha 11; a superficie fica no TOPO dela, e o jogador em pe a ocupa
 * as linhas 9 e 10. Plataformas flutuantes ficam em r8 ou acima, para que exista
 * a opcao de PASSAR POR BAIXO.
 *
 * (A constante nao existe de proposito: `noUnusedLocals` esta ligado, e uma constante
 * so-documentacao nao se paga. O que e INVARIANTE — mesma altura e mesma base em todas
 * as eras — e cobrado pelo validador, nao por um comentario.)
 */

/** Chao do Mundo 1: com duas depressoes rasas (nunca covas — o tutorial nao pune). */
const groundW1 = row(W, [
  ['#', 20],
  ['.', 4],
  ['#', 20],
  ['.', 4],
  ['#', 12],
]);

const bedrock = [row(W, [['#', W]]), row(W, [['#', W]])];

/**
 * FASE 1.1 — Parque dos Primeiros Pixels.
 *
 * Intencao de design: ensinar movimento e o GRAVADOR DE ECO sem nenhum risco.
 * Objetivo narrativo (Narrative Bible): aprender a andar e encontrar o Walkman Temporal.
 * A fase tem ZERO inimigos: a primeira impressao precisa ser convite, nao combate (#34).
 */
export const W1_L1: LevelDefinition = {
  id: 'w1-l1-parque',
  world: 1,
  name: 'Parque dos Primeiros Pixels',
  startEra: '8bit',
  unlockedEras: ['8bit'],
  tilemaps: {
    '8bit': tilemap(W, [
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      row(W, [[".", 30], ["#", 3]]), // r6  plataforma alta
      empty(W),
      row(W, [[".", 14], ["#", 5]]), // r8  plataforma baixa (da para PASSAR POR BAIXO)
      empty(W),
      putAll(empty(W), [[8, "E"], [56, "G"]]), // r10 ancora de eco + objetivo
      groundW1,
      ...bedrock,
    ]),
  },
  spawns: [
    { kind: 'checkpoint', at: at(6, 9) },
    { kind: 'pixelFragment', at: at(10, 9) },
    { kind: 'pixelFragment', at: at(16, 7) },
    { kind: 'pixelFragment', at: at(24, 9) },
    { kind: 'pixelFragment', at: at(31, 5) },
    { kind: 'pixelFragment', at: at(40, 9) },
    { kind: 'floppy', at: at(20, 9), props: { reveal: 'concept-art.parque' } },
  ],
  objectives: [
    { id: 'w1l1.goal', kind: 'reachGoal', description: 'Chegue ao fim do parque' },
    {
      id: 'w1l1.fragments',
      kind: 'collectFragments',
      target: 5,
      description: 'Recolha 5 Fragmentos de Pixel',
    },
  ],
  dialogue: [
    {
      id: 'w1l1.intro',
      when: 'onStart',
      skippable: true,
      lines: [
        { speaker: 'Mnemos', text: 'As geracoes deixaram de conversar.' },
        { speaker: 'Mnemos', text: 'Agora elas comecaram a se temer.' },
        { speaker: 'Pix', text: 'Voce e novo por aqui?' },
        { speaker: 'Pix', text: 'Nao deixe os pixels apagarem suas lembrancas.' },
      ],
    },
  ],
  musicRef: 'bgm.8bit.primeiros-pixels',
  rewards: {
    /**
     * DIVERGENCIA REGISTRADA (docs/decisions/0005-recompensas-das-fases.md):
     * o GDD concede a Fita Rock ao vencer o Menino Eterno, mas a Narrative Bible
     * define que o prologo termina ao ENCONTRAR o Walkman Temporal. Aqui o Walkman
     * entrega a Fita Rock, para que exista escolha de fita ANTES do chefe.
     */
    tape: 'rock',
    abilities: ['rock.impacto-sonoro'],
  },
  designNote:
    'Ensinar movimento e o gravador de eco. Sem inimigos e sem covas: a primeira fase ' +
    'nunca pode punir (Lentes #34, #48). A plataforma baixa fica em r8 para que o jogador ' +
    'POSSA andar por baixo dela e escolha subir por curiosidade.',
};

/**
 * FASE 1.2 — Castelo de Blocos.
 *
 * Intencao de design: provar que a Fita Rock tem uma habilidade QUALITATIVA.
 * O obstaculo principal (parede de Blocos, cols 22-23) tem DUAS solucoes (Lente #32):
 *   (a) quebrar os blocos com o Impacto Sonoro (Fita Rock);
 *   (b) contornar pela rota alta: r8 (cols 15-17) -> r6 (cols 18-21) -> topo da parede.
 * Nenhuma delas e "a senha": as duas sao descobertas por curiosidade.
 */
export const W1_L2: LevelDefinition = {
  id: 'w1-l2-castelo',
  world: 1,
  name: 'Castelo de Blocos',
  startEra: '8bit',
  unlockedEras: ['8bit'],
  tilemaps: {
    '8bit': tilemap(W, [
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      empty(W),
      row(W, [[".", 18], ["#", 4]]), // r6  rota alta (2o pulo)
      row(W, [[".", 22], ["#", 2]]), // r7  topo INAMOVIVEL da parede
      row(W, [[".", 15], ["#", 3], [".", 4], ["#", 2]]), // r8 1o pulo + parede
      row(W, [[".", 22], ["B", 2]]), // r9  bloco quebravel (altura da cabeca)
      putAll(
        row(W, [[".", 22], ["B", 2], [".", 14], ["^", 3], [".", 10]]),
        [[52, "G"]],
      ), // r10 bloco quebravel (altura do corpo) + espinhos + objetivo
      row(W, [['#', 30], ['.', 3], ['#', 27]]),
      ...bedrock,
    ]),
  },
  spawns: [
    { kind: 'checkpoint', at: at(5, 9) },
    { kind: 'checkpoint', at: at(32, 9) },
    { kind: 'pixelFragment', at: at(9, 9) },
    { kind: 'pixelFragment', at: at(16, 7) },
    { kind: 'pixelFragment', at: at(19, 5) },
    { kind: 'pixelFragment', at: at(28, 9) },
    { kind: 'pixelFragment', at: at(45, 9) },
    { kind: 'floppy', at: at(47, 9), props: { reveal: 'conceito.castelo' } },
    { kind: 'toyKnight', at: at(27, 9), props: { patrol: 4 } },
    { kind: 'toyKnight', at: at(42, 9), props: { patrol: 3 } },
    { kind: 'memoryBug', at: at(35, 9), props: { patrol: 2 } },
  ],
  objectives: [
    { id: 'w1l2.goal', kind: 'reachGoal', description: 'Abra o caminho e alcance a torre' },
    {
      id: 'w1l2.fragments',
      kind: 'collectFragments',
      target: 5,
      description: 'Recolha 5 Fragmentos de Pixel',
    },
  ],
  dialogue: [
    {
      id: 'w1l2.guardian',
      when: 'onStart',
      skippable: true,
      lines: [
        { speaker: 'Guardiao dos Blocos', text: 'As coisas mudam quando crescemos.' },
        { speaker: 'Guardiao dos Blocos', text: 'Mas continuam sendo nossas.' },
      ],
    },
  ],
  musicRef: 'bgm.8bit.castelo-de-blocos',
  rewards: {
    abilities: ['rock.quebra-blocos'],
  },
  designNote:
    'Provar a habilidade qualitativa da Fita Rock. Duas solucoes para a parede ' +
    '(quebrar ou contornar) — Lente #32. Espinhos tiram 1 de vida, nunca matam de ' +
    'imediato: o castelo ensina que escolher a rota e do jogador.',
};

/**
 * FASE 1.3 — Bosque da Imaginacao. A FASE DECISIVA DO VERTICAL SLICE.
 *
 * Aqui o Sistema de Eras deixa de ser novidade e passa a ser NECESSARIO.
 * O par de mapas e o argumento inteiro da fase:
 *
 *   8 bits  -> uma parede em cols 30-31 bloqueia o caminho; abaixo dela ha Blocos
 *              quebraveis (Fita Rock). Nao existe parede em cols 44-45.
 *   16 bits -> a parede de cols 30-31 NAO existe; aparece uma em cols 44-45,
 *              contornavel por uma escada de plataformas (r9 -> r7 -> r5).
 *
 * Resultado de design: o jogador atravessa a fase ALTERNANDO eras, e cada
 * obstaculo conserva duas solucoes (Lente #32):
 *   - Parede A: quebrar com Rock  OU  trocar para 16 bits.
 *   - Parede B: subir a escada    OU  trocar para 8 bits.
 *
 * Fragmentos foram colocados DENTRO de cada era (um so existe em 8 bits, outro so
 * em 16 bits) para recompensar a troca por curiosidade, e nao apenas por obrigacao.
 *
 * O chao e IDENTICO nas duas eras de proposito: trocar de era nunca pode derrubar
 * o jogador numa cova que ele nao podia ver (Lente #30 — justica).
 */
const W3 = 64;

const groundW3 = row(W3, [
  ['#', 18],
  ['.', 3],
  ['#', 20],
  ['.', 3],
  ['#', 20],
]);

const bedrockW3 = [row(W3, [['#', W3]]), row(W3, [['#', W3]])];

export const W1_L3: LevelDefinition = {
  id: 'w1-l3-bosque',
  world: 1,
  name: 'Bosque da Imaginacao',
  startEra: '8bit',
  unlockedEras: ['8bit', '16bit'],
  tilemaps: {
    '8bit': tilemap(W3, [
      empty(W3),
      empty(W3),
      empty(W3),
      empty(W3),
      empty(W3),
      row(W3, [[".", 30], ["#", 2], [".", 10], ["#", 2]]), // r5  topo da parede A + escada
      row(W3, [[".", 30], ["#", 2]]), // r6  parede A
      row(W3, [[".", 30], ["#", 2], [".", 7], ["#", 2]]), // r7  parede A + escada
      row(W3, [[".", 30], ["#", 2]]), // r8  parede A
      row(W3, [[".", 30], ["B", 2], [".", 4], ["#", 2]]), // r9  Blocos + escada
      putAll(row(W3, [[".", 30], ["B", 2], [".", 26]]), [[58, "G"]]), // r10 Blocos + objetivo
      groundW3,
      ...bedrockW3,
    ]),
    '16bit': tilemap(W3, [
      empty(W3),
      empty(W3),
      empty(W3),
      empty(W3),
      empty(W3),
      row(W3, [[".", 42], ["#", 4]]), // r5  topo da escada continua ate o topo da parede B
      row(W3, [[".", 44], ["#", 2]]), // r6  parede B
      row(W3, [[".", 39], ["#", 2]]), // r7  escada
      row(W3, [[".", 44], ["#", 2]]), // r8  parede B
      row(W3, [[".", 36], ["#", 2]]), // r9  primeiro degrau
      putAll(row(W3, [[".", 44], ["#", 2], [".", 12]]), [[58, "G"]]), // r10 parede B + objetivo
      groundW3,
      ...bedrockW3,
    ]),
  },
  spawns: [
    { kind: 'checkpoint', at: at(5, 9) },
    { kind: 'checkpoint', at: at(54, 9) },
    { kind: 'pixelFragment', at: at(10, 9) },
    { kind: 'pixelFragment', at: at(20, 9) },
    { kind: 'pixelFragment', at: at(33, 8), era: '8bit' },
    { kind: 'pixelFragment', at: at(37, 8), era: '16bit' },
    { kind: 'pixelFragment', at: at(52, 9) },
    { kind: 'floppy', at: at(50, 9), era: '16bit', props: { reveal: 'conceito.bosque' } },
    { kind: 'pixelSlime', at: at(24, 9), era: '8bit', props: { patrol: 3 } },
    { kind: 'memoryBug', at: at(47, 9), era: '16bit', props: { patrol: 2 } },
  ],
  objectives: [
    { id: 'w1l3.goal', kind: 'reachGoal', description: 'Atravesse o bosque alternando eras' },
    {
      id: 'w1l3.fragments',
      kind: 'collectFragments',
      target: 4,
      description: 'Recolha 4 Fragmentos de Pixel',
    },
  ],
  dialogue: [
    {
      id: 'w1l3.vinyl',
      when: 'onStart',
      skippable: true,
      lines: [
        { speaker: 'Mnemos', text: 'O bosque nao mudou. Voce mudou de idade.' },
        { speaker: 'Mnemos', text: 'O que era parede para um, e passagem para o outro.' },
      ],
    },
  ],
  musicRef: 'bgm.8bit.bosque-da-imaginacao',
  rewards: {
    /** O momento em que "as geracoes voltam a conversar" (Narrative Bible). */
    unlockEra: '16bit',
    abilities: ['pop.sprint'],
  },
  designNote:
    'A FASE QUE DECIDE O PROJETO. O jogador precisa alternar eras para atravessar, e ' +
    'cada parede conserva duas solucoes (Lente #32). O chao e identico nas duas eras ' +
    'de proposito: trocar de era nunca derruba o jogador numa cova invisivel (Lente #30).',
};

/**
 * ARENA — O Menino Eterno.
 *
 * A tese do chefe e "se eu crescer, deixo de ser feliz" e a regra que ela gera no
 * mundo e: O CENARIO REPETE A SI MESMO. A arena representa isso trocando as
 * plataformas entre as eras: a mesma plataforma reaparece noutro lugar, como um
 * dia que se repete. Em 16 bits as plataformas sao mais numerosas e mais espalhadas
 * — o mundo "congelado" tenta manter tudo no lugar, e o jogador precisa aceitar
 * que a passagem existe em outro arranjo.
 *
 * ESCOPO HONESTO: esta fase implementa arena + arranjo por era + recompensa. A luta
 * multi-forma (com a mecanica exclusiva de cada forma) e o proximo marco —
 * ver docs/decisions/0006-escopo-do-chefe.md.
 */
const W4 = 40;

const bedrockW4 = [row(W4, [['#', W4]]), row(W4, [['#', W4]])];

export const W1_BOSS: LevelDefinition = {
  id: 'w1-boss-menino-eterno',
  world: 1,
  name: 'O Menino Eterno',
  startEra: '8bit',
  unlockedEras: ['8bit', '16bit'],
  tilemaps: {
    '8bit': tilemap(W4, [
      empty(W4),
      empty(W4),
      empty(W4),
      empty(W4),
      empty(W4),
      row(W4, [[".", 12], ["#", 3]]), // r5
      empty(W4),
      row(W4, [[".", 26], ["#", 3]]), // r7  a MESMA plataforma, noutro lugar
      empty(W4),
      empty(W4),
      putAll(empty(W4), [[34, "G"]]), // r10
      row(W4, [["#", W4]]),
      ...bedrockW4,
    ]),
    '16bit': tilemap(W4, [
      empty(W4),
      empty(W4),
      empty(W4),
      empty(W4),
      empty(W4),
      row(W4, [[".", 12], ["#", 3], [".", 15], ["#", 3]]), // r5  repetida
      empty(W4),
      row(W4, [[".", 20], ["#", 3], [".", 3], ["#", 3]]), // r7  repetida duas vezes
      empty(W4),
      empty(W4),
      putAll(empty(W4), [[34, "G"]]),
      row(W4, [["#", W4]]),
      ...bedrockW4,
    ]),
  },
  spawns: [
    { kind: 'checkpoint', at: at(3, 9) },
    { kind: 'checkpoint', at: at(22, 9) },
    { kind: 'pixelFragment', at: at(13, 4) },
    { kind: 'pixelFragment', at: at(27, 6) },
    { kind: 'pixelFragment', at: at(31, 9) },
    { kind: 'pixelFragment', at: at(36, 9) },
    { kind: 'toyKnight', at: at(18, 9), era: '8bit', props: { patrol: 3 } },
  ],
  objectives: [
    { id: 'w1boss.goal', kind: 'defeatBoss', description: 'Enfrente o Menino Eterno' },
  ],
  dialogue: [
    {
      id: 'w1boss.intro',
      when: 'onStart',
      skippable: true,
      lines: [
        {
          speaker: 'O Menino Eterno',
          text: 'Se eu crescer, deixarei de ser feliz.',
        },
        {
          speaker: 'O Menino Eterno',
          text: 'Se eu impedir todos de crescerem, ninguem sofrera.',
        },
      ],
    },
  ],
  musicRef: 'bgm.8bit.menino-eterno',
  rewards: {
    /**
     * DIVERGENCIA REGISTRADA (docs/decisions/0005-recompensas-das-fases.md):
     * o GDD concede a Fita Pop ao Glitch Rider (Mundo 2). No vertical slice, a Fita
     * Pop vem aqui porque o jogo precisa de DUAS fitas para provar a escolha (Lente #32)
     * — sem a segunda fita, a decisao de identidade nao existe e o sistema nao e testavel.
     */
    tape: 'pop',
  },
  designNote:
    'A tese do Menino Eterno ("se eu crescer, deixo de ser feliz") vira REGRA: o cenario ' +
    'repete a si mesmo, e as plataformas reaparecem noutro arranjo em 16 bits. A luta ' +
    'multi-forma e o proximo marco (docs/decisions/0006-escopo-do-chefe.md).',
};

