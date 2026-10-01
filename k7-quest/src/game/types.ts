/**
 * src/game/types.ts — MODELO DE DOMINIO DO K7 QUEST.
 *
 * REGRA DE OURO (GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 1):
 *   "Se um arquivo em src/game/ importa react, a arquitetura esta errada."
 *
 * Este arquivo tambem nao importa phaser/pixi/three: o dominio e puro e portatil.
 * Motivo de design (Lente #92 - Tecnologia): o tema e a regra sao o que permanece;
 * o motor grafico e a parte mais volatil das quatro lentes.
 */
import type { GameAction } from './actions';

// ---------------------------------------------------------------------------
// Identidade (Lente #9 - Unificacao: o nome no codigo carrega o tema)
// ---------------------------------------------------------------------------

/**
 * Janus Solaris e Janus Luna sao O MESMO personagem com expressoes diferentes.
 * Nunca existe `gender` no codigo: a escolha e de apresentacao, nao de mecanica
 * (GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 2).
 */
export type AvatarId = 'solaris' | 'luna';

/** As cinco eras do Pixelverse = as cinco fases da vida. */
export type EraId = '8bit' | '16bit' | '32bit' | '3d' | 'quantum';

export type WorldId = 1 | 2 | 3 | 4 | 5;

export type LevelId = string;

/** Fitas Mestre. Nunca chamar de `weapon` ou `class` (glossario canonico). */
export type TapeId = 'rock' | 'pop' | 'jazz' | 'electronic';

/** Ex.: 'rock.impacto-sonoro'. Habilidades sao DADOS, nao codigo. */
export type AbilityId = string;

export const ERA_ORDER: readonly EraId[] = ['8bit', '16bit', '32bit', '3d', 'quantum'];
export const TAPE_ORDER: readonly TapeId[] = ['rock', 'pop', 'jazz', 'electronic'];

// ---------------------------------------------------------------------------
// Geometria (primitivas do dominio, nao do motor)
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export type Facing = 'left' | 'right';

/** Caixa alinhada aos eixos. Unica primitiva de colisao do dominio. */
export interface Aabb {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Mapa de colisao (Lente #21 - o modelo de espaco)
// ---------------------------------------------------------------------------

/**
 * Codigos de tile dos mapas em texto (GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 8):
 *   '.' vazio  '#' solido  'B' bloco quebravel (Rock)  '^' espinho
 *   '~' agua   'E' ancora de eco  'D' porta  'G' objetivo  'P' plataforma movel
 */
export type TileCode = '.' | '#' | 'B' | '^' | '~' | 'E' | 'D' | 'G' | 'P';

export interface CollisionGrid {
  width: number;
  height: number;
  tileSize: number;
  /** Uma string por linha do mapa. Legivel em diff de Git e testavel. */
  rows: string[];
}

// ---------------------------------------------------------------------------
// Eras (Lente #7 - Tetrade; Lente #21 - espaco)
// ---------------------------------------------------------------------------

export interface EraModifiers {
  gravityScale: number;
  moveSpeedScale: number;
  /** Lente #56: a tela DEVE comunicar visualmente a era ativa. */
  paletteTint: string;
  /** Trilha musical da era (Lentes #63, #58). */
  musicTrack: string;
}

/**
 * Modelo de COEXISTENCIA: todas as eras do nivel existem em memoria;
 * apenas uma esta "ativa" e e fisicamente solida.
 * (GAME_DESIGN_CONTEXT.md, secao 11.1 - modelo C, recomendado.)
 */
export interface EraLayer {
  era: EraId;
  /** Grade de colisao da era. Estatica por nivel. */
  collision: CollisionGrid;
  /** Entidades que so existem nesta era. */
  entities: Entity[];
  /** Modificadores de regra. O tema precisa ser MECANICO, nao decorativo. */
  modifiers: EraModifiers;
  /** Se a era ainda nao foi desbloqueada, ela aparece como fantasma (Lente #4). */
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

export type EntityKind =
  // Mundo 1 — Reino 8 Bits (Infancia)
  | 'pixelSlime'
  | 'cloudHopper'
  | 'toyKnight'
  | 'memoryBug'
  // Mundo 2 — Cidade 16 Bits (Adolescencia)
  | 'punkPixel'
  | 'speakerDrone'
  | 'corruptAmp'
  | 'cassetteCrawler'
  // Mundo 3 — Republica 32 Bits (Vida adulta na sociedade)
  | 'workerBot'
  | 'dataSpider'
  | 'securityProgram'
  | 'packetGhost'
  // Mundo 4 — Universo 3D (Familia)
  | 'careDrone'
  | 'memoryBird'
  | 'linkBeast'
  | 'guardianRoot'
  // Mundo 5 — Nexus Quantico (Terceira idade)
  | 'quantumShade'
  | 'archiveWisp'
  | 'echoSentinel'
  | 'neuralPhantom'
  // Estruturas e colecionaveis
  | 'pixelFragment'
  | 'floppy'
  | 'cartridge'
  | 'lostMemory'
  | 'checkpoint'
  | 'goal'
  | 'breakableBlock'
  | 'spike'
  | 'echoAnchor'
  | 'bossGate';

export interface Entity {
  id: string;
  kind: EntityKind;
  /** `null` = existe em TODAS as eras. */
  era: EraId | null;
  position: Vec2;
  size: Vec2;
  velocity?: Vec2;
  health?: number;
  /** Ecos: aponta para o dono e para a gravacao — nunca copia frames. */
  echo?: { ownerId: string; recordingId: string; loopStep: number };
  collected?: boolean;
  props?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Ecos Temporais (Lentes #8, #9, #65, #73) — a mecanica mais delicada
// ---------------------------------------------------------------------------

export interface EchoFrame {
  tick: number;
  dir: -1 | 0 | 1;
  jump: boolean;
  /** A habilidade EM USO naquele tick, se houver. */
  ability?: AbilityId;
}

export interface Echo {
  id: string;
  /** Era em que o eco foi gravado: ele so age nessa era (Lente #21). */
  era: EraId;
  /** Fita com que o eco foi gravado: usa as habilidades daquela fita. */
  tape: TapeId;
  /** Acoes gravadas, amostradas por tick, ancoradas na posicao inicial. */
  recording: EchoFrame[];
  basePosition: Vec2;
}

/** Estado de uma gravacao em andamento. */
export interface RecordingState {
  startedAtTick: number;
  frames: EchoFrame[];
}

/**
 * Corpo SIMULADO de um eco ativo.
 *
 * Decisao de engenharia: o eco nao guarda posicoes gravadas — ele guarda as ACOES
 * e as REPRODUZ pelo mesmo `stepMotion` do jogador. Consequencia: mesmo seed +
 * mesmas acoes => mesmo resultado (Lente #29), e o eco nunca "desmente" a fisica.
 */
export interface EchoBody {
  echoId: string;
  /** Corpo simulado: mesma estrutura do jogador, sem inventario nem progresso. */
  player: PlayerState;
  /** Indice do proximo frame de gravacao a consumir. */
  cursor: number;
  /** Tick em que o ciclo atual comecou (usado para feedback de "recomeco"). */
  cycleStartTick: number;
}

// ---------------------------------------------------------------------------
// Estado do jogador
// ---------------------------------------------------------------------------

/** Campos transitorios que o TICK consome (GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 5). */
export interface MotionState {
  isGrounded: boolean;
  /** Tempo tolerado apos sair da plataforma (100 ms) — sem injustica (Lente #53). */
  coyoteMs: number;
  /** Intencao de pulo lembrada por alguns ms (120 ms): a interface entende a intencao. */
  jumpBufferMs: number;
  /** Tempo restante de "pulo variavel": soltar cedo corta o pulo. */
  jumpCutMs: number;
  isDashing: boolean;
  dashMs: number;
  dashCooldownMs: number;
  /** Fita Jazz: planeio controlado. */
  hoverMs: number;
  /** Onda sonora do Rock em andamento. */
  attackMs: number;
  /** Impulso temporario (ex.: Sprint da Fita Pop). Torna a assinatura VISIVEL. */
  boostMs: number;
  boostSpeedScale: number;
  /** Cooldown restante por habilidade. */
  cooldowns: Record<AbilityId, number>;
}

/**
 * Entrada do jogador como DADO (nunca um dispositivo).
 *
 * Por que isto vive no dominio e nao na camada de input: um eco precisa
 * GRAVAR e REPRODUZIR exatamente esta estrutura. Se o input fosse um objeto de
 * teclado, a gravacao dependeria do hardware — e deixaria de ser reproduzivel.
 */
export interface MotionInput {
  dir: -1 | 0 | 1;
  /** Estado do botao de pulo (held). A BORDA e derivada comparando ticks. */
  jumpHeld: boolean;
  /** Borda de subida do pulo no tick atual. */
  jumpPressed: boolean;
  dashPressed: boolean;
}

export interface PlayerState {
  avatar: AvatarId;
  /** Era ativa. */
  era: EraId;
  activeTape: TapeId;
  unlockedTapes: TapeId[];
  unlockedAbilities: AbilityId[];
  position: Vec2;
  velocity: Vec2;
  size: Vec2;
  facing: Facing;
  health: number;
  maxHealth: number;
  energy: number;
  invulnerableMs: number;
  motion: MotionState;
}

// ---------------------------------------------------------------------------
// Fases (Lente #21 + Regra do Loop: fases sao DADOS, nao codigo)
// ---------------------------------------------------------------------------

export interface Objective {
  id: string;
  kind: 'reachGoal' | 'collectFragments' | 'defeatBoss' | 'activateEchoAnchor' | 'restoreRegion';
  target?: number;
  /** Texto mostrado ao jogador. Deve caber em uma linha (Lente #67). */
  description: string;
  /** Se definido, o objetivo so progride quando esta for a era ativa. */
  era?: EraId;
}

export interface Checkpoint {
  id: string;
  at: Vec2;
  era: EraId;
}

/**
 * Uma habilidade da Arvore de Habilidades (Game Bible).
 *
 * Habilidades sao DADOS (Lente #33 — Imaginacao): cada uma responde a uma pergunta do
 * jogador, e o comportamento mora em `content/abilityEffects.ts`, nunca num `switch`
 * espalhado pelo codigo.
 */
export interface Ability {
  /** Ex.: 'rock.impacto-sonoro'. Prefixo = fita dona (o `tape` abaixo). */
  id: AbilityId;
  /** Fita a que a habilidade pertence. So funciona com a fita tocando (Lente #32). */
  tape: TapeId;
  name: string;
  /** O que ela FAZ no mundo — o efeito concreto vive em `ABILITY_EFFECTS`. */
  kind:
    | 'areaDamage'
    | 'breakBlock'
    | 'mobility'
    | 'hover'
    | 'sense'
    | 'timeControl'
    | 'shield'
    | 'recordEcho'
    | 'hack';
  /** Custo em energia. Toda fita forte cobra algo (Lente #42). */
  cost: number;
  cooldownMs: number;
}

export interface EntitySpawn {
  kind: EntityKind;
  /**
   * Se ausente, o spawn existe em TODAS as eras com a MESMA identidade (`era: null`
   * na entidade carregada). So vale para coisas que NAO se movem: inimigos precisam
   * declarar a era, porque a posicao simulada e por camada (Lente #21).
   */
  era?: EraId;
  at: Vec2;
  props?: Record<string, unknown>;
}

export interface LevelDefinition {
  id: LevelId;
  world: WorldId;
  name: string;
  /** Era inicial e quais eras ficam desbloqueadas neste nivel. */
  startEra: EraId;
  unlockedEras: EraId[];
  /** Uma matriz de caracteres por era. */
  tilemaps: Partial<Record<EraId, string[]>>;
  spawns: EntitySpawn[];
  objectives: Objective[];
  dialogue?: DialogueTrigger[];
  musicRef: string;
  /**
   * Recompensas concedidas ao CONCLUIR a fase (Lente #40).
   * Ficam declaradas no dado da fase, nao em `if` espalhado pelo codigo — assim
   * um designer muda o que a fase entrega sem tocar em logica.
   */
  rewards?: {
    tape?: TapeId;
    /** Habilidades avulsas (tiers 2..5 da Arvore de Habilidades). */
    abilities?: AbilityId[];
    /** Era que a fase CONECTA ao terminar (o momento "as geracoes voltaram a conversar"). */
    unlockEra?: EraId;
  };
  /** Intencao de design da fase (Lente #90): por que ela existe, o que ela ensina. */
  designNote: string;
}

export interface LevelState {
  id: LevelId;
  /** Nome legivel, copiado da definicao no carregamento (o HUD nao consulta `content/`). */
  name: string;
  world: WorldId;
  /** Todas as eras do nivel, em memoria (modelo de coexistencia). */
  eras: Record<string, EraLayer>;
  objectives: Objective[];
  checkpoints: Checkpoint[];
  activeCheckpointId: string | null;
  /**
   * Fragmentos que o jogador JA trazia ao entrar na fase.
   *
   * Por que existe (bug de regra evitado): `progress.fragments` e CUMULATIVO entre
   * fases. Se o objetivo "recolha 5 fragmentos" comparasse com o total global, entrar
   * numa fase com 5 no bolso completaria o objetivo sem o jogador jogar. A comparacao
   * e sempre com o DELTA desta fase (Lente #49 — progresso tem que significar algo).
   */
  fragmentsAtStart: number;
  /**
   * Blocos de dialogo declarados na fase.
   * Ficam no ESTADO (e nao resolvidos por id em `content/`) para que o reducer
   * continue puro: uma sequencia de acoes pode ser reproduzida sem consultar
   * tabelas externas que poderiam mudar entre versoes (Lente #29).
   */
  dialogueSource: DialogueTrigger[];
  /** Recompensas declaradas na fase, aplicadas ao conclui-la (Lente #40). */
  rewards: LevelDefinition['rewards'] | undefined;
}

// ---------------------------------------------------------------------------
// Dialogo (Lentes #65, #90: narrativa tambem e dado)
// ---------------------------------------------------------------------------

export interface DialogueLine {
  speaker: string;
  /** Lente #64: a fala sugere emocao; nunca explica o que o jogador deve sentir. */
  text: string;
  fx?: { shake?: boolean; portrait?: string; music?: string };
}

export interface DialogueTrigger {
  id: string;
  when: 'onStart' | 'onEnterZone' | 'onDefeatBoss' | 'onCollect' | 'onCheckpoint';
  zoneId?: string;
  lines: DialogueLine[];
  /** Lente #39: o jogador pode pular. Nada e mais hostil que repetir um dialogo. */
  skippable: boolean;
}

/** Dialogo em andamento. Vive no ESTADO, nao no componente (Lente #60). */
export interface ActiveDialogue {
  id: string;
  lines: DialogueLine[];
  index: number;
  skippable: boolean;
}

// ---------------------------------------------------------------------------
// Fases do jogo (Lente #60: modos EXPLICITOS, nunca booleanos paralelos)
// ---------------------------------------------------------------------------

export type GamePhase =
  | 'boot'
  | 'title'
  | 'avatarSelect'
  | 'cutscene'
  | 'playing'
  | 'dialogue'
  | 'tapeSelect'
  | 'eraSelect'
  | 'paused'
  | 'bossIntro'
  | 'levelComplete'
  | 'gameOver'
  | 'ending';

/** Qual motor renderiza. Desacopla o dominio da tecnologia (Lente #92). */
export type RenderMode = 'platformer' | 'era3d' | 'physicsPuzzle';

// ---------------------------------------------------------------------------
// Feedback e auditoria (Lente #58 - juice; Regra do Loop em forma de codigo)
// ---------------------------------------------------------------------------

export type GameEventKind =
  | 'eraSwitch'
  | 'eraSwitchBlocked'
  | 'tapeSwitch'
  | 'tapeSwitchBlocked'
  | 'abilityUsed'
  | 'abilityBlocked'
  | 'damaged'
  | 'healed'
  | 'died'
  | 'respawned'
  | 'jumped'
  | 'landed'
  | 'dashed'
  | 'enemyDefeated'
  | 'fragmentCollected'
  | 'floppyCollected'
  | 'cartridgeCollected'
  | 'memoryCollected'
  | 'checkpointReached'
  | 'objectiveComplete'
  | 'levelComplete'
  | 'echoRecorded'
  | 'echoAnchorFound'
  | 'echoActivated'
  | 'echoCycled'
  | 'dialogueStart'
  | 'dialogueEnd';

export interface GameEvent {
  kind: GameEventKind;
  tick: number;
  message?: string;
  at?: Vec2;
}

// ---------------------------------------------------------------------------
// Estado raiz
// ---------------------------------------------------------------------------

export interface GameProgress {
  fragments: number;
  floppies: string[];
  cartridges: string[];
  lostMemories: string[];
  objectivesDone: string[];
  defeatedBosses: string[];
  /** Eras conectadas ate agora (o que a campanha ja restaurou). Persiste entre fases. */
  unlockedEras: EraId[];
  /** Ecos gravados pelo jogador, por era: o epilogo mostra as versoes REAIS dele. */
  savedRecordings: Partial<Record<EraId, EchoFrame[]>>;
  /** Restauracao visual da regiao: 0..1 (Lente #49 - progresso visivel). */
  regionRestoration: Record<string, number>;
}

export interface DebugFlags {
  invulnerable: boolean;
  showHitboxes: boolean;
  freeTapeSwitch: boolean;
}

export interface GameState {
  phase: GamePhase;
  /** Ritual de pausa: guarda a fase anterior para voltar exatamente a ela. */
  phaseBeforePause: GamePhase | null;
  /** Tempo LOGICO em ticks (nao em ms) — base do determinismo. */
  tick: number;
  /** Lente #29: aleatoriedade reproduzivel. */
  seed: number;
  avatar: AvatarId;
  player: PlayerState;
  level: LevelState;
  /**
   * INTENCAO de entrada pendente, consumida pelo proximo TICK.
   *
   * Por que vive no estado (e nao numa variavel do componente): o log de acoes
   * passa a conter TUDO o que o jogador fez. Consequencia gratuita: replay real e
   * ecos gravados a partir do log (Lentes #24, #29).
   */
  input: MotionInput;
  echoes: Echo[];
  /** Corpos simulados dos ecos ATIVOS (chave = echoId). */
  echoBodies: Record<string, EchoBody>;
  recording: RecordingState | null;
  activeEchoId: string | null;
  dialogue: ActiveDialogue | null;
  /** Motor de render ativo. O dominio decide, a tecnologia obedece. */
  renderMode: RenderMode;
  /**
   * Tempo "congelado" por uma habilidade (Jazz/Eletronica).
   * Motivo de design (Lente #33): a habilidade precisa mudar a REGRA do mundo,
   * nao apenas o numero do jogador. Congelar o mundo e a versao mecanica de
   * "a nota certa muda o compasso".
   */
  timeFreezeMs: number;
  progress: GameProgress;
  /** Log de comandos: permite replay e depuracao. */
  log: GameAction[];
  /** Eventos do ULTIMO tick, para juice e feedback (Lente #58). */
  events: GameEvent[];
  debug: DebugFlags;
}
