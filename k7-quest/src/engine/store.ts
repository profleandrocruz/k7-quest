/**
 * src/engine/store.ts — A PONTE ENTRE O DOMINIO E O REACT (Lentes #18, #60, #92).
 *
 * DIVISAO DE RESPONSABILIDADE (a decisao mais importante desta camada):
 *
 *   [estado vivo]            [React]
 *   GameState mutavel   --->  snapshot do HUD a 10 Hz
 *   `game` (modulo)          `useHudStore`
 *
 * Por que nao colocar o `GameState` inteiro dentro do Zustand: o doc de arquitetura e
 * explicito — "o React NAO recebe 60 setState por segundo". Um reducer a 60 Hz dentro do
 * Zustand faria o HUD reconciliar 60 vezes por segundo para redesenhar a mesma barra de
 * vida. Isso e jank, e jank destroi o Fluxo (Lente #18) e a sensacao de controle (#53).
 *
 * A cena Phaser NAO passa pelo React: ela le `getGameState()` direto (modelo de PULL).
 * O canvas renderiza a 60+ fps; o HUD, a 10 Hz. Cada um na sua frequencia.
 *
 * Nada aqui decide REGRA: toda mudanca de estado passa por `dispatch` do dominio.
 */
import { create } from 'zustand';
import { HUD_PUBLISH_EVERY_STEPS } from '../game';
import { createInitialState, dispatch, hudModel, isSimulating } from '../game';
import type { AvatarId, GameAction, GameState, HudModel } from '../game';

// ---------------------------------------------------------------------------
// Estado vivo da simulacao (fora do ciclo de render do React)
// ---------------------------------------------------------------------------

let game: GameState = createInitialState();
let lastPublishedTick = -1;

/** Avatar escolhido na tela de titulo. O dominio so o conhece ao comecar a partida. */
let selectedAvatar: AvatarId = 'solaris';

/** Seed opcional vindo de `?seed=` (replay e depuracao — Lente #29). */
let runSeed: number | undefined;

/** Leitura direta, sem React: e assim que o canvas desenha (Lente #92). */
export function getGameState(): GameState {
  return game;
}

export function getSelectedAvatar(): AvatarId {
  return selectedAvatar;
}

export function setSelectedAvatar(avatar: AvatarId): void {
  selectedAvatar = avatar;
  publish({ force: true });
}

/** `?seed=1234` na URL: mesma partida, mesmo mundo. */
export function setRunSeed(seed: number | undefined): void {
  runSeed = seed;
}

export function getRunSeed(): number | undefined {
  return runSeed;
}

// ---------------------------------------------------------------------------
// Snapshot para o React (throttle por PASSOS, nao por timer)
// ---------------------------------------------------------------------------

interface HudStoreState {
  hud: HudModel;
  /** A simulacao esta rodando? O loop de jogo depende disto (Lente #60). */
  running: boolean;
  avatar: AvatarId;
}

/**
 * O snapshot inicial e publicado de imediato: a UI nunca ve um estado vazio.
 * Throttle por PASSOS (e nao por `setInterval`) porque e deterministico: 6 passos sao
 * 100 ms de JOGO, nao 100 ms de relogio — pausar pausa tambem o HUD.
 */
export const useHudStore = create<HudStoreState>()(() => ({
  hud: hudModel(game),
  running: isSimulating(game),
  avatar: selectedAvatar,
}));

function publish(options: { force?: boolean } = {}): void {
  if (!options.force && game.tick - lastPublishedTick < HUD_PUBLISH_EVERY_STEPS) return;
  lastPublishedTick = game.tick;
  useHudStore.setState({
    hud: hudModel(game),
    running: isSimulating(game),
    avatar: selectedAvatar,
  });
}

// ---------------------------------------------------------------------------
// Comandos: a UI e o input despacham por aqui
// ---------------------------------------------------------------------------

/**
 * Acao DISCRETA (trocar de era, avancar dialogo, pausar).
 *
 * Publica o HUD NA HORA, sem esperar o throttle: acao do jogador exige resposta
 * imediata (Lente #57). Esperar 100 ms para a era mudar na tela seria lerro perceptivel.
 */
export function send(action: GameAction): GameState {
  game = dispatch(game, action);
  publish({ force: true });
  return game;
}

/**
 * Um passo da SIMULACAO. So o loop de jogo chama isto.
 * O HUD e atualizado conforme o throttle — a simulacao nunca espera pela interface.
 */
export function stepGame(deltaMs: number): void {
  game = dispatch(game, { type: 'TICK', deltaMs });
  publish();
}

/** Comeca uma partida nova. Usado pelo menu de titulo. */
export function startRun(avatar: AvatarId, seed?: number): GameState {
  return send({ type: 'START_GAME', avatar, seed: seed ?? runSeed });
}

/** Reinicia tudo (depuracao e `?reset=1`). Nao apaga nada do jogador: o jogo nao salva aqui. */
export function resetGame(): void {
  game = createInitialState();
  lastPublishedTick = -1;
  publish({ force: true });
}

/** Forca uma publicacao (usado ao montar a UI: garante um snapshot fresco). */
export function refreshHud(): void {
  publish({ force: true });
}
