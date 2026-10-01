/**
 * src/game/rules/tapes.ts — A ESCOLHA DE IDENTIDADE (Lente #32).
 *
 * Regra central: uma habilidade so pode ser usada enquanto a SUA fita esta tocando.
 * E isso que transforma "quatro listas de poderes" em uma DECISAO de identidade:
 * o jogador nao acumula tudo, ele escolhe quem ser naquele trecho.
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secoes 6 e 15.
 */
import { BALANCE } from '../gameBalance';
import { ABILITIES, SIGNATURE_ABILITY } from '../content/abilities';
import { TAPES } from '../content/tapes';
import type { AbilityId, GameEvent, GameState, TapeId } from '../types';

export interface Check {
  ok: boolean;
  reason?: string;
}

export function canSwitchTape(state: GameState, tape: TapeId): Check {
  if (state.player.activeTape === tape) {
    return { ok: false, reason: 'Esta fita ja esta tocando' };
  }
  if (!state.player.unlockedTapes.includes(tape) && !state.debug.freeTapeSwitch) {
    return { ok: false, reason: 'Voce ainda nao encontrou esta fita' };
  }
  return { ok: true };
}

/**
 * Troca de fita. Instantanea e reversivel (como a troca de era).
 * Cancela o estado de habilidade em uso para impedir cancel-combo (Lente #30).
 */
export function switchTape(state: GameState, tape: TapeId): GameState {
  const check = canSwitchTape(state, tape);
  if (!check.ok) {
    const event: GameEvent = {
      kind: 'tapeSwitchBlocked',
      tick: state.tick,
      message: check.reason ?? 'Fita indisponivel',
      at: state.player.position,
    };
    return { ...state, events: [...state.events, event] };
  }

  return {
    ...state,
    player: {
      ...state.player,
      activeTape: tape,
      motion: {
        ...state.player.motion,
        attackMs: 0,
        hoverMs: 0,
        isDashing: false,
        dashMs: 0,
      },
    },
    events: [
      ...state.events,
      { kind: 'tapeSwitch', tick: state.tick, message: TAPES[tape].name, at: state.player.position },
    ],
  };
}

/**
 * Concede uma fita e, com ela, sua habilidade ASSINATURA.
 * Motivo (Lente #40 - Recompensas): o jogador precisa sentir a diferenca
 * IMEDIATAMENTE apos vencer o chefe, nao depois de abrir um menu.
 */
export function unlockTape(
  state: GameState,
  tape: TapeId,
  extraAbilities: readonly AbilityId[] = [],
): GameState {
  const signature = SIGNATURE_ABILITY[tape];
  const abilities = [signature, ...extraAbilities].filter((id) => ABILITIES[id] !== undefined);

  const unlockedTapes = state.player.unlockedTapes.includes(tape)
    ? state.player.unlockedTapes
    : [...state.player.unlockedTapes, tape];

  const unlockedAbilities = [...new Set([...state.player.unlockedAbilities, ...abilities])];

  return {
    ...state,
    player: { ...state.player, unlockedTapes, unlockedAbilities },
  };
}

/** Concede uma habilidade ao JOGADOR, sem tocar no resto do estado. */
export function grantAbilityToPlayer(
  player: GameState['player'],
  ability: AbilityId,
): GameState['player'] {
  if (ABILITIES[ability] === undefined) return player;
  if (player.unlockedAbilities.includes(ability)) return player;
  return { ...player, unlockedAbilities: [...player.unlockedAbilities, ability] };
}

/** Concede uma habilidade avulsa (tier 2..5 ou a ancora de eco). */
export function grantAbility(state: GameState, ability: AbilityId): GameState {
  const player = grantAbilityToPlayer(state.player, ability);
  return player === state.player ? state : { ...state, player };
}

export function canUseAbility(state: GameState, abilityId: AbilityId): Check {
  const ability = ABILITIES[abilityId];
  if (!ability) return { ok: false, reason: 'Habilidade desconhecida' };

  if (!state.player.unlockedAbilities.includes(abilityId)) {
    return { ok: false, reason: 'Voce ainda nao aprendeu esta habilidade' };
  }

  // A regra que da sentido a tudo: a habilidade pertence a fita que esta tocando.
  if (ability.tape !== state.player.activeTape) {
    return { ok: false, reason: `Essa habilidade e da ${TAPES[ability.tape].name}` };
  }

  if ((state.player.motion.cooldowns[abilityId] ?? 0) > 0) {
    return { ok: false, reason: 'Recarregando' };
  }

  if (state.player.energy < ability.cost) {
    return { ok: false, reason: 'Energia insuficiente' };
  }

  return { ok: true };
}

/** Consome energia e inicia o cooldown. Retorna o jogador atualizado. */
export function payAbilityCost(
  player: GameState['player'],
  abilityId: AbilityId,
): GameState['player'] {
  const ability = ABILITIES[abilityId];
  if (!ability) return player;
  return {
    ...player,
    energy: Math.max(0, player.energy - ability.cost),
    motion: {
      ...player.motion,
      cooldowns: { ...player.motion.cooldowns, [abilityId]: ability.cooldownMs },
    },
  };
}

/** Regeneracao de energia por tempo (Lente #47: recurso simples de comunicar). */
export function regenEnergy(player: GameState['player'], dtMs: number): GameState['player'] {
  const max = BALANCE.player.energyMax;
  if (player.energy >= max) return player;
  return {
    ...player,
    energy: Math.min(max, player.energy + (BALANCE.player.energyRegenPerSec * dtMs) / 1000),
  };
}

/** A habilidade assinatura da fita ativa, se houver. Usada pelo HUD (Lente #59). */
export function activeSignature(state: GameState): string | undefined {
  return SIGNATURE_ABILITY[state.player.activeTape];
}
