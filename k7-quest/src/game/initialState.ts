/**
 * src/game/initialState.ts — COMO UMA PARTIDA COMECA.
 *
 * Mantido fora do reducer porque "criar" e "evoluir" sao responsabilidades diferentes.
 * Um reducer que sabe criar estado inicial acumula regras de dois momentos distintos
 * e vira o "componente gigante" do dominio (Lente #42).
 */
import { STARTING_TAPE } from './content/tapes';
import { ERAS } from './content/eras';
import { getLevel, START_LEVEL_ID } from './content/levels';
import { BALANCE } from './gameBalance';
import { hashString } from './rng';
import { IDLE_INPUT } from './rules/motion';
import { triggerOnStart } from './rules/dialogue';
import { buildEraLayers, findPlayerStart } from './rules/tilemap';
import type {
  AvatarId,
  Checkpoint,
  GamePhase,
  GameState,
  LevelId,
  MotionState,
  PlayerState,
  Vec2,
} from './types';

export function createMotionState(): MotionState {
  return {
    isGrounded: false,
    coyoteMs: 0,
    jumpBufferMs: 0,
    jumpCutMs: 0,
    isDashing: false,
    dashMs: 0,
    dashCooldownMs: 0,
    hoverMs: 0,
    attackMs: 0,
    boostMs: 0,
    boostSpeedScale: 1,
    cooldowns: {},
  };
}

/**
 * O jogador nasce em 'playing' mas SEM habilidades.
 * Decisao de design (Lente #42): antes da primeira Fita Mestre o jogador tem
 * exatamente UMA coisa para aprender — andar e pular. Tudo mais e conquista.
 */
export function createPlayer(avatar: AvatarId, era: PlayerState['era'], at: Vec2): PlayerState {
  return {
    avatar,
    era,
    activeTape: STARTING_TAPE,
    unlockedTapes: [STARTING_TAPE],
    unlockedAbilities: [],
    position: { ...at },
    velocity: { x: 0, y: 0 },
    size: { x: BALANCE.player.width, y: BALANCE.player.height },
    facing: 'right',
    health: BALANCE.player.maxHealth,
    maxHealth: BALANCE.player.maxHealth,
    energy: BALANCE.player.energyMax,
    invulnerableMs: 0,
    motion: createMotionState(),
  };
}

function loadLevelInto(state: GameState, levelId: LevelId, phase: GamePhase): GameState {
  const level = getLevel(levelId);
  const eras = buildEraLayers(level, state.progress.unlockedEras);
  const startEra = level.startEra;
  const startLayer = eras[startEra];

  if (!startLayer) {
    throw new Error(`loadLevelInto: era inicial "${startEra}" ausente na fase "${level.id}"`);
  }

  const start = findPlayerStart(startLayer);

  // Os checkpoints sao derivados das ENTIDADES da era inicial: assim os ids batem
  // exatamente com os que `stepInteractions` compara (uma fonte de verdade so).
  const checkpoints: Checkpoint[] = startLayer.entities
    .filter((entity) => entity.kind === 'checkpoint')
    .map((entity) => ({ id: entity.id, at: { ...entity.position }, era: entity.era ?? startEra }));

  return {
    ...state,
    phase,
    phaseBeforePause: null,
    tick: 0,
    timeFreezeMs: 0,
    player: {
      ...state.player,
      era: startEra,
      position: start,
      velocity: { x: 0, y: 0 },
      motion: createMotionState(),
      health: state.player.maxHealth,
      energy: BALANCE.player.energyMax,
      invulnerableMs: 0,
    },
    level: {
      id: level.id,
      name: level.name,
      world: level.world,
      eras,
      objectives: level.objectives.map((objective) => ({ ...objective })),
      checkpoints,
      activeCheckpointId: checkpoints[0]?.id ?? null,
      fragmentsAtStart: state.progress.fragments,
      dialogueSource: level.dialogue ? [...level.dialogue] : [],
      rewards: level.rewards,
    },
    input: { ...IDLE_INPUT },
    echoes: [],
    echoBodies: {},
    recording: null,
    activeEchoId: null,
    dialogue: null,
    renderMode: ERAS[startEra].renderMode,
    events: [],
  };
}

/** Estado de boot: o jogo existe, mas nada comecou. Sem `null` em lugar nenhum. */
export function createInitialState(seed = hashString('k7-quest')): GameState {
  const base: GameState = {
    phase: 'boot',
    phaseBeforePause: null,
    tick: 0,
    seed,
    avatar: 'solaris',
    player: createPlayer('solaris', '8bit', { x: 0, y: 0 }),
    level: {
      id: START_LEVEL_ID,
      name: '',
      world: 1,
      eras: {},
      objectives: [],
      checkpoints: [],
      activeCheckpointId: null,
      fragmentsAtStart: 0,
      dialogueSource: [],
      rewards: undefined,
    },
    input: { ...IDLE_INPUT },
    echoes: [],
    echoBodies: {},
    recording: null,
    activeEchoId: null,
    dialogue: null,
    renderMode: 'platformer',
    timeFreezeMs: 0,
    progress: {
      fragments: 0,
      floppies: [],
      cartridges: [],
      lostMemories: [],
      objectivesDone: [],
      defeatedBosses: [],
      unlockedEras: [],
      savedRecordings: {},
      regionRestoration: {},
    },
    log: [],
    events: [],
    debug: { invulnerable: false, showHitboxes: false, freeTapeSwitch: false },
  };

  // Boot: o mundo esta montado, mas o jogo ainda nao comecou (nem dialogo).
  return loadLevelInto(base, START_LEVEL_ID, 'boot');
}

/**
 * Comeca uma partida de verdade: escolhe o avatar e zera o progresso.
 * O `seed` fica no estado e NUNCA muda durante a partida (Lente #29).
 */
export function startGame(state: GameState, avatar: AvatarId, seed?: number): GameState {
  const fresh: GameState = {
    ...state,
    phase: 'playing',
    seed: seed ?? state.seed,
    avatar,
    tick: 0,
    log: [],
    events: [],
    progress: {
      fragments: 0,
      floppies: [],
      cartridges: [],
      lostMemories: [],
      objectivesDone: [],
      defeatedBosses: [],
      unlockedEras: [],
      savedRecordings: {},
      regionRestoration: {},
    },
    player: createPlayer(avatar, '8bit', { x: 0, y: 0 }),
  };
  // A historia comeca junto com o controle: o jogador nunca le antes de poder agir.
  return triggerOnStart(loadLevelInto(fresh, START_LEVEL_ID, 'playing'));
}

/** Avanca para outra fase e dispara a fala de abertura dela. */
export function loadLevel(state: GameState, levelId: LevelId): GameState {
  return triggerOnStart(loadLevelInto(state, levelId, 'playing'));
}
