/**
 * src/game/selectors.ts — O DOMINIO RESPONDE, A UI PERGUNTA.
 *
 * Regra de arquitetura (GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 2):
 * nenhum componente React importa `rules/*`. Ele importa SELECTORS. Assim a UI nao
 * decide REGRA — ela so escolhe como desenhar o que o dominio ja decidiu.
 *
 * Consequencia pratica: "posso trocar de era agora?" tem UMA resposta no projeto
 * inteiro, e o botao, o HUD e o som consultam a mesma fonte (Lente #59 — 3 canais,
 * 1 verdade).
 *
 * As funcoes aqui sao PURAS e sem cache: memoizacao e responsabilidade da camada de
 * UI (Zustand + comparacao rasa), nao do dominio (Lente #18).
 */
import { ABILITIES } from './content/abilities';
import { ERAS } from './content/eras';
import { TAPES } from './content/tapes';
import { BALANCE } from './gameBalance';
import { ERA_SHORTCUTS, TAPE_SHORTCUTS } from './constants';
import { ERA_ORDER, TAPE_ORDER } from './types';
import { canSwitchEra } from './rules/eras';
import { canSwitchTape, canUseAbility } from './rules/tapes';
import { canRecord, MAX_ECHOES_PER_ERA } from './rules/echoes';
import { objectiveProgress, objectiveTarget } from './rules/progress';
import { currentLine } from './rules/dialogue';
import type {
  AbilityId,
  DialogueLine,
  EntityKind,
  EraId,
  GameEvent,
  GameState,
  Objective,
  RenderMode,
  TapeId,
  Vec2,
} from './types';

// ---------------------------------------------------------------------------
// Objetivos (Lente #67: UM objetivo claro por vez na tela)
// ---------------------------------------------------------------------------

export interface ObjectiveView {
  id: string;
  kind: Objective['kind'];
  description: string;
  done: boolean;
  current: number;
  target: number;
}

export function objectiveViews(state: GameState): ObjectiveView[] {
  return state.level.objectives.map((objective) => {
    const current = objectiveProgress(state, objective);
    const target = objectiveTarget(objective);
    return {
      id: objective.id,
      kind: objective.kind,
      description: objective.description,
      done: current >= target,
      current,
      target,
    };
  });
}

/**
 * O objetivo que o HUD mostra. Um por vez, de proposito: uma lista de tarefas
 * transforma exploracao em checklist (Lente #42 — Simplicidade).
 */
export function currentObjective(state: GameState): ObjectiveView | undefined {
  const views = objectiveViews(state);
  return views.find((view) => !view.done) ?? views[0];
}

// ---------------------------------------------------------------------------
// Coletaveis
// ---------------------------------------------------------------------------

export interface FragmentTally {
  collected: number;
  total: number;
}

/**
 * Fragmentos da FASE (nao do jogo inteiro).
 *
 * Detalhe que importa: um coletavel sem era existe em TODAS as camadas com o MESMO id
 * (ver `buildEntities`), entao deduplicar por id e obrigatorio — sem isso uma fase de
 * duas eras contaria cada fragmento duas vezes.
 */
export function fragmentTally(state: GameState): FragmentTally {
  const seen = new Map<string, boolean>();

  for (const layer of Object.values(state.level.eras)) {
    for (const entity of layer.entities) {
      if (entity.kind !== 'pixelFragment') continue;
      const already = seen.get(entity.id) ?? false;
      seen.set(entity.id, already || entity.collected === true);
    }
  }

  let collected = 0;
  for (const value of seen.values()) if (value) collected += 1;
  return { collected, total: seen.size };
}

/** Quantos coletaveis existem por tipo raro (o jogador so entende depois de achar). */
export function rareTally(state: GameState): Record<'floppy' | 'cartridge' | 'lostMemory', number> {
  const out = { floppy: 0, cartridge: 0, lostMemory: 0 };
  const counted = new Set<string>();

  for (const layer of Object.values(state.level.eras)) {
    for (const entity of layer.entities) {
      if (entity.kind === 'floppy' || entity.kind === 'cartridge' || entity.kind === 'lostMemory') {
        if (counted.has(entity.id)) continue;
        counted.add(entity.id);
        out[entity.kind] += 1;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Era e fita: os dois canais de decisao do jogador
// ---------------------------------------------------------------------------

export interface EraChip {
  era: EraId;
  name: string;
  tagline: string;
  /** A REGRA que esta era muda (Lente #21: o tema precisa ser mecanico). */
  rule: string;
  palette: string;
  renderMode: RenderMode;
  /** Tecla sugerida (1..5), derivada da ordem canonica. */
  shortcut: string;
  unlocked: boolean;
  active: boolean;
  /** Motivo legivel quando a troca esta bloqueada AGORA (o HUD explica, nao misterio). */
  blockedReason?: string;
}

export function eraChips(state: GameState): EraChip[] {
  return ERA_ORDER.filter((era) => state.level.eras[era] !== undefined).map((era) => {
    const layer = state.level.eras[era];
    const display = ERAS[era];
    const check = canSwitchEra(state, era);
    return {
      era,
      name: display.name,
      tagline: display.tagline,
      rule: display.rule,
      palette: display.palette.accent,
      renderMode: display.renderMode,
      shortcut: ERA_SHORTCUTS[ERA_ORDER.indexOf(era)] ?? '',
      unlocked: layer?.unlocked ?? false,
      active: era === state.player.era,
      blockedReason: check.ok ? undefined : check.reason,
    };
  });
}

export interface TapeChip {
  tape: TapeId;
  name: string;
  playstyle: string;
  /** A limitacao honesta. Exibir isto e o que torna a escolha informada (Lente #32). */
  tradeoff: string;
  signatureName: string;
  color: string;
  shortcut: string;
  unlocked: boolean;
  active: boolean;
}

export function tapeChips(state: GameState): TapeChip[] {
  return TAPE_ORDER.map((tape) => {
    const display = TAPES[tape];
    const signature = ABILITIES[display.signature];
    return {
      tape,
      name: display.name,
      playstyle: display.playstyle,
      tradeoff: display.tradeoff,
      signatureName: signature?.name ?? display.signature,
      color: display.color,
      shortcut: TAPE_SHORTCUTS[TAPE_ORDER.indexOf(tape)] ?? '',
      unlocked: state.player.unlockedTapes.includes(tape),
      active: tape === state.player.activeTape,
    };
  });
}

export interface AbilityChip {
  id: AbilityId;
  name: string;
  cost: number;
  tier: number;
  unlocked: boolean;
  /** Pronta para uso AGORA (fita certa, energia suficiente, sem cooldown). */
  ready: boolean;
  blockedReason?: string;
  cooldownMs: number;
}

/** Habilidades da FITA ATIVA — o conteudo da tela de selecao (Lente #60). */
export function abilityChips(state: GameState): AbilityChip[] {
  return Object.entries(ABILITIES)
    .filter(([, ability]) => ability.tape === state.player.activeTape)
    .sort(([, a], [, b]) => a.tier - b.tier)
    .map(([id, ability]) => {
      const check = canUseAbility(state, id);
      return {
        id,
        name: ability.name,
        cost: ability.cost,
        tier: ability.tier,
        unlocked: state.player.unlockedAbilities.includes(id),
        ready: check.ok,
        blockedReason: check.ok ? undefined : check.reason,
        cooldownMs: state.player.motion.cooldowns[id] ?? 0,
      };
    });
}

// ---------------------------------------------------------------------------
// Ecos
// ---------------------------------------------------------------------------

export interface EchoStatus {
  canRecord: boolean;
  blockedReason?: string;
  recording: boolean;
  /** Amostras ja gravadas na gravacao em andamento. */
  frames: number;
  /** Corpos de eco vivos no mundo AGORA. */
  active: number;
  /** Ecos gravados nesta era (limite `MAX_ECHOES_PER_ERA`). */
  savedHere: number;
  limit: number;
}

export function echoStatus(state: GameState): EchoStatus {
  const check = canRecord(state);
  return {
    canRecord: check.ok,
    blockedReason: check.ok ? undefined : check.reason,
    recording: state.recording !== null,
    frames: state.recording?.frames.length ?? 0,
    active: Object.keys(state.echoBodies).length,
    savedHere: state.echoes.filter((echo) => echo.era === state.player.era).length,
    limit: MAX_ECHOES_PER_ERA,
  };
}

/** Posicao de renascimento efetiva do jogador (Lente #41: nunca uma incognita). */
export function activeCheckpoint(state: GameState): Vec2 | undefined {
  return state.level.checkpoints.find((c) => c.id === state.level.activeCheckpointId)?.at;
}

// ---------------------------------------------------------------------------
// Feedback: UMA linha, UM canal
// ---------------------------------------------------------------------------

/**
 * A mensagem do HUD (Lente #59).
 *
 * Nunca devolve duas: quando a interface fala em dois lugares ao mesmo tempo, o jogador
 * para de ler os dois. A prioridade e o evento mais recente que tem algo a dizer.
 */
export function statusMessage(state: GameState): string | undefined {
  for (let i = state.events.length - 1; i >= 0; i -= 1) {
    const event = state.events[i] as GameEvent | undefined;
    if (event?.message) return event.message;
  }
  return undefined;
}

export function lastEventOfKind(state: GameState, kind: GameEvent['kind']): GameEvent | undefined {
  for (let i = state.events.length - 1; i >= 0; i -= 1) {
    const event = state.events[i] as GameEvent | undefined;
    if (event?.kind === kind) return event;
  }
  return undefined;
}

export function dialogueLine(state: GameState): DialogueLine | undefined {
  // Delegado a regra: a UI nunca reimplementa nem a leitura mais trivial.
  return currentLine(state);
}

// ---------------------------------------------------------------------------
// Fachada de regras: a UI pergunta, nunca reimplementa
// ---------------------------------------------------------------------------

export function canSwitchEraTo(state: GameState, era: EraId) {
  return canSwitchEra(state, era);
}

export function canSwitchTapeTo(state: GameState, tape: TapeId) {
  return canSwitchTape(state, tape);
}

export function canPlayAbility(state: GameState, ability: AbilityId) {
  return canUseAbility(state, ability);
}

export function canRecordNow(state: GameState) {
  return canRecord(state);
}

/** A simulacao esta rodando? O loop de jogo usa isto para decidir avancar (Lente #60). */
export function isSimulating(state: GameState): boolean {
  return state.phase === 'playing';
}

/** A UI pode enviar comandos de JOGO? Menus capturam a intencao, nao o mundo. */
export function acceptsGameInput(state: GameState): boolean {
  return state.phase === 'playing';
}

/** Inimigos vivos na era ativa. O HUD nao precisa conhecer a lista de tipos. */
export function liveEnemies(state: GameState): number {
  const layer = state.level.eras[state.player.era];
  if (!layer) return 0;
  return layer.entities.filter(
    (entity) => !entity.collected && HOSTILE_KINDS.has(entity.kind) && (entity.health ?? 0) > 0,
  ).length;
}

/**
 * Tipos que causam dano por contato.
 *
 * Duplicado de propósito em relacao a `rules/tilemap.ENEMY_KINDS`? Nao: `ENEMY_KINDS` e
 * a fonte. Esta lista existe apenas para o HUD contar SEM depender de `rules`, mantendo
 * a fronteira da arquitetura — e um teste garante que as duas listas nunca divirjam.
 */
const HOSTILE_KINDS: ReadonlySet<EntityKind> = new Set<EntityKind>([
  'pixelSlime',
  'cloudHopper',
  'toyKnight',
  'memoryBug',
  'punkPixel',
  'speakerDrone',
  'corruptAmp',
  'cassetteCrawler',
  'workerBot',
  'dataSpider',
  'securityProgram',
  'packetGhost',
  'careDrone',
  'memoryBird',
  'linkBeast',
  'guardianRoot',
  'quantumShade',
  'archiveWisp',
  'echoSentinel',
  'neuralPhantom',
]);

export function hostileKinds(): ReadonlySet<EntityKind> {
  return HOSTILE_KINDS;
}

// ---------------------------------------------------------------------------
// Modelo agregado do HUD
// ---------------------------------------------------------------------------

export interface HudModel {
  phase: GameState['phase'];
  levelId: string;
  levelName: string;
  world: number;
  avatar: string;
  health: number;
  maxHealth: number;
  energy: number;
  energyMax: number;
  fragments: FragmentTally;
  objective: ObjectiveView | undefined;
  eras: EraChip[];
  tape: TapeChip | undefined;
  echoes: EchoStatus;
  enemiesRemaining: number;
  status: string | undefined;
}

/**
 * Tudo o que o HUD precisa, em UMA passada.
 *
 * Por que agregado em vez de dez seletores soltos: o HUD re-renderiza a cada mudanca de
 * estado, e seletores independentes causariam comparacoes redundantes e o risco classico
 * de "parte da tela atualizou antes da outra" (Lente #57 — feedback coerente).
 */
export function hudModel(state: GameState): HudModel {
  return {
    phase: state.phase,
    levelId: state.level.id,
    levelName: state.level.name,
    world: state.level.world,
    avatar: state.avatar,
    health: state.player.health,
    maxHealth: state.player.maxHealth,
    energy: Math.round(state.player.energy),
    energyMax: BALANCE.player.energyMax,
    fragments: fragmentTally(state),
    objective: currentObjective(state),
    eras: eraChips(state),
    tape: tapeChips(state).find((chip) => chip.active),
    echoes: echoStatus(state),
    enemiesRemaining: liveEnemies(state),
    status: statusMessage(state),
  };
}

// ---------------------------------------------------------------------------
// Digestao da fase (tela de conclusao / epilogo)
// ---------------------------------------------------------------------------

export interface LevelDigest {
  levelId: string;
  objectivesDone: number;
  objectivesTotal: number;
  fragments: FragmentTally;
  rare: Record<'floppy' | 'cartridge' | 'lostMemory', number>;
  /** Restauracao visivel da regiao: 0..1 (Lente #49). */
  restoration: number;
  /** Recompensas que a fase ENTREGA — o texto da conclusao sai daqui (Lente #40). */
  rewardTape?: TapeId;
  rewardAbilities: AbilityId[];
  rewardEra?: EraId;
}

export function levelDigest(state: GameState): LevelDigest {
  const views = objectiveViews(state);
  const rewards = state.level.rewards;
  return {
    levelId: state.level.id,
    objectivesDone: views.filter((view) => view.done).length,
    objectivesTotal: views.length,
    fragments: fragmentTally(state),
    rare: rareTally(state),
    restoration: state.progress.regionRestoration[state.level.id] ?? 0,
    rewardTape: rewards?.tape,
    rewardAbilities: rewards?.abilities ?? [],
    rewardEra: rewards?.unlockEra,
  };
}

/** A vida do jogador em numeros: e o que o epilogo mostra de volta (Lente #97). */
export function collectionSummary(state: GameState) {
  return {
    fragments: state.progress.fragments,
    floppies: state.progress.floppies.length,
    cartridges: state.progress.cartridges.length,
    memories: state.progress.lostMemories.length,
    tapes: state.player.unlockedTapes.length,
    abilities: state.player.unlockedAbilities.length,
    bosses: state.progress.defeatedBosses.length,
    unlockedEras: state.progress.unlockedEras.length,
  };
}

