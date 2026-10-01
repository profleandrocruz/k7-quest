# Contexto de Arquitetura React — Derivado de *The Art of Game Design: A Book of Lenses* (3ª ed.)

> Complemento de `GAME_DESIGN_CONTEXT.md`. Aqui os princípios do livro são traduzidos em **decisões
> concretas de engenharia React**. Toda escolha técnica abaixo existe para servir a um princípio de design —
> a referência da lente está indicada em cada item.

---

## 1. Princípio norteador

> *"A tecnologia é o meio, não o propósito. Ela é a mais volátil das quatro lentes."* (Cap. 26 — Lente #92)

Consequência prática: **a lógica do jogo nunca pode depender de React.**
React é a camada de apresentação e de ciclo de vida do app; o jogo é um **sistema de regras puras**.
Isso entrega, de graça: testabilidade, determinismo, portabilidade (Lente #93 — Bola de Cristal) e a
possibilidade de trocar a camada de render sem tocar nas regras.

```
src/
├── game/                    # REGRAS PURAS — zero imports de React
│   ├── types.ts             # tipos do domínio (estado, ações, entidades)
│   ├── constants.ts         # valores fixos (dimensões, limites, ids)
│   ├── gameBalance.ts       # ÚNICO lugar com números ajustáveis (Lente #47)
│   ├── reduce.ts            # (state, action) => state   — redutor raiz puro
│   ├── rules/               # regras decompostas por sistema
│   │   ├── movement.ts
│   │   ├── combat.ts
│   │   └── economy.ts
│   ├── selectors.ts         # leituras derivadas (sem estado próprio)
│   └── rng.ts               # gerador semeado (Lente #29)
├── engine/                  # INTEGRAÇÃO COM O AMBIENTE
│   ├── useGameLoop.ts       # requestAnimationFrame + delta time
│   ├── useInput.ts          # teclado / mouse / toque / gamepad
│   ├── useSound.ts          # áudio (Lente #63/#58)
│   └── storage.ts           # persistência (Lente #39)
├── state/                   # PONTE REACT <-> game
│   ├── GameProvider.tsx     # context + dispatch
│   └── useGame.ts           # hooks de leitura
├── components/              # APRESENTAÇÃO
│   ├── GameCanvas.tsx
│   ├── hud/
│   └── screens/
└── content/                 # HISTÓRIA E DADOS
    ├── levels/
    └── text/
```

**Regra de ouro:** se um arquivo em `src/game/` importa `react`, a arquitetura está errada.


---

## 2. Estado como Ações Atômicas (Lentes #22, #24, #26)

> *Ação (#24): as ações atômicas devem ser poucas e combináveis.*

Modele cada ação do jogador como um **comando serializável**. Isso torna o jogo auditável, reproduzível
(replay = lista de comandos), testável e depurável.

```ts
// src/game/types.ts
export type Vec2 = { x: number; y: number };

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface Player {
  position: Vec2;
  facing: Facing;
  health: number;
  maxHealth: number;
  inventory: string[];
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameOver';

export interface GameState {
  phase: GamePhase;          // Lente #60: modo explicito, nunca booleanos soltos
  tick: number;              // tempo logico em ticks (nao em ms)
  player: Player;
  entities: Entity[];
  score: number;
  rngSeed: number;           // Lente #29: aleatoriedade reproduzivel
  log: GameEvent[];          // para replay/depuracao
}

// Comandos: poucos, combinaveis, sem logica embutida
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'MOVE'; direction: Facing }
  | { type: 'ATTACK'; targetId?: string }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'TICK'; deltaMs: number };
```

**Anti-padrão:** `{ type: 'DO_EVERYTHING', ...50 campos }`. Se uma ação faz coisas demais, ela não é atômica —
e você perde a capacidade de compor comportamento (Lente #23 — Emergência).

---

## 3. O redutor raiz é puro e determinístico (Lentes #22, #30)

```ts
// src/game/reduce.ts
import type { GameState, GameAction } from './types';
import { applyMovement } from './rules/movement';
import { createInitialWorld, tickWorld } from './rules/world';

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, phase: 'playing', ...createInitialWorld(state.rngSeed) };

    case 'PAUSE':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;

    case 'MOVE':
      // Regra #26: as regras sao estaveis e concentradas em rules/
      return applyMovement(state, action.direction);

    case 'TICK':
      return tickWorld(state, action.deltaMs);

    default:
      return state; // acao desconhecida nunca deve quebrar o jogo (Lente #30 Justica)
  }
}
```

**Requisitos obrigatórios do redutor:**
1. **Puro** — sem `Math.random()`, sem `Date.now()`, sem I/O. O tempo entra via `TICK`.
2. **Determinístico** — mesmo `(state, action)` produz o mesmo resultado, sempre.
3. **Total** — tratar ações em estados inválidos de forma silenciosa e previsível, não lançando exceções.
4. **Testável sem React** — o teste é `expect(reduce(s, a)).toEqual(expected)`.

---

## 4. Do random bruto ao random projetado (Lentes #28, #29, #34)

> *Precisamos de valor esperado e chance com distribuições definidas e justas.*

`Math.random()` é intestável e impede replay. Use um **PRNG semeado** dentro de `src/game/`.

```ts
// src/game/rng.ts
/** PRNG deterministico (xorshift32). Nunca use Math.random() dentro de src/game/. */
export function nextRandom(seed: number): { value: number; seed: number } {
  let s = seed | 0;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  const nextSeed = s | 0;
  return { value: ((nextSeed >>> 0) % 1_000_000) / 1_000_000, seed: nextSeed };
}

/** Aplica pesos e retorna um indice — use para tabelas de loot/recompensa (Lente #40). */
export function weightedPick<T>(items: T[], weights: number[], seed: number) {
  const total = weights.reduce((a, b) => a + b, 0);
  const { value, seed: s } = nextRandom(seed);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i] / total;
    if (value < acc) return { item: items[i], seed: s };
  }
  return { item: items[items.length - 1], seed: s };
}
```

**Boas práticas:**
- O seed vive no `GameState`; cada consumo atualiza o seed. Isso torna o jogo **replayável e reprodutível**.
- Use **tabelas de peso** em vez de `if` aleatórios: você passa a *ver* o valor esperado (Lente #28).
- Evite aleatoriedade em momentos decisivos de alta tensão sem explicar o resultado ao jogador
  (Lente #30 — Justiça: o jogador precisa entender por que ganhou/perdeu).
- Compense o azar com **pity timers** ou garantias (ex.: "após 5 falhas, o próximo é garantido") para

---

## 5. O game loop em React (Lentes #39, #18)

> *"A interface dá ao jogador um feedback contínuo"* — e o loop precisa produzir **tempo consistente**,
> independente do frame rate. Isso é a base do Fluxo (Lente #18).

**Regras obrigatórias:**
1. O loop visual roda em `requestAnimationFrame` **fora do ciclo de render do React**.
2. A simulação usa **delta time** normalizado em passos fixos (*fixed timestep*), para que o jogo seja
   determinístico e independente da máquina.
3. O React **não** recebe 60 setState por segundo. A simulação vive em uma `ref`/store externa; o React
   assina apenas o subconjunto de estado que a UI realmente mostra.

```ts
// src/engine/useGameLoop.ts
import { useEffect, useRef } from 'react';

const FIXED_STEP_MS = 1000 / 60; // passo logico fixo (determinismo)
const MAX_STEPS_PER_FRAME = 5;   // evita "espiral da morte" apos travadas

export function useGameLoop(
  isRunning: boolean,
  step: (deltaMs: number) => void,
) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const stepRef = useRef(step);
  stepRef.current = step; // sempre chama o step mais recente, sem reiniciar o loop

  useEffect(() => {
    if (!isRunning) return;

    lastRef.current = performance.now();
    accRef.current = 0;

    const frame = (now: number) => {
      const elapsed = now - lastRef.current;
      lastRef.current = now;
      accRef.current += elapsed;

      let steps = 0;
      while (accRef.current >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        stepRef.current(FIXED_STEP_MS);
        accRef.current -= FIXED_STEP_MS;
        steps++;
      }
      // Descarta acumulo excessivo (aba em background, travada do sistema)
      if (steps === MAX_STEPS_PER_FRAME) accRef.current = 0;

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isRunning]);
}
```

**Por que fixed timestep e não delta variável:**
- Comportamento idêntico em máquinas 30 Hz e 144 Hz (Lente #30 — Justiça).
- Testes e replays reproduzem exatamente (Lentes #22, #29).
- Colisão e física param de "atravessar paredes" quando o frame demora.

**Pausa (Lente #60):** pausar é `isRunning = false` **e** `phase = 'paused'`. Nunca pause só a animação,
deixando a simulação rodando — isso gera bugs de estado e quebra o contrato do jogador.

---

## 6. Números de balanceamento em um único lugar (Lente #47)

> *"Does my game feel right? Why or why not?"* — e a resposta depende de poder **ajustar rápido**.

Nunca espalhe números mágicos pelo código. Todo valor ajustável vive em um objeto central, tipado, com
comentários que explicam a **intenção de design** de cada valor.

```ts
// src/game/gameBalance.ts
/**
 * UNICO lugar com numeros ajustaveis do jogo.
 * Ao alterar qualquer valor, anote: data + o que mudou + por que (Lentes #90, #47).
 */
export const BALANCE = {
  player: {
    /** Lente #31/#18: vida alta = mais tolerante a erro = curva de dificuldade mais suave */
    maxHealth: 3,
    /** Lente #24: velocidade em unidades por SEGUNDO (o loop converte via delta) */
    moveSpeed: 180,
    /** Lente #57: invulnerabilidade apos dano — feedback claro sem punicao injusta */
    invulnerableMs: 1200,
  },
  difficulty: {
    /** Lente #18: multiplicador de dificuldade por nivel (fluxo progressivo) */
    enemySpeedGrowth: 1.08,
    /** Lente #18: teto para nao sair do canal de fluxo (ansiedade) */
    maxEnemySpeed: 420,
    /** Lente #40/#57: intervalo entre ondas — cria o ciclo "tenso/alivio" */
    waveIntervalMs: 2400,
  },
  rewards: {
    /** Lente #40: recompensas devem ser variaveis, mas compreensiveis */
    baseScorePerKill: 50,
    comboMultiplierStep: 0.25,
    comboWindowMs: 2000,
  },
  /** Lente #29: pesos das tabelas de sorteio — o valor esperado fica visivel */
  lootWeights: { common: 70, rare: 25, epic: 5 },
} as const;

export type Balance = typeof BALANCE;
```

**Regras:**
- `as const` para que o TypeScript acuse typos e permita derivar tipos.
- **Se você consegue ajustar o valor em runtime** (ex.: um painel de debug em dev), melhor ainda —
  é a Regra do Loop em plena força durante o balanceamento.
- Registre cada mudança de valor com a data e o motivo do playtest que a justificou.

---

## 7. Renderização: deixar o React fazer o que ele faz bem (Lentes #7, #58, #61)

**Separe as duas camadas:**

| Camada | Tecnologia | O que vai aqui |
|---|---|---|
| **Simulação** | `src/game/` puro | posição, colisão, regras, RNG, pontuação |
| **Render contínuo** | `<canvas>` via `ref` | sprites, partículas, animações de alta frequência |
| **UI/estado discreto** | React (JSX) | menus, HUD, inventário, diálogos, telas |

**Motivo (Lente #92 — Tecnologia):** o React reconcilia **árvores de UI**, não 60 objetos por segundo.
Empurrar cada frame pela reconciliação é pedir *jank* — e jank destrói o Fluxo (Lente #18) e a sensação
de controle (Lente #53).

**Boas práticas:**
- Simulação em `gameStateRef.current` (mutável, fora do React). Publique para o React apenas o que a UI
  precisa, e com **throttle** (ex.: 10 Hz para o HUD).
- Prefira **transforms** (`transform: translate()`), `opacity` e `will-change` nos elementos animados de UI.
  Evite animar `top/left/width/height/margin` (reflow).
- Para animações de UI, prefira **CSS transitions/keyframes** (rodam no compositor, fora do thread JS) em vez
  de interpolar via `setState`.
- `<canvas>`: dimensione considerando `devicePixelRatio` para não sair borrado.
- Desenhe em ordem de profundidade e agrupe operações; evite recriar objetos por frame (reuse/vetores pré-alocados).

**Juciness acessível em React (Lente #58), sem sacrificar performance:**
- *Squash & stretch* e *screen shake*: CSS keyframes disparados por classe/`data-*` (barato).
- Números que "pulam" ao mudar de valor: componente próprio, animação CSS curta, sem loop JS.
- Partículas e rastros: no `<canvas>`, não como nós do DOM.
- Som: sempre com feedback visual equivalente — nunca dependa só de áudio (Lente #48 — Acessibilidade).
- Respeite `prefers-reduced-motion`: juicy não pode virar hostil.

```ts
// src/engine/usePrefersReducedMotion.ts
import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
```



---

## 8. Input e Controle (Lentes #53, #54, #55, #56)

> *"O ideal é que a interface se torne invisível."* — Lente #56

**Princípios:**
- **Mapeie semântica, não teclas.** O jogo entende `MOVE_LEFT`, não `ArrowLeft`. Isso permite remapeamento
  (Lente #56: "customizar controles ajudaria ou atrapalharia?"), gamepad, toque e teclado sem tocar nas regras.
- **Input é ação, não estado**, exceto quando a própria continuidade é a mecânica (andar). Mesmo aí, o ideal é
  converter para uma intenção persistente (`intent: 'moving-left'`) aplicada pelo `TICK`.
- **Nunca leia input dentro de componentes visuais.** Input pertence a `src/engine/useInput.ts`, e o resultado
  é despachado como `GameAction`.

```ts
// src/engine/keymap.ts
export const KEYMAP: Record<string, GameAction['type'] | null> = {
  ArrowLeft: 'MOVE_LEFT',
  a: 'MOVE_LEFT',
  ArrowRight: 'MOVE_RIGHT',
  d: 'MOVE_RIGHT',
  ' ': 'ATTACK',
  Escape: 'PAUSE',
};
```

**Checklist de input:**
- [ ] Todos os comandos funcionam com **teclado** e **toque** (Lente #48 — acessibilidade e alcance).
- [ ] Existe forma de pausar e sair **a qualquer momento** (Lente #39 — respeitar o tempo do jogador).
- [ ] Teclas presas (janela perde foco) são liberadas em `blur` — evita o jogador "andar sozinho" (Lente #30).
- [ ] As configurações de controle são persistidas (Lente #56).
- [ ] Use `event.code` (posição física) e não `event.key`, para não quebrar com Shift/CapsLock ou layout ABNT.
- [ ] Foco está sempre em um elemento conhecido; a tecla não "rola" a página durante o jogo.

---

## 9. Acessibilidade como requisito de design (Lente #48)

> *"O jogador deve conseguir visualizar claramente os primeiros passos."*

Acessibilidade não é polimento final — é o que determina **quantas pessoas conseguem experienciar o jogo**.
Em React existem três frentes concretas:

1. **Percepção visual:** contraste adequado (≥ 4.5:1 para texto), não depender **apenas** de cor para
   informar (adicione forma, ícone ou texto), alvo de toque mínimo de 44×44 px.
2. **Percepção auditiva:** legendas/ícones para sons importantes; nunca colocar informação crítica só em áudio.
3. **Motor e cognição:** remapeamento de controles, ajuste/desligamento de shake e flash, opção de dificuldade,
   possibilidade de jogar com uma mão / apenas teclado, e pausa real.

**Acessibilidade semântica em React (essencial para telas e HUDs em DOM):**
- HUD e telas em **DOM** (não canvas) sempre que possível: já são acessíveis por padrão.
- `role` + `aria-live` para anúncios de eventos importantes (dano, item obtido, fim de jogo):
  - `aria-live="polite"` para informação de progresso (pontuação, itens).
  - `aria-live="assertive"` apenas para eventos críticos e raros (perigo, morte) — em excesso, atrapalha.
- Nunca dependa do `<canvas>` para comunicar informação que existe só como pixel.
- Lembre-se: *"a interface deve funcionar bem em todas as situações"* (Lente #56) — inclusive com
  conteúdo aumentado em 200%, com leitor de tela e em telas pequenas.

---

## 10. Persistência e o respeito ao tempo do jogador (Lente #39)

> *"O tempo é o recurso mais valioso do jogador."*

- **Salve o progresso automaticamente** e com frequência. Perder progresso é a punição mais cruel
  (Lente #41) e a menos educativa.
- **Sempre versione o save** (`{ version: N, data: ... }`) e implemente migração. Um save quebrado após
  atualizar o jogo é uma traição (Lente #30 — Justiça).
- Persistência vive em `src/engine/storage.ts`, **fora** de `src/game/` (que deve permanecer puro).
- Trate falhas: modo privado do navegador, cota excedida, JSON corrompido — o jogo deve iniciar mesmo assim.


---

## 11. Testes: o playtest técnico (Lentes #22, #30, #91)

Testar o jogo em código é a versão de engenharia do playtest: você está **coletando evidência** sobre
se o design funciona.

**O que testar (e por que):**
| Alvo | Tipo de teste | Lente |
|---|---|---|
| `reduce` para cada `GameAction` | unitário puro | #22, #26 |
| Sequências de ações / replay | integração | #29, #30 |
| Determinismo (mesmo seed ⇒ mesmo estado) | unitário | #29 |
| Tabelas de peso e valor esperado | unitário | #28 |
| Invariantes (vida nunca negativa, entidades fora dos limites removidas) | property-based | #30, #47 |
| Progressão de dificuldade dentro do canal de fluxo | unitário sobre `BALANCE` | #18, #31 |
| Fluxos de tela (menu → jogo → pausa → game over) | componente | #60 |

```ts
// exemplo: testar uma regra sem React algum
import { reduce } from '../src/game/reduce';
import { initialState } from '../src/game/initialState';

test('mover para a esquerda atualiza a posicao e o facing', () => {
  const before = { ...initialState, phase: 'playing' as const };
  const after = reduce(before, { type: 'MOVE', direction: 'left' });
  expect(after.player.facing).toBe('left');
  expect(after.player.position.x).toBeLessThan(before.player.position.x);
});

test('o jogo e deterministico para o mesmo seed', () => {
  const a = runActions(initialState, actions, 12345);
  const b = runActions(initialState, actions, 12345);
  expect(a).toEqual(b);
});
```

**Regra:** se uma regra só pode ser testada "jogando manualmente", ela provavelmente está acoplada ao
React — e isso é um sinal de arquitetura errada, não de teste difícil.

---

## 12. Anti-padrões React que quebram o design (evitar sempre)

| Anti-padrão | Problema de design | Correção |
|---|---|---|
| `setState` dentro do `requestAnimationFrame` | jank → quebra o Fluxo (#18) | `ref` + store externa + throttle para UI |
| `Math.random()` dentro de `src/game/` | não reproduzível, injusto, intestável (#29, #30) | PRNG semeado no `GameState` |
| `isPlaying` + `isPaused` + `isMenu` | modos ambíguos e impossíveis (#60) | um único `phase` (união de literais) |
| Números mágicos espalhados | balanceamento vira arqueologia (#47) | `gameBalance.ts` único |
| Lógica de regra dentro de `useEffect` | experiência imprevisível, não testável (#22) | regras puras em `src/game/`; efeitos só orquestram |
| Animação via `top/left` no DOM | engasgo, perda da sensação de poder (#53, #58) | `transform`/`opacity` ou `<canvas>` |
| Estado derivado duplicado | inconsistência → perda de confiança (#30) | `selectors.ts` e fonte única de verdade |
| Feedback só no fim da ação | interface "seca", sensação de lag (#57) | feedback imediato + confirmação depois |
| Depender de áudio para informação crítica | exclui jogadores (#48) | equivalente visual sempre |
| Frames dependentes do refresh da máquina | comportamento diferente por device (#18, #30) | fixed timestep |
| Um componente gigante que faz tudo | impossível iterar rápido (Regra do Loop) | dividir: simulação / engine / apresentação |

---

## 13. Resumo executivo (TL;DR para o dia a dia)

1. **A regra de jogo não conhece React.** `src/game/` é puro, determinístico e testável.
2. **Tudo que o jogador faz é uma ação atômica** despachada para um redutor puro.
3. **Todo aleatório é semeado** e vive no estado.
4. **Todo número ajustável está em `gameBalance.ts`**, com intenção de design no comentário.
5. **A simulação roda em fixed timestep**, fora do ciclo de render.
6. **React desenha UI discreta; canvas desenha o contínuo.**
7. **Feedback do jogador em ≤ 100 ms**, sempre com equivalente visual (nunca só áudio).
8. **Modos são explícitos** e comunicados em mais de um canal.
9. **Acessibilidade e `prefers-reduced-motion` são requisitos**, não extras.
10. **Nada substitui o loop**: construa, teste com humanos, ajuste, repita.

> **Sobre sessões curtas (Lentes #30, #34):** o estado do jogo deve poder ser **salvo e restaurado a
> qualquer momento** (ver seção 10). Em sessões de 5–15 minutos, a percepção de justiça depende de o
> jogador nunca perder progresso por causa do *runtime*, e sim apenas por decisão dele.
