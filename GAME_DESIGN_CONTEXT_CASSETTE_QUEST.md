# Contexto de Sistemas — *Cassette Quest: Echoes of Generations*

> Complemento aplicado de `GAME_DESIGN_CONTEXT.md` (lentes) e
> `GAME_DESIGN_CONTEXT_ARQUITETURA.md` (React). Este arquivo traduz o **GDD**, a **Game Bible** e a
> **Narrative Bible** em um **modelo de domínio implementável**, com os nomes que o código deve usar.
>
> **Regra:** quando o GDD e este arquivo divergirem, **este arquivo é a fonte para o código** e o GDD é a
> fonte para o design. Registre a divergência em `docs/decisions/` (ADR) e atualize o GDD.

---

## 1. Glossário canônico (use estes termos no código)

| Termo de jogo | Nome no código | Nunca chame de |
|---|---|---|
| Janus Solaris / Janus Luna | `AvatarId = 'solaris' \| 'luna'` | `gender`, `player1` |
| Sistema de Eras | `EraId` / `EraState` | `dimension`, `layer` |
| Fita (Rock/Pop/Jazz/Eletrônica) | `TapeId = 'rock' \| 'pop' \| 'jazz' \| 'electronic'` | `weapon`, `class` |
| Habilidades da fita | `AbilityId` | `spell`, `skill` |
| Ecos Temporais | `Echo` / `echoId` | `clone`, `npc2` |
| Fragmentos de Pixel | `PixelFragment` (ver "Pixel" abaixo) | `coin`, `gem` |
| Disquetes Antigos | `Floppy` | `collectible` |
| Cartuchos Lendários | `CartridgeId` | `upgrade` |
| Memórias Perdidas | `LostMemory` | `loreItem` |
| Bit Zero | `BitZeroForm` | `finalBossPhase` |
| Mundo | `WorldId` (1..5) | `chapter` |
| Fase | `LevelId` | `stage` |
| Checkpoint | `Checkpoint` | `savepoint` |

> **Motivo (Lente #9 — Unificação):** os nomes do código devem carregar o tema. Um desenvolvedor que lê
> `TapeId` pensa em música e identidade; quem lê `WeaponClass` pensa em combate genérico — e o código
> começa a divergir do design.

---

## 2. Modelo de domínio (`src/game/types.ts`)

```ts
// ---------- Identidade ----------
export type AvatarId = 'solaris' | 'luna';
export type EraId = '8bit' | '16bit' | '32bit' | '3d' | 'quantum';
export type WorldId = 1 | 2 | 3 | 4 | 5;
export type TapeId = 'rock' | 'pop' | 'jazz' | 'electronic';

/** Habilidades sao dados, nao codigo: permitem balancear e testar sem tocar em logica. */
export type AbilityId = string;   // ex.: 'rock.impacto-sonoro'

export interface Ability {
  id: AbilityId;
  tape: TapeId;
  name: string;
  /** Custo em energia (recurso unico, simples de comunicar — Lente #42). */
  cost: number;
  cooldownMs: number;
  /** O que a habilidade FAZ — descreve a identidade da fita, nao um numero (Lente #33). */
  kind: 'areaDamage' | 'breakBlock' | 'mobility' | 'hover' | 'timeControl'
      | 'hack' | 'shield' | 'sense' | 'recordEcho';
}

// ---------- Eras (Lente #21: modelo de espaco) ----------
/**
 * Modelo recomendado: COEXISTENCIA (ver GAME_DESIGN_CONTEXT.md, secao 11.1).
 * Todas as eras do nivel existem em memoria; apenas uma esta "ativa" e e fisicamente solida.
 */
export interface EraLayer {
  era: EraId;
  /** Grade de colisao da era. Estatica por nivel. */
  collision: CollisionGrid;
  /** Elementos que so existem nesta era (plataformas, portas, inimigos). */
  entities: Entity[];
  /** Modificadores de regra da era (ex.: 16bit = mais velocidade; 3d = profundidade). */
  modifiers: EraModifiers;
  /** Se a era ainda nao foi "desbloqueada" pelo jogador, ela aparece mas nao e acessivel. */
  unlocked: boolean;
}

export interface EraModifiers {
  gravityScale: number;
  moveSpeedScale: number;
  /** Lente #56: a tela DEVE comunicar visualmente a era ativa. */
  paletteTint: string;
  /** Trilha musical da era (Lente #63, #58). */
  musicTrack: string;
}

// ---------- Entidades ----------
export type EntityKind =
  | 'player' | 'enemy' | 'miniboss' | 'boss' | 'npc'
  | 'pixel' | 'floppy' | 'cartridge' | 'lostMemory' | 'checkpoint' | 'door' | 'hazard';

export interface Entity {
  id: string;
  kind: EntityKind;
  era: EraId;
  position: Vec2;
  velocity: Vec2;
  size: Vec2;
  /** Estado do comportamento da IA, com tipo restrito (nunca `any`). */
  ai?: EnemyAiState;
  health?: number;
  /** Ecos: aponta para o dono e o intervalo de reproducao. */
  echo?: { ownerId: string; recordingId: string; loopStep: number };
  collected?: boolean;
}
```

**Observações de design:**
- `EraLayer.modifiers` é onde o **tema vira regra**: a era 16 bits (adolescência) é fisicamente mais
  rápida e escorregadia; a era 3D (família) tem movimento mais "pesado" e cuidadoso; a era quântica
  (terceira idade) é mais leve e flutuante.
- Não existe `gender`. Janus Solaris e Luna são **o mesmo personagem com expressões diferentes** — a
  escolha é de apresentação, não de mecânica. Ramificar regras por avatar multiplicaria os testes por 2
  sem ganho de experiência (Lente #42 — Simplicidade).
- O eco é referenciado por `recordingId`, e não por cópia de frames: a gravação vive uma única vez e é
  reproduzida por vários ecos (economia de memória e clareza de dados).

---

## 3. Estado da partida (`src/game/state.ts`)

```ts
// src/game/state.ts
import type {
  AvatarId, EraId, TapeId, AbilityId, EraLayer, Entity, Echo,
  Vec2, Facing, LevelId, WorldId, Objective, Checkpoint,
} from './types';
import type { GameAction } from './actions';

/** Estado de movimento: campos transitorios que o TICK consome (ver secao 5). */
export interface MotionState {
  isGrounded: boolean;
  coyoteMs: number;       // tempo tolerado apos sair da plataforma
  jumpBufferMs: number;   // intencao de pulo lembrada por alguns ms
  isDashing: boolean;
  dashMs: number;
  hoverMs: number;        // fita Jazz
}

/** Fases do jogo — Lente #60: modos explicitos, nunca booleanos paralelos. */
export type GamePhase =
  | 'boot'          // carregando
  | 'title'         // menu inicial
  | 'avatarSelect'  // Janus Solaris ou Luna (prologo)
  | 'playing'       // jogando (overworld)
  | 'dialogue'      // caixa de dialogo aberta
  | 'tapeSelect'    // menu de troca de fita
  | 'cutscene'      // narrativa (pode conter 'paused')
  | 'paused'
  | 'bossIntro'
  | 'levelComplete'
  | 'gameOver'
  | 'ending';

export interface PlayerState {
  avatar: AvatarId;
  era: EraId;                 // era ativa
  activeTape: TapeId;
  unlockedTapes: TapeId[];
  unlockedAbilities: AbilityId[];
  position: Vec2;
  facing: Facing;
  health: number;
  maxHealth: number;
  energy: number;
  invulnerableMs: number;
  /** Estado de movimento (coyote time, jump buffer etc. — ver secao 5). */
  motion: MotionState;
}

export interface LevelState {
  id: LevelId;
  world: WorldId;
  /** Todas as eras do nivel, em memoria (ver secao 2). */
  eras: Record<EraId, EraLayer>;
  objectives: Objective[];
  checkpoints: Checkpoint[];
  activeCheckpointId: string | null;
}

export interface GameState {
  phase: GamePhase;
  /** Ritual: 'paused' entra e sai de 'cutscene' por sub-fase (ver GAME_DESIGN_CONTEXT.md 11.4). */
  phaseBeforePause: GamePhase | null;
  tick: number;
  seed: number;
  player: PlayerState;
  level: LevelState;
  echoes: Echo[];
  /** Entidade do eco ativo, se houver (Mundo 4+). */
  activeEchoId: string | null;
  progress: {
    fragments: number;
    floppies: string[];
    cartridges: string[];
    lostMemories: string[];
    /** Restauracao visual da regiao: 0..1 (Lente #49 — progresso visivel). */
    regionRestoration: Record<string, number>;
  };
  /** Log de comandos: permite replay e depuracao (Regra do Loop em forma de codigo). */
  log: GameAction[];
  debug: {
    /** `?seed=`, `?level=`, `?debug=1` — ferramentas de playtest (Processo, secao 7.1). */
    invulnerable: boolean;
    showHitboxes: boolean;
    freeTapeSwitch: boolean;
  };
}
```

---

## 4. O Sistema de Eras: dados e regras (`src/game/rules/eras.ts`)

O núcleo do jogo. Duas decisões de engenharia que definem tudo:

### 4.1 A troca de era é uma AÇÃO, com regra explícita

O `GameAction` completo (todas as ações do jogo) é declarado em `src/game/actions.ts`:

```ts
// src/game/actions.ts — comandos atomicos (Lente #24)
import type { AvatarId, EraId, TapeId, AbilityId } from './types';

export type GameAction =
  | { type: 'START_GAME'; avatar: AvatarId; seed: number }
  | { type: 'SWITCH_ERA'; era: EraId }          // Lente #21 — o diferencial do jogo
  | { type: 'SWITCH_TAPE'; tape: TapeId }       // Lente #32 — a escolha de identidade
  | { type: 'USE_ABILITY'; ability: AbilityId }
  | { type: 'RECORD_ECHO' }                     // Lentes #8/#9 — "deixar uma versao de si"
  | { type: 'ACTIVATE_ECHO'; echoId: string }
  | { type: 'MOVE'; direction: -1 | 0 | 1 }
  | { type: 'JUMP' }
  | { type: 'DASH' }
  | { type: 'ADVANCE_DIALOGUE' }
  | { type: 'RESPAWN' }
  | { type: 'TICK'; deltaMs: number };
```

### 4.2 Regras de troca de era (e as perguntas de design que geram cada regra)

| Regra | Por quê (design) | Lente |
|---|---|---|
| A troca é **instantânea** (< 100 ms de feedback visual) | o jogador precisa sentir poder, não espera | #53, #57 |
| Trocar de era **não** move o jogador de posição | a identidade é o que muda, não o lugar | #9 |
| Se a era de destino tiver um **bloco sólido** na posição do jogador, a troca é **bloqueada com feedback claro** | nunca punir com morte por uma ação de interface | #30 |
| Eras **não desbloqueadas** aparecem "fantasmas" | o jogador vê o que ainda não conquistou → curiosidade | #4 |
| Cada era tem um **modificador físico**, não só visual | o tema precisa ser mecânico, não decorativo | #7, #9 |
| A era ativa afeta **quem pode ser atingido** | ecos e inimigos pertencem a eras | #21 |
| Trocar de era **cancela** o dash/estado de habilidade | evita exploração por cancelamento | #30 |

```ts
// src/game/rules/eras.ts
import type { GameState, EraId } from '../types';

export function canSwitchEra(state: GameState, era: EraId): { ok: boolean; reason?: string } {
  const target = state.level.eras[era];

  // Lente #4: era bloqueada nao e um bug, e uma promessa
  if (!target.unlocked) return { ok: false, reason: 'Ainda nao conectada' };

  // Lente #30: bloqueio por colisao e legivel, nao letal
  const box = boxOf(state.player);
  if (collides(target.collision, box)) return { ok: false, reason: 'Espaco ocupado nesta era' };

  return { ok: true };
}

export function switchEra(state: GameState, era: EraId): GameState {
  const check = canSwitchEra(state, era);
  if (!check.ok) {
    // NUNCA lanca excecao: apenas registra um evento de feedback (Lente #57)
    return pushEvent(state, { kind: 'eraSwitchBlocked', reason: check.reason! });
  }
  return {
    ...state,
    player: { ...state.player, era, motion: resetTransientMotion(state.player.motion) },
  };
}
```

> **Pergunta de revisão obrigatória (Lente #32):** *em quantas situações do nível a era X é a **única**
> resposta?* Se a contagem for alta, o nível não tem escolha — tem uma senha. Alvo saudável:
> **cada obstáculo importante deve ter pelo menos 2 soluções** (mudar de era **ou** usar uma habilidade
> de fita diferente).


---

## 5. Movimento: "game feel" é obrigatório (Lentes #15, #57, #58)

Em um plataforma, o movimento **é** o jogo. Se andar/pular não for gostoso, nenhuma arte salva
(Lente #15 — o brinquedo precisa ser divertido sozinho). Implemente estes cinco elementos **desde o
protótipo 1**, não como polimento posterior:

| Elemento | O que é | Por que (Lente) |
|---|---|---|
| **Coyote time** | ainda dá para pular ~100 ms após sair da plataforma | #53 — o jogador sente controle, e não injustiça |
| **Jump buffer** | um pulo pressionado ~120 ms antes de aterrissar executa ao aterrissar | #56 — a interface "entende" a intenção |
| **Altura de pulo variável** | soltar o botão cedo corta o pulo | #24 — a mesma tecla produz decisões expressivas |
| **Aceleração/atrito assimétricos** | acelera mais rápido do que desacelera (ou o inverso, por fita) | #33 — a fita muda o *feel*, não só o número |
| **Squash & stretch + poeira** | feedback visual em cada aterrissagem | #58 — juciness: uma ação, várias recompensas |

```ts
// src/game/rules/motion.ts
import { BALANCE } from '../gameBalance';
import type { PlayerState } from '../state';

export function stepMotion(
  p: PlayerState,
  dtMs: number,
  input: { dir: -1 | 0 | 1; jump: boolean },
): PlayerState {
  const dt = dtMs / 1000;
  const era = BALANCE.eras[p.era];
  const tape = BALANCE.tapes[p.activeTape];

  // Fitas alteram o FEEL (Lente #33): Pop acelera, Rock e pesado, Jazz flutua
  const speed = BALANCE.player.moveSpeed * era.moveSpeedScale * tape.moveSpeedScale;
  const targetVx = input.dir * speed;

  const accel = input.dir === 0
    ? BALANCE.player.friction * dt
    : BALANCE.player.acceleration * tape.accelerationScale * dt;

  return {
    ...p,
    velocity: { x: approach(p.velocity.x, targetVx, accel), y: p.velocity.y },
    motion: {
      ...p.motion,
      isGrounded: p.motion.coyoteMs > 0,
      // Coyote time decai: zerado sem tocar o chao, o pulo e perdido (mas nunca injustamente)
      coyoteMs: p.motion.isGrounded
        ? BALANCE.player.coyoteMs
        : Math.max(0, p.motion.coyoteMs - dtMs),
      jumpBufferMs: input.jump
        ? BALANCE.player.jumpBufferMs
        : Math.max(0, p.motion.jumpBufferMs - dtMs),
    },
  };
}

/** Interpola em direcao ao alvo sem ultrapassar (movimento legivel, Lente #56). */
function approach(cur: number, target: number, delta: number): number {
  return cur < target ? Math.min(cur + delta, target) : Math.max(cur - delta, target);
}
```

**Calibração (Lente #47 — única pergunta: "parece certo?"):** os números de `BALANCE.player`
(`acceleration`, `friction`, `coyoteMs`, `jumpBufferMs`, `jumpVelocity`, `gravity`) devem ser ajustáveis
**em runtime** durante o desenvolvimento. Nenhum valor de game feel deve ser escolhido por cálculo —
apenas por sensação, com playtest.


---

## 6. Fitas e habilidades (Lentes #32, #33, #40)

### 6.1 Regra de design inegociável

> **Cada fita deve ter pelo menos UMA habilidade que muda QUALITATIVAMENTE como o jogador resolve
> problemas — e que não é redutível a "mais dano" ou "mais rápido".**

As 20 habilidades da árvore do GDD são um **roadmap**, não um compromisso de lançamento. Ordem correta:

| Ordem | Conteúdo | Justificativa |
|---|---|---|
| 1º | **1 habilidade assinatura por fita** (4 no total) | é o que prova o conceito (Lentes #33, #32) |
| 2º | 2ª habilidade de cada fita (8 no total) | as combinações começam a existir |
| 3º | Demais 3 por fita | progressão de maestria, conteúdo de fim de jogo |

### 6.2 Tabela de habilidades assinatura (proposta alinhada ao tema)

| Fita | Mundo (recompensa) | Habilidade assinatura | Efeito | Por que expressa a fita |
|---|---|---|---|---|
| **Rock** | 1 | *Impacto Sonoro* | onda que quebra blocos **e** empurra inimigos, sem dano em quem está longe | inconformismo: muda o cenário, não só o HP |
| **Pop** | 2 | *Sprint* | corrida com rastro; atravessa plataformas frágeis e alcança o inalcançável | visibilidade: estar à frente é a própria recompensa |
| **Jazz** | 3 | *Flutuação* | planeio controlado + parar no ar por um instante | improviso: o tempo é negociável |
| **Eletrônica** | 4 | *Hack Temporal* | congela um inimigo específico por N segundos (e, mais tarde, um **eco**) | controle do sistema: manipula regras, não corpos |

### 6.3 Modelo de dados das fitas e habilidades

```ts
// src/game/tapes.ts — dados, nao logica (permite balancear sem recompilar regra)
import type { AbilityId, TapeId } from './types';

export interface TapeDefinition {
  id: TapeId;
  world: number;                 // mundo em que a fita e obtida (no chefe)
  identity: string;              // o que a fita diz sobre quem Janus e (Lente #9)
  accentColor: string;           // cor de destaque na UI (Lente #59)
  abilities: AbilityId[];        // abilities[0] e sempre a assinatura (Lente #33)
}

export const TAPES: Record<TapeId, TapeDefinition> = {
  rock: {
    id: 'rock',
    world: 1,
    identity: 'Forca e inconformismo: quebrar barreiras',
    accentColor: '#c0392b',
    abilities: ['rock.impacto-sonoro'],
  },
  pop: {
    id: 'pop',
    world: 2,
    identity: 'Visibilidade e velocidade: estar a frente',
    accentColor: '#e84393',
    abilities: ['pop.sprint'],
  },
  jazz: {
    id: 'jazz',
    world: 3,
    identity: 'Improviso e paciencia: o tempo e negociavel',
    accentColor: '#2980b9',
    abilities: ['jazz.flutuacao'],
  },
  electronic: {
    id: 'electronic',
    world: 4,
    identity: 'Adaptacao e controle: manipular as regras',
    accentColor: '#16a085',
    abilities: ['electronic.hack-temporal'],
  },
};
```

> **Nota de alinhamento com o GDD (Lente #90):** a fita é obtida **no chefe do mundo** indicado acima
> (Rock no Menino Eterno — Mundo 1; Pop no Glitch Rider — Mundo 2; Jazz no Overclock — Mundo 3;
> Eletrônica no Construtor — Mundo 4). A árvore de 5 habilidades por fita da **Game Bible** é o
> **roadmap**; `abilities[0]` é o mínimo que precisa existir para a vertical slice.

> **Teste de balanceamento obrigatório (Lente #32):** para cada fase jogável, escreva **duas** sequências
> de ações que a vencem usando **fitas diferentes**. Se você não conseguir escrever a segunda, a fase tem
> uma **única** solução — e a promessa do jogo ("todas as versões importam") não está sendo cumprida
> naquele trecho.


---

## 7. Ecos Temporais (Lentes #8, #9, #65, #73) — a mecânica mais delicada

O conceito do GDD é: **versões alternativas de Janus auxiliam na resolução de desafios**.
Se for implementado como "NPC aliado", é desperdício. Se for implementado como **"você literalmente grava
uma versão de si mesmo e trabalha com ela"**, o tema vira jogabilidade.

### 7.1 Modelo recomendado: eco como gravação de ações

```ts
// src/game/types.ts (complemento)
export interface Echo {
  id: string;
  /** Era em que o eco foi gravado (o eco so age nessa era — Lente #21). */
  era: EraId;
  /** Fita com que o eco foi gravado: ele usa as habilidades daquela fita. */
  tape: TapeId;
  /** Acoes gravadas, amostradas por tick, ancoradas na posicao inicial. */
  recording: EchoFrame[];
  basePosition: Vec2;
}

export interface EchoFrame {
  tick: number;
  dir: -1 | 0 | 1;
  jump: boolean;
  ability?: AbilityId;   // a habilidade EM USO naquele tick
}
```

```ts
// src/game/rules/echoes.ts
/**
 * O eco e um "fantasma solidario": repete a acao gravada, ciclo apos ciclo.
 * Ele NAO interage com entidades de outras eras (Lente #21),
 * e a sua morte nao pune o jogador (Lente #41).
 */
export function echoFrameAt(echo: Echo, tick: number): EchoFrame {
  const index = Math.floor(tick / BALANCE.echo.sampleIntervalTicks) % echo.recording.length;
  return echo.recording[index];
}

/** Gravar um eco e uma acao do jogador (Lente #24: acao atomica, nao modo secreto). */
export function beginRecording(state: GameState): GameState {
  return { ...state, recording: { startedAtTick: state.tick, frames: [] } };
}
```

### 7.2 Decisões de design que isso permite (todas valem playtest)

| Situação | Uso do eco | Pergunta de design (Lente) |
|---|---|---|
| Porta que exige dois botões simultâneos | grave um eco e ative o seu | o conceito é entendido em 10 s? (#48) |
| Passagem que só existe em era futura | o eco "já conhece" a era | o comportamento do eco é previsível? (#56) |
| Luta de chefe do Mundo 4+ | grave uma sequência e trabalhe em dupla consigo | se o eco morrer, a punição é justa? (#41) |
| Epílogo | mostrar os ecos realmente gravados pelo jogador | o final ressoa pessoalmente? (#10, #97) |

> **Recomendação forte para o final do jogo:** o epílogo do GDD mostra as cinco versões de Janus caminhando
> juntas. Se o jogo **guardar as gravações de cada era**, o epílogo pode mostrar as **versões reais das
> sessões do jogador** — tornando a mensagem final pessoal (Lentes #10, #64, #97). Esse é o maior
> diferencial emocional que o projeto pode ter, e o custo é apenas **determinismo nas regras**.

---

## 8. Níveis como dados (Lente #21 + Regra do Loop)

Fases devem ser **dados**, não código. Isso permite que um designer crie conteúdo sem tocar em React,
e que a Regra do Loop rode mais vezes (Lente #90 + processo).

```ts
// src/game/levels/types.ts
export interface LevelDefinition {
  id: LevelId;
  world: WorldId;
  name: string;
  /** Era inicial e quais eras ficam desbloqueadas neste nivel. */
  startEra: EraId;
  unlockedEras: EraId[];
  /** Uma matriz de caracteres por era. '.' = vazio, '#' = solido, 'B' = bloco quebravel, etc. */
  tilemaps: Partial<Record<EraId, string[]>>;
  spawns: EntitySpawn[];
  objectives: Objective[];
  /** Blocos de dialogo, em sequencia, com gatilho. */
  dialogue?: DialogueTrigger[];
  musicRef: string;
  /** Intencao de design da fase (Lente #90): por que ela existe, o que ela ensina. */
  designNote: string;
}

export interface EntitySpawn {
  kind: EntityKind;
  /** Se ausente, o spawn existe em todas as eras. */
  era?: EraId;
  at: Vec2;
  props?: Record<string, unknown>;
}
```

**Formato do tilemap como strings — por que:**

```
'# = solido   . = vazio   B = bloco quebravel (Rock)
 ^ = espinho   ~ = agua    E = entrada de eco   D = porta'
```

- É **legível em diff de Git** (um designer vê o que mudou).
- É **editável à mão** e por ferramentas externas (Tiled, LDtk).
- É **testável** (um teste pode validar que toda fase tem saída alcançável).

**Validação automatizada obrigatória (Lente #30 — Justiça):** um teste que, para cada fase, verifica:
1. Existe caminho do spawn até o objetivo **em cada era permitida**.
2. Nenhum obstáculo exige uma habilidade **não desbloqueada** até aquele ponto.
3. Todo checkpoint é alcançável e existe pelo menos 1 antes de cada chefe.
4. Nenhuma fase tem mais de **N** obstáculos de solução única (ver seção 6.3).

> Esses testes são a versão automatizada do "o jogador entende o que fazer?" (Lente #48). Eles não impedem
> todos os problemas, mas barram a categoria inteira de fase impossível — que é a mais cara de descobrir
> tarde.


---

## 9. Balanceamento: `gameBalance.ts` do Cassette Quest

Aplicação direta da seção 6 de `GAME_DESIGN_CONTEXT_ARQUITETURA.md` ao domínio do jogo.

```ts
// src/game/gameBalance.ts
/**
 * UNICO lugar com numeros ajustaveis do Cassette Quest.
 * Alteracoes devem registrar: data + motivo (playtest que justificou) — Lentes #47, #90.
 */
export const BALANCE = {
  player: {
    maxHealth: 3,
    moveSpeed: 180,          // unidades por SEGUNDO
    acceleration: 900,       // px/s^2 — game feel, so por sensacao (Lente #47)
    friction: 1400,
    jumpVelocity: -420,
    gravity: 1500,
    coyoteMs: 100,           // Lentes #53/#57: tolerancia sem injustica
    jumpBufferMs: 120,
    invulnerableAfterHitMs: 1200,
    energyMax: 100,
    energyRegenPerSec: 12,
  },

  /** Lentes #7/#9/#21: cada era altera a REGRA, nao apenas o pixel. */
  eras: {
    '8bit':    { gravityScale: 1.00, moveSpeedScale: 1.00, paletteTint: '#5b8c5a' },
    '16bit':   { gravityScale: 1.15, moveSpeedScale: 1.25, paletteTint: '#c0392b' }, // adolescencia: rapido e escorregadio
    '32bit':   { gravityScale: 1.00, moveSpeedScale: 0.95, paletteTint: '#2c3e50' }, // produtividade: pressao
    '3d':      { gravityScale: 0.90, moveSpeedScale: 0.90, paletteTint: '#8e44ad' }, // familia: cuidado, peso
    'quantum': { gravityScale: 0.70, moveSpeedScale: 1.05, paletteTint: '#16a085' }, // tempo: leveza
  },

  /** Lentes #32/#33: cada fita altera o ESTILO de jogo, com um custo claro. */
  tapes: {
    rock:       { moveSpeedScale: 0.90, accelerationScale: 0.85 },
    pop:        { moveSpeedScale: 1.20, accelerationScale: 1.30 },
    jazz:       { moveSpeedScale: 1.00, accelerationScale: 1.10 },
    electronic: { moveSpeedScale: 1.05, accelerationScale: 1.00 },
  },

  eraSwitch: {
    /** Lente #57: a troca precisa ser instantanea — este e o tempo MAXIMO de feedback visual. */
    feedbackMs: 80,
    /** Evita spam que transformaria puzzles em exploit (Lente #30). */
    cooldownMs: 120,
  },

  echoes: {
    /** Amostragem da gravacao: ~4 amostras por segundo economizam memoria sem perder legibilidade. */
    sampleIntervalTicks: 15,
    /** Lente #41: o eco NAO pune o jogador — ele apenas pausa e reinicia o ciclo. */
    pauseOnEraMismatch: true,
    maxRecordingSeconds: 20,
  },

  rewards: {
    /** Lente #49: cada fragmento deve mover a restauracao VISIVEL da regiao. */
    fragmentsPerRestorationStep: 25,
    /** Lente #40: recompensas devem ser compreensiveis — impacto visual imediato. */
    pickupFeedbackMs: 300,
  },

  /** Lente #29: pesos visiveis = valor esperado visivel. */
  floppyDropChance: { enemy: 0.04, miniboss: 1.0, boss: 1.0 },
} as const;

export type Balance = typeof BALANCE;
```

**Como usar isso na prática (Regra do Loop):**
1. Todo número acima entra no jogo por **referência** (`BALANCE.player.jumpVelocity`), nunca copiado.
2. Durante o desenvolvimento, um painel em `?debug=1` permite editar em memória e ver o efeito na hora.
3. Cada mudança significativa vai para `docs/playtests.md` com a observação que a motivou.


---

## 10. Chefes e a luta final (Lentes #65, #77–#79, #31, #61)

Estrutura obrigatória para cada chefe do Cassette Quest:

```ts
// src/game/bosses/types.ts
export interface BossDefinition {
  id: string;
  world: WorldId;
  /** O ARGUMENTO do chefe (Lente #77): a crenca errada que ele encarna. */
  thesis: string;
  /** O que o chefe literalmente FAZ no mundo, decorrente da tese (Lente #65). */
  worldRule: string;
  /** A fita que a luta entrega como recompensa (Lente #40). */
  rewardTape?: TapeId;
  forms: BossForm[];
}

export interface BossForm {
  name: string;
  /** Mecanica EXCLUSIVA desta forma. Se nao for exclusiva, e so mais HP (Lente #32). */
  signatureMechanic: string;
  /** Fitas que resolvem esta forma naturalmente — SEMPRE ao menos duas. */
  intendedTapes: TapeId[];
  health: number;
}
```

### 10.1 Cada chefe como argumento mecânico (aplicando o GDD)

| Chefe | Tese (crença errada) | Como a tese vira **regra** no jogo |
|---|---|---|
| **O Menino Eterno** | "se eu crescer, deixo de ser feliz" | **congela o cenário à frente do jogador**: o caminho só abre quando o jogador *escolhe* avançar; a arena repete a mesma plataforma em ciclo |
| **Glitch Rider** | "se eu parar de correr, ninguém vai me notar" | nunca para; o dano só acontece se o jogador **tiver pressa** (a arena recompensa paciência e pune impulso) |
| **Overclock** | "meu valor depende do que produzo" | a arena tem um **contador de pressão crescente**; o jogador vence ao **ignorar** o contador e cumprir o objetivo real |
| **O Construtor** | "proteção sem confiança vira prisão" | ergue muros **entre o jogador e o objetivo**; destruí-los é necessário, mas libera perigo (a proteção era real) |
| **O Esquecido** | "quando minhas memórias desaparecerem, o que restará?" | **remove partes da arena progressivamente**; o jogador precisa preservar informação no caminho |
| **Bit Zero** (6 formas) | cada forma = um medo de uma fase da vida | cada forma exige a **fita do respectivo mundo** — a luta é o exame final do tema |

> **Regra de ouro dos chefes (Lentes #31, #32):** a luta está aprovada quando existe **mais de uma fita**
> que a resolve, **e** a solução "óbvia" (a mesma fita que o jogador vinha usando) é a **mais difícil**.
> Se o jogador vence as 6 formas de Bit Zero com uma fita só, o jogo contradiz a própria mensagem final.

### 10.2 Curva de interesse da luta final (Lente #61)

```
Interesse
  ^
  |         f2        f4                 FORMA ABSOLUTA
  |   f1     \       /  \                /
  |     \     \     /    \              /
  |      \     \   /      \            /
  |       v     v v        \          /
  |     respiro respiro     v        /
  |                          respiro/
  +--------------------------------------------> Tempo
     Entre formas: respiro, dialogo curto e RESTAURO DE VIDA
```

**Proibições explícitas (Lente #41):**
- **Nunca** reiniciar as 6 formas por causa de uma morte na forma 5. Checkpoint entre formas.
- **Nunca** ter uma forma puramente "enchimento de barra de vida". Se não tem mecânica exclusiva,
  corte ou funda (Lente #42 — Simplicidade).


---

## 11. Diálogo e narrativa como dados (Lentes #65, #90)

```ts
// src/game/dialogue/types.ts
export interface DialogueLine {
  speaker: string;              // 'Mnemos', 'Bit Zero', 'Vinyl', ...
  /** Lente #64 (Projecao): a fala sugere emocao; nunca explica o que o jogador deve sentir. */
  text: string;
  /** Efeito visual/sonoro que reforca a fala (Lente #58). */
  fx?: { shake?: boolean; portrait?: string; music?: string };
}

export interface DialogueTrigger {
  id: string;
  when: 'onEnterZone' | 'onDefeatBoss' | 'onCollect' | 'onCheckpoint';
  zoneId?: string;
  lines: DialogueLine[];
  /** Se true, o jogador pode pular (Lente #39 — respeitar o tempo do jogador). */
  skippable: boolean;
}
```

**Regras de escrita (derivadas das lentes):**
- **Lente #67 (Simplicidade/Transcendência):** a melhor fala diz menos e significa mais. As falas dos
  chefes no GDD já são curtas — preserve isso em qualquer expansão.
- **Lente #64 (Projeção):** nunca escrever "Bit Zero sente raiva"; escreva o que ele faz e diz, e deixe
  o jogador projetar.
- **Lente #39:** toda cutscene é `skippable` na segunda vez. Nada é mais hostil que repetir um diálogo.
- **Lente #65:** prefira **mostrar por mecânica** a narrar. Se uma cena explica algo que o jogador poderia
  **jogar**, substitua a cena por gameplay.

---

## 12. Checklist rápido de implementação (por sistema)

```markdown
### Era (SWITCH_ERA)
- [ ] Regra pura em src/game/rules/eras.ts, testada sem React
- [ ] Colisao na era de destino verificada antes da troca
- [ ] Feedback visual <=80ms (paleta + som + particula)
- [ ] Eras bloqueadas aparecem fantasma (curiosidade — Lente #4)
- [ ] Modificadores fisicos definidos em BALANCE.eras (nao apenas cor)
- [ ] Teste: nenhum obstaculo exige era nao desbloqueada ate aquele ponto

### Fita (SWITCH_TAPE)
- [ ] Habilidade assinatura existe e e QUALITATIVA (nao apenas numero)
- [ ] Fita ativa e visivel em 3 canais: avatar, HUD e paleta (Lente #59)
- [ ] Custo/limitacao clara de cada fita (Lente #33)
- [ ] Teste: a fase pode ser vencida por >= 2 fitas diferentes

### Eco (RECORD_ECHO / ACTIVATE_ECHO)
- [ ] Gravacao determinista (mesmo seed => mesmo eco)
- [ ] Eco nao interage com eras diferentes da sua
- [ ] Morte/pausa do eco nao pune o jogador (Lente #41)
- [ ] O jogador entende em 10s o que o eco faz (Lente #48)

### Chefe
- [ ] Cada forma tem mecanica EXCLUSIVA
- [ ] Ao menos 2 fitas resolvem a luta
- [ ] Checkpoint entre formas
- [ ] Dialogo de entrada e de derrota existe e e skippable
```

---

## 13. Ponto de partida recomendado para o código

Se nada foi implementado ainda, esta é a ordem que maximiza a Regra do Loop
(ver `GAME_DESIGN_CONTEXT_PROCESSO.md`, seção 13):

1. `src/game/types.ts`, `src/game/actions.ts`, `src/game/state.ts` (este arquivo, seções 2–3)
2. `src/game/gameBalance.ts` (seção 9)
3. `src/game/rules/motion.ts` (seção 5) — **protótipo "brinquedo"**: um quadrado que anda e pula
4. `src/engine/useGameLoop.ts` + `useInput.ts` (Arquitetura, seções 5 e 8)
5. `src/game/rules/eras.ts` (seção 4) — **protótipo "eras"**: uma sala, duas eras
6. `src/components/GameCanvas.tsx` — desenho em canvas do estado atual
7. Testes de `reduce`, determinismo e invariantes (Arquitetura, seção 11)

**Somente depois** desse caminho: fitas, ecos, níveis, chefes, cutscenes, arte final e som.

---

## 14. Resumo executivo do Cassette Quest

1. **Tema:** crescer não é abandonar quem fomos — e a jogabilidade deve provar isso.
2. **O risco nº 1 é o Sistema de Eras.** Nada de conteúdo antes de ele ser divertido por 5 minutos.
3. **Cada era muda uma REGRA**, não apenas um pixel. O tema precisa estar na mecânica (Lente #7).
4. **Cada fita precisa de uma habilidade qualitativa**, e toda fase deve ter **≥ 2 soluções** (Lente #32).
5. **O movimento é o jogo.** Coyote time, jump buffer e juciness desde o protótipo 1 (Lentes #15, #58).
6. **Ecos são gravações determinadas do jogador** — e o final pode mostrar as gravações reais dele.
7. **Cada chefe é um argumento**: a crença errada deve virar regra do mundo (Lentes #65, #77).
8. **Nenhuma fase reinicia 6 formas de chefe.** Checkpoint e respeito ao tempo (Lentes #39, #41).
9. **Fases são dados** (tilemaps em texto), validadas por testes automatizados de acessibilidade.
10. **Números em `BALANCE`**, ajustáveis em runtime, com registro datado no `docs/playtests.md`.

  a escolha é de apresentação, não de mecânica (evita ramificar regras e poluir o código).
