/**
 * src/game/rules/eras.ts — O SISTEMA DE ERAS: o diferencial do jogo (Lente #21).
 *
 * Regras de troca (cada uma existe por um motivo de design, nao por conveniencia):
 *   - Instantanea (< 100 ms de feedback)        -> o jogador sente poder, nao espera (#53, #57)
 *   - NAO move o jogador de posicao             -> a identidade muda, o lugar nao (#9)
 *   - Bloqueio por colisao e LEGIVEL, nao letal -> nunca punir com morte (#30)
 *   - Era bloqueada aparece como fantasma       -> o jogador ve o que ainda nao conquistou (#4)
 *   - Cada era muda uma REGRA fisica            -> o tema precisa ser mecanico (#7, #9)
 *   - Trocar de era cancela dash/habilidade     -> evita exploit por cancelamento (#30)
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 4.
 */
import type { EraId, GameState, GameEvent } from '../types';
import { ERAS } from '../content/eras';
import { boxOf, gridCollides } from './geometry';

export interface EraSwitchCheck {
  ok: boolean;
  /** Motivo legivel para o jogador. Nunca um codigo de erro tecnico (Lente #56). */
  reason?: string;
}

export function canSwitchEra(state: GameState, era: EraId): EraSwitchCheck {
  if (state.player.era === era) {
    return { ok: false, reason: 'Esta era ja esta ativa' };
  }

  const target = state.level.eras[era];

  // Lente #4: uma era bloqueada nao e um bug, e uma promessa.
  if (!target) return { ok: false, reason: 'Esta era nao existe aqui' };
  if (!target.unlocked) return { ok: false, reason: 'Ainda nao conectada' };

  // Lente #30: bloqueio por colisao e legivel e reversivel.
  if (gridCollides(target.collision, boxOf(state.player))) {
    return { ok: false, reason: 'Espaco ocupado nesta era' };
  }

  return { ok: true };
}

/** Eras visiveis no HUD: as existentes no nivel, com o estado de desbloqueio. */
export function visibleEras(state: GameState): Array<{ era: EraId; unlocked: boolean; active: boolean }> {
  return Object.values(state.level.eras).map((layer) => ({
    era: layer.era,
    unlocked: layer.unlocked,
    active: layer.era === state.player.era,
  }));
}

/**
 * Troca de era. NUNCA lanca excecao: uma troca invalida apenas produz um evento
 * de feedback (Lente #57 - feedback imediato, sem quebrar o Fluxo).
 */
export function switchEra(state: GameState, era: EraId): GameState {
  const check = canSwitchEra(state, era);

  if (!check.ok) {
    const event: GameEvent = {
      kind: 'eraSwitchBlocked',
      tick: state.tick,
      message: check.reason ?? 'Troca indisponivel',
      at: state.player.position,
    };
    return { ...state, events: [...state.events, event] };
  }

  const target = state.level.eras[era];
  if (!target) return state;

  return {
    ...state,
    // O MOTOR de render e consequencia da era, nao uma escolha da UI (Lente #92):
    // quem decide se o quadro e Phaser, Three ou Matter e o dominio.
    renderMode: ERAS[era].renderMode,
    player: {
      ...state.player,
      era,
      // Cancelar estados transitorios evita "dash na era errada" (Lente #30).
      motion: {
        ...state.player.motion,
        isDashing: false,
        dashMs: 0,
        dashCooldownMs: Math.max(state.player.motion.dashCooldownMs, 0),
        hoverMs: 0,
        attackMs: 0,
        jumpBufferMs: 0,
        jumpCutMs: 0,
      },
    },
    events: [
      ...state.events,
      { kind: 'eraSwitch', tick: state.tick, message: era, at: state.player.position },
    ],
  };
}

/** Desbloqueia uma era (chamado quando a narrativa conecta as geracoes). */
export function unlockEra(state: GameState, era: EraId): GameState {
  const layer = state.level.eras[era];
  if (!layer || layer.unlocked) return state;

  return {
    ...state,
    level: {
      ...state.level,
      eras: { ...state.level.eras, [era]: { ...layer, unlocked: true } },
    },
  };
}
