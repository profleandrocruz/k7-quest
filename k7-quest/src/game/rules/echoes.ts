/**
 * src/game/rules/echoes.ts — ECOS TEMPORAIS (Lentes #8, #9, #65, #73).
 *
 * O conceito do GDD e "versoes alternativas de Janus auxiliam na resolucao de desafios".
 * Implementado como NPC aliado, isso seria decoracao. Implementado como
 * "voce literalmente grava uma versao de si mesmo", o tema vira JOGABILIDADE:
 * o jogador nao recebe ajuda, ele aprende a trabalhar com quem ja foi.
 *
 * Decisoes de engenharia (todas por motivo de design):
 *   - Eco guarda ACOES, nao posicoes -> mesma regra de movimento, zero desincronia (#29)
 *   - Um eco por era                  -> puzzles legiveis e memoria limitada (#42)
 *   - Eco nao interage com outra era  -> espaco e a regra do jogo (#21)
 *   - Eco NAO pune o jogador          -> ele apenas recomeca o ciclo (#41)
 *
 * LIMITACAO DOCUMENTADA: a reproducao cobre MOVIMENTO (direcao + pulo). A reproducao
 * de HABILIDADES fica para a proxima passada (docs/decisions/0004-escopo-dos-ecos.md).
 */
import { BALANCE } from '../gameBalance';
import type { Check } from './tapes';
import type { Echo, EchoBody, EchoFrame, GameEvent, GameState, PlayerState } from '../types';
import { stepMotion } from './motion';

/** Habilidade que torna a gravacao permanente. Antes dela, a ancora de eco ensina. */
export const ECHO_ABILITY = 'electronic.quantum-link';

/** Um eco por era: a restricao que mantem o puzzle legivel (Lente #42). */
export const MAX_ECHOES_PER_ERA = 1;

export function canRecord(state: GameState): Check {
  if (state.phase !== 'playing') return { ok: false, reason: 'Nao da para gravar agora' };
  if (state.recording) return { ok: false, reason: 'Ja esta gravando' };

  const hasRecorder =
    state.player.unlockedAbilities.includes(ECHO_ABILITY) || state.debug.freeTapeSwitch;
  if (!hasRecorder) return { ok: false, reason: 'Voce ainda nao tem o gravador' };

  const existing = state.echoes.filter((e) => e.era === state.player.era).length;
  if (existing >= MAX_ECHOES_PER_ERA) {
    return { ok: false, reason: 'Esta era ja tem uma versao sua' };
  }

  return { ok: true };
}

/** Gravar e uma ACAO do jogador, nao um modo secreto (Lente #24). */
export function beginRecording(state: GameState): GameState {
  const check = canRecord(state);
  if (!check.ok) {
    return {
      ...state,
      events: [
        ...state.events,
        {
          kind: 'abilityBlocked',
          tick: state.tick,
          message: check.reason,
          at: state.player.position,
        },
      ],
    };
  }
  return {
    ...state,
    recording: { startedAtTick: state.tick, frames: [] },
    events: [
      ...state.events,
      { kind: 'echoRecorded', tick: state.tick, message: 'gravando', at: state.player.position },
    ],
  };
}

/**
 * Amostra a gravacao. Chamado a cada TICK enquanto `state.recording` existir.
 * Amostrar (~4x/s) em vez de guardar todo tick economiza memoria sem perder
 * legibilidade do movimento — e o intervalo e irrelevante para o puzzle.
 */
export function sampleRecording(state: GameState, frame: Omit<EchoFrame, 'tick'>): GameState {
  const recording = state.recording;
  if (!recording) return state;

  const elapsedTicks = state.tick - recording.startedAtTick;
  if (elapsedTicks % BALANCE.echoes.sampleIntervalTicks !== 0) return state;

  const maxFrames = BALANCE.echoes.maxRecordingSeconds * 60;
  if (recording.frames.length >= maxFrames) return state;

  return {
    ...state,
    recording: { ...recording, frames: [...recording.frames, { tick: elapsedTicks, ...frame }] },
  };
}

/**
 * Encerra a gravacao e cria o eco.
 * Gravacao curta demais NAO vale como eco: o jogador precisa entender que um eco
 * e uma acao deliberada, nao um botao que "as vezes funciona" (Lente #48).
 */
export function stopRecording(state: GameState): GameState {
  const recording = state.recording;
  if (!recording) return state;

  if (recording.frames.length < 2) {
    return {
      ...state,
      recording: null,
      events: [
        ...state.events,
        {
          kind: 'abilityBlocked',
          tick: state.tick,
          message: 'Gravacao curta demais',
          at: state.player.position,
        },
      ],
    };
  }

  const echo: Echo = {
    id: `echo:${state.player.era}:${state.tick}`,
    era: state.player.era,
    tape: state.player.activeTape,
    recording: recording.frames,
    basePosition: { ...state.player.position },
  };

  return {
    ...state,
    recording: null,
    echoes: [...state.echoes, echo],
    // O epilogo mostra as versoes REAIS do jogador (Lentes #10, #64, #97).
    progress: {
      ...state.progress,
      savedRecordings: { ...state.progress.savedRecordings, [echo.era]: echo.recording },
    },
    events: [
      ...state.events,
      { kind: 'echoRecorded', tick: state.tick, message: echo.id, at: echo.basePosition },
    ],
  };
}

/** Frame da gravacao em um dado tick (ciclico). Lente #29: puro e deterministico. */
export function echoFrameAt(echo: Echo, tick: number): EchoFrame {
  const total = echo.recording.length;
  const index = Math.floor(tick / BALANCE.echoes.sampleIntervalTicks) % total;
  return echo.recording[index] as EchoFrame;
}

function echoBodyFromEcho(echo: Echo, template: PlayerState): EchoBody {
  return {
    echoId: echo.id,
    cursor: 0,
    cycleStartTick: 0,
    player: {
      ...template,
      era: echo.era,
      activeTape: echo.tape,
      position: { ...echo.basePosition },
      velocity: { x: 0, y: 0 },
      // O eco nao tem energia nem vida contavel: a falha dele NUNCA pode
      // punir o jogador (Lente #41).
      energy: 0,
      health: 0,
      invulnerableMs: 0,
      motion: { ...template.motion, isDashing: false, dashMs: 0, attackMs: 0, hoverMs: 0 },
    },
  };
}

/** Ativa um eco: ele passa a existir no mundo e a repetir a gravacao em ciclo. */
export function activateEcho(state: GameState, echoId: string): GameState {
  const echo = state.echoes.find((e) => e.id === echoId);
  if (!echo) return state;
  if (state.echoBodies[echoId]) return state;

  return {
    ...state,
    echoBodies: { ...state.echoBodies, [echoId]: echoBodyFromEcho(echo, state.player) },
    activeEchoId: echoId,
    events: [
      ...state.events,
      { kind: 'echoActivated', tick: state.tick, message: echo.id, at: echo.basePosition },
    ],
  };
}

/** Remove o corpo do eco do mundo. A gravacao permanece: o eco pode voltar. */
export function deactivateEcho(state: GameState, echoId: string): GameState {
  const bodies = { ...state.echoBodies };
  delete bodies[echoId];
  return {
    ...state,
    echoBodies: bodies,
    activeEchoId: state.activeEchoId === echoId ? null : state.activeEchoId,
  };
}

/** Ecos visiveis agora: apenas os da era ativa aparecem solidos (Lente #21). */
export function visibleEchoes(state: GameState): EchoBody[] {
  return Object.values(state.echoBodies).filter((b) => b.player.era === state.player.era);
}

/**
 * Passo dos ecos. Cada eco consome UM frame da propria gravacao por passo e roda
 * exatamente o MESMO `stepMotion` do jogador — a fisica nunca "desmente" o eco.
 *
 * Nota de escopo: ecos sao SIMULADOS sempre (para nao desincronizarem), mas so
 * interagem com o mundo quando a era ativa e a deles (Lente #21).
 */
export function stepEchoes(state: GameState, dtMs: number): GameState {
  const ids = Object.keys(state.echoBodies);
  if (ids.length === 0) return state;

  const bodies: Record<string, EchoBody> = {};
  const events: GameEvent[] = [];

  for (const id of ids) {
    const body = state.echoBodies[id];
    const echo = state.echoes.find((e) => e.id === id);
    if (!body || !echo) continue;

    const total = echo.recording.length;
    const grid = state.level.eras[echo.era]?.collision;
    if (total === 0 || !grid) {
      bodies[id] = body;
      continue;
    }

    const index = body.cursor % total;
    const frame = echo.recording[index] as EchoFrame;
    const previous = echo.recording[(index - 1 + total) % total] as EchoFrame;

    const result = stepMotion(
      body.player,
      dtMs,
      {
        dir: frame.dir,
        jumpHeld: frame.jump,
        // A borda e DERIVADA: mesma sequencia de frames => mesmo pulo, sempre.
        jumpPressed: frame.jump && !previous.jump,
        dashPressed: false,
      },
      grid,
    );

    const wrapped = index + 1 >= total;
    if (wrapped) {
      events.push({ kind: 'echoCycled', tick: state.tick, at: result.player.position });
    }

    bodies[id] = {
      ...body,
      player: result.player,
      cursor: wrapped ? 0 : index + 1,
      cycleStartTick: wrapped ? state.tick : body.cycleStartTick,
    };
  }

  return {
    ...state,
    echoBodies: bodies,
    events: events.length > 0 ? [...state.events, ...events] : state.events,
  };
}

