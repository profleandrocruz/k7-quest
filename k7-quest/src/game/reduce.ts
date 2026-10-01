/**
 * src/game/reduce.ts — REDUTOR RAIZ: (estado, acao) => estado.
 *
 * Propriedades garantidas (todas testadas sem React, sem canvas e sem navegador):
 *   - PURO: nao le relogio, nao le teclado, nao usa Math.random.
 *   - DETERMINISTICO: mesmo estado + mesmas acoes + mesmo seed => mesmo resultado.
 *   - SERIALIZAVEL: `state.log` e o replay completo da partida.
 *
 * Por que isso importa para o DESIGN (e nao so para o codigo):
 * e o que permite ao epilogo reexibir as acoes REAIS do jogador (Lentes #10, #64, #97).
 */
import { nextLevelId } from './content/levels';
import { MAX_LOG_ENTRIES } from './constants';
import { loadLevel, startGame } from './initialState';
import { regenEnergy, grantAbility, switchTape, unlockTape } from './rules/tapes';
import { switchEra } from './rules/eras';
import { useAbility, tickAbilityTimers } from './rules/abilities';
import { stepEchoes, beginRecording, stopRecording, activateEcho, sampleRecording } from './rules/echoes';
import { stepEnemies } from './rules/enemies';
import { stepInteractions, completeObjectives } from './rules/progress';
import { stepMotion } from './rules/motion';
import { advanceDialogue } from './rules/dialogue';
import type { GameAction } from './actions';
import type { GameEvent, GameState, MotionInput } from './types';

/**
 * `dispatch` = `reduce` + REGISTRO da acao.
 *
 * Separacao deliberada: `reduce` continua sendo uma funcao pura de transicao, e o
 * registro (que e observabilidade, nao regra) vive fora dele. Assim um teste pode
 * chamar `reduce` diretamente para checar uma regra isolada.
 */
export function dispatch(state: GameState, action: GameAction): GameState {
  const next = reduce(state, action);
  const log = [...state.log, action];
  return { ...next, log: log.length > MAX_LOG_ENTRIES ? log.slice(-MAX_LOG_ENTRIES) : log };
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ---------------- Ciclo de vida ----------------
    case 'BOOT_DONE':
    case 'OPEN_TITLE':
      return { ...state, phase: 'title' };

    case 'START_GAME':
      return startGame(state, action.avatar, action.seed);

    case 'UNLOCK_TAPE':
      return unlockTape(state, action.tape, action.abilities);

    case 'COMPLETE_LEVEL':
      return completeLevel(state);

    case 'ENTER_ENDING':
      return { ...state, phase: 'ending' };

    // ---------------- Intencao do jogador (consumida pelo TICK) ----------------
    case 'MOVE':
      return setInput(state, { dir: action.direction });

    case 'JUMP':
      // A BORDA e derivada aqui, no dominio: soltar e pressionar de novo
      // produz um novo pulo de forma previsivel (Lente #56).
      return setInput(state, {
        jumpHeld: action.pressed,
        jumpPressed: action.pressed && !state.input.jumpHeld,
      });

    case 'DASH':
      return setInput(state, { dashPressed: true });

    // ---------------- Simulacao ----------------
    case 'TICK':
      return tick(state, action.deltaMs, action.input);

    // ---------------- O diferencial do jogo ----------------
    case 'SWITCH_ERA':
      return switchEra(state, action.era);

    case 'SWITCH_TAPE':
      return switchTape(state, action.tape);

    case 'USE_ABILITY':
      return useAbility(state, action.ability);

    // ---------------- Ecos ----------------
    case 'RECORD_ECHO':
      return beginRecording(state);

    case 'STOP_RECORDING':
      return stopRecording(state);

    case 'ACTIVATE_ECHO':
      return activateEcho(state, action.echoId);

    // ---------------- Telas (Lente #60: modos explicitos) ----------------
    case 'OPEN_TAPE_SELECT':
      return state.phase === 'playing' ? { ...state, phase: 'tapeSelect' } : state;

    case 'OPEN_ERA_SELECT':
      return state.phase === 'playing' ? { ...state, phase: 'eraSelect' } : state;

    case 'CLOSE_MENU':
      return state.phase === 'tapeSelect' || state.phase === 'eraSelect'
        ? { ...state, phase: 'playing' }
        : state;

    case 'PAUSE':
      if (state.phase === 'paused') return state;
      return { ...state, phaseBeforePause: state.phase, phase: 'paused' };

    case 'RESUME':
      return { ...state, phase: state.phaseBeforePause ?? 'playing', phaseBeforePause: null };

    case 'ADVANCE_DIALOGUE':
      return advanceDialogue(state);

    case 'RESPAWN':
      return respawn(state);

    case 'SET_RENDER_MODE':
      return { ...state, renderMode: action.mode };

    case 'SET_DEBUG':
      return { ...state, debug: { ...state.debug, ...action.flags } };
  }
}

function setInput(state: GameState, patch: Partial<MotionInput>): GameState {
  return { ...state, input: { ...state.input, ...patch } };
}

/**
 * UM PASSO DA SIMULACAO.
 *
 * `events` e zerado no inicio de cada passo: ele descreve "o que acabou de
 * acontecer", e a UI consome isso para juice (Lente #58). Um log que cresce
 * para sempre tambem cresceria a memoria sem limite.
 */
function tick(state: GameState, deltaMs: number, override?: MotionInput): GameState {
  // O mundo nao evolui em menus: pausar precisa PAUSAR de verdade.
  if (state.phase !== 'playing') return state;

  const layer = state.level.eras[state.player.era];
  if (!layer) return state;

  const input: MotionInput = override ?? state.input;

  // ---- 1. Movimento do jogador (o "brinquedo") ----
  const motion = stepMotion(state.player, deltaMs, input, layer.collision);
  const motionEvents: GameEvent[] = motion.events.map((kind) => ({
    kind,
    tick: state.tick,
    at: motion.player.position,
  }));

  let next: GameState = {
    ...state,
    tick: state.tick + 1,
    player: regenEnergy(motion.player, deltaMs),
    // As BORDAS duram um unico passo; direcao e botao segurado persistem.
    input: { ...input, jumpPressed: false, dashPressed: false },
    events: motionEvents,
  };

  // ---- 2. Ecos repetem o que ja foi ----
  next = stepEchoes(next, deltaMs);

  // ---- 3. Inimigos (parados se o mundo estiver congelado) ----
  next = stepEnemies(next, deltaMs);

  // ---- 4. Temporizadores de habilidade (congelamento do mundo) ----
  next = tickAbilityTimers(next, deltaMs);

  // ---- 5. Interacoes: perigo, coleta, checkpoint, objetivo ----
  next = stepInteractions(next);

  // ---- 6. Gravacao de eco: amostra o input REALMENTE usado neste passo ----
  if (next.recording) {
    next = sampleRecording(next, { dir: input.dir, jump: input.jumpHeld });
  }

  // ---- 7. Invencibilidade decai por tempo real, nao por passos ----
  if (next.player.invulnerableMs > 0) {
    next = {
      ...next,
      player: {
        ...next.player,
        invulnerableMs: Math.max(0, next.player.invulnerableMs - deltaMs),
      },
    };
  }

  // ---- 8. Caiu fora do mapa: dano e retorno, NUNCA morte instantanea (Lente #41) ----
  const worldBottom = (layer.collision.height + 4) * layer.collision.tileSize;
  if (next.player.position.y > worldBottom) {
    next = {
      ...next,
      events: [
        ...next.events,
        { kind: 'damaged', tick: next.tick, message: 'queda', at: next.player.position },
      ],
    };
    next = respawn(next, 1);
  }

  // ---- 9. Morte: o jogo PARA de simular e diz o que aconteceu ----
  if (next.player.health <= 0) {
    return {
      ...next,
      phase: 'gameOver',
      events: [...next.events, { kind: 'died', tick: next.tick, at: next.player.position }],
    };
  }

  // ---- 10. Objetivo concluido: aplica recompensas e segue para a proxima fase ----
  if (next.events.some((event) => event.kind === 'levelComplete')) {
    return completeLevel(completeObjectives(next));
  }

  // O log de acoes e limitado em `dispatch` (ver topo deste arquivo).
  return next;
}

/**
 * Concluir a fase aplica as RECOMPENSAS e carrega a proxima.
 *
 * Decisao de design (Lente #40 — Recompensas): a recompensa e dada no instante da
 * conclusao, nao depois de o jogador navegar por um menu. O efeito precisa ser
 * sentido enquanto a memoria da fase ainda esta fresca.
 */
function completeLevel(state: GameState): GameState {
  const rewards = state.level.rewards;
  const defeated = state.level.objectives.some((o) => o.kind === 'defeatBoss');
  let next = state;

  if (defeated) {
    next = {
      ...next,
      progress: {
        ...next.progress,
        defeatedBosses: [...new Set([...next.progress.defeatedBosses, next.level.id])],
      },
    };
  }

  if (rewards?.tape) {
    next = unlockTape(next, rewards.tape, rewards.abilities ?? []);
  } else if (rewards?.abilities) {
    for (const ability of rewards.abilities) next = grantAbility(next, ability);
  }

  if (rewards?.unlockEra) {
    const era = rewards.unlockEra;
    next = {
      ...next,
      progress: {
        ...next.progress,
        unlockedEras: [...new Set([...next.progress.unlockedEras, era])],
      },
    };
  }

  const upcoming = nextLevelId(next.level.id);
  if (!upcoming) return { ...next, phase: 'ending' };

  // Avanca com a fase atual "resolvida" registrada no progresso persistente.
  return loadLevel({ ...next, progress: next.progress }, upcoming);
}

/**
 * Retorna ao checkpoint ativo. Nunca reinicia a fase inteira (Lente #41):
 * o progresso de coletaveis permanece, e o dano e opcional.
 */
function respawn(state: GameState, damage = 0): GameState {
  const checkpoint = state.level.checkpoints.find((c) => c.id === state.level.activeCheckpointId);
  const layer = state.level.eras[state.player.era];
  const fallback = layer
    ? { x: layer.collision.tileSize * 2, y: layer.collision.tileSize * 2 }
    : state.player.position;

  return {
    ...state,
    phase: 'playing',
    player: {
      ...state.player,
      position: checkpoint ? { ...checkpoint.at } : fallback,
      velocity: { x: 0, y: 0 },
      health: Math.max(1, state.player.health - damage),
      invulnerableMs: 1000,
      motion: {
        ...state.player.motion,
        isDashing: false,
        dashMs: 0,
        boostMs: 0,
        attackMs: 0,
        jumpBufferMs: 0,
      },
    },
    input: { dir: 0, jumpHeld: false, jumpPressed: false, dashPressed: false },
    events: [...state.events, { kind: 'respawned', tick: state.tick }],
  };
}
