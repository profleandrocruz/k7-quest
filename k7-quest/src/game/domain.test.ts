/**
 * src/game/domain.test.ts — A REDE DE SEGURANCA DO DOMINIO.
 *
 * O que estes testes protegem (Lentes #29, #30, #41, #90):
 *   - Uma fase IMPOSSIVEL nao passa do CI. E a categoria de bug mais cara do projeto.
 *   - O mundo nao anda quando o jogo esta em menu (o classico "pause que nao pausa").
 *   - Uma acao produz SEMPRE o mesmo resultado a partir do mesmo estado (replay real).
 *   - A justica das eras: trocar de era nunca move nem prende o jogador.
 *   - O objetivo de fragmentos conta a FASE, nunca o acumulado da partida.
 *
 * Tudo roda headless: sem React, sem canvas, sem navegador.
 */
import { describe, expect, it } from 'vitest';
import { dispatch, reduce } from './reduce';
import { createInitialState, loadLevel, startGame } from './initialState';
import { BALANCE } from './gameBalance';
import { SIM_STEP_MS } from './constants';
import { CAMPAIGN_ORDER, LEVELS, getLevel, nextLevelId, START_LEVEL_ID } from './content/levels';
import { at, empty, putAll, row, tilemap } from './content/levels/authoring';
import { formatIssues, validateAllLevels, validateLevel } from './content/levels/validate';
import { ECHO_ABILITY } from './rules/echoes';
import { canSwitchEra } from './rules/eras';
import { canUseAbility, grantAbility, switchTape, unlockTape } from './rules/tapes';
import { objectiveProgress, stepInteractions } from './rules/progress';
import { ENEMY_KINDS, isEnemy } from './rules/tilemap';
import { ABILITIES } from './content/abilities';
import {
  activeCheckpoint,
  canRecordNow,
  collectionSummary,
  currentObjective,
  dialogueLine,
  eraChips,
  fragmentTally,
  hostileKinds,
  hudModel,
  isSimulating,
  levelDigest,
  objectiveViews,
  statusMessage,
  tapeChips,
} from './selectors';
import type { GameAction } from './actions';
import type { AvatarId, GameState, LevelDefinition, MotionInput } from './types';

const STEP = SIM_STEP_MS;

/** Entrada neutra: "o jogador parado, sem tocar em nada". */
const IDLE: MotionInput = { dir: 0, jumpHeld: false, jumpPressed: false, dashPressed: false };

/** Fecha qualquer dialogo aberto (Lente #39: toda fala e pulavel). */
function closeDialogue(state: GameState): GameState {
  let out = state;
  let guard = 0;
  while (out.phase === 'dialogue' && guard < 200) {
    out = reduce(out, { type: 'ADVANCE_DIALOGUE' });
    guard += 1;
  }
  return out;
}

/** Comeca uma partida ja jogavel (sem o dialogo de abertura na tela). */
function play(avatar: AvatarId = 'solaris', seed = 1234): GameState {
  return closeDialogue(startGame(createInitialState(seed), avatar, seed));
}

/** Avanca N passos de simulacao com entrada CONSTANTE. */
function ticks(state: GameState, count: number, input: MotionInput = IDLE): GameState {
  let out = state;
  for (let i = 0; i < count; i += 1) {
    out = dispatch(out, { type: 'TICK', deltaMs: STEP, input });
  }
  return out;
}

/** Coloca o jogador em um ponto exato do mundo (atalho de TESTE, nunca de jogo). */
function placePlayer(state: GameState, x: number, y: number): GameState {
  return { ...state, player: { ...state.player, position: { x, y }, velocity: { x: 0, y: 0 } } };
}

function entityOfKind(state: GameState, kind: string) {
  const entity = state.level.eras[state.player.era]?.entities.find((e) => e.kind === kind);
  if (!entity) throw new Error(`entidade "${kind}" nao existe na era ${state.player.era}`);
  return entity;
}

// ---------------------------------------------------------------------------
// 1. As fases do vertical slice sao JOGAVEIS (Lente #30)
// ---------------------------------------------------------------------------

describe('fases do Mundo 1', () => {
  it('nenhuma fase tem problema de alcancabilidade ou de justica', () => {
    const issues = validateAllLevels(LEVELS);
    // A mensagem carrega o diagnostico completo: falhar aqui precisa ser acionavel.
    expect(formatIssues(issues)).toBe('OK: nenhuma divergencia encontrada.');
    expect(issues).toEqual([]);
  });

  it('a campanha comeca na primeira fase e termina depois do chefe', () => {
    expect(START_LEVEL_ID).toBe(CAMPAIGN_ORDER[0]);
    expect(CAMPAIGN_ORDER).toHaveLength(4);
    expect(nextLevelId('w1-l1-parque')).toBe('w1-l2-castelo');
    expect(nextLevelId('w1-boss-menino-eterno')).toBeNull();
  });

  it('o validador REPROVA uma fase impossivel (o teste do teste)', () => {
    // Sem esta prova, o teste acima poderia passar apenas porque o validador nao checa nada.
    const sealed = putAll(empty(20), [[10, '#']]);
    const broken: LevelDefinition = {
      id: 'teste-fase-impossivel',
      world: 1,
      name: 'Fase Impossivel',
      startEra: '8bit',
      unlockedEras: ['8bit'],
      tilemaps: {
        '8bit': tilemap(20, [
          sealed,
          sealed,
          sealed,
          sealed,
          putAll(sealed, [[18, 'G']]),
          row(20, [['#', 20]]),
        ]),
      },
      spawns: [{ kind: 'checkpoint', at: at(2, 4) }],
      objectives: [{ id: 'impossivel.goal', kind: 'reachGoal', description: 'Nunca da' }],
      musicRef: 'teste',
      designNote: 'Fase de teste: uma parede sela o objetivo.',
    };

    const issues = validateLevel(broken);
    expect(issues.length).toBeGreaterThan(0);
    expect(formatIssues(issues)).toContain('INALCANCAVEL');
  });

  it('o validador cobra a era de inimigos em fases com duas eras (Lente #21)', () => {
    const bosque = getLevel('w1-l3-bosque');
    const semEra: LevelDefinition = {
      ...bosque,
      id: 'teste-bosque-sem-era',
      spawns: bosque.spawns.map((spawn) =>
        spawn.kind === 'memoryBug' ? { ...spawn, era: undefined } : spawn,
      ),
    };

    expect(formatIssues(validateLevel(semEra))).toContain('sem era');
  });
});

// ---------------------------------------------------------------------------
// 2. Boot e inicio de partida
// ---------------------------------------------------------------------------

describe('estado inicial', () => {
  it('o boot nao e jogavel e nao tem dialogo', () => {
    const boot = createInitialState(1);
    expect(boot.phase).toBe('boot');
    expect(boot.dialogue).toBeNull();
    expect(isSimulating(boot)).toBe(false);
    // O mundo ja esta montado, mas parado: o TICK de boot nao avanca nada.
    expect(dispatch(boot, { type: 'TICK', deltaMs: STEP }).tick).toBe(boot.tick);
  });

  it('a partida comeca com UMA fita e ZERO habilidades (Lente #42)', () => {
    const state = play();
    expect(state.phase).toBe('playing');
    expect(state.player.unlockedTapes).toEqual(['rock']);
    expect(state.player.unlockedAbilities).toEqual([]);
    // Sem habilidade aprendida, nada responde: a progressao e 100% conquistada.
    expect(canUseAbility(state, 'rock.impacto-sonoro').ok).toBe(false);
  });

  it('o jogador nasce no checkpoint da fase, com a vida cheia', () => {
    const state = play();
    const checkpoint = activeCheckpoint(state);
    expect(checkpoint).toEqual(entityOfKind(state, 'checkpoint').position);
    expect(state.player.position).toEqual(checkpoint);
    expect(state.player.health).toBe(BALANCE.player.maxHealth);
  });

  it('a fala de abertura aparece ANTES do controle, e e pulavel (Lente #39)', () => {
    const started = startGame(createInitialState(7), 'luna', 7);
    expect(started.phase).toBe('dialogue');
    expect(dialogueLine(started)?.speaker).toBeTruthy();
    expect(started.level.dialogueSource.every((trigger) => trigger.skippable)).toBe(true);
    expect(closeDialogue(started).phase).toBe('playing');
  });
});

// ---------------------------------------------------------------------------
// 3. Identidade das entidades entre camadas de era
// ---------------------------------------------------------------------------

describe('entidades e camadas de era', () => {
  it('um spawn sem era tem a MESMA identidade em todas as camadas', () => {
    const state = closeDialogue(loadLevel(play(), 'w1-l3-bosque'));
    const idsIn = (era: string) =>
      (state.level.eras[era]?.entities ?? [])
        .filter((entity) => entity.kind === 'checkpoint')
        .map((entity) => entity.id);

    expect(idsIn('16bit')).toEqual(idsIn('8bit'));
    expect(idsIn('8bit')).toHaveLength(2);
    // E a entidade e declarada como GLOBAL, nao como pertencente a uma era: e o que
    // impede o checkpoint de "renascer" so porque o jogador trocou de era.
    const checkpoint = (state.level.eras['8bit']?.entities ?? []).find(
      (entity) => entity.kind === 'checkpoint',
    );
    expect(checkpoint?.era).toBeNull();
    expect(checkpoint?.id).toContain(':global:');
  });

  it('um spawn com era existe apenas na camada daquela era', () => {
    const state = closeDialogue(loadLevel(play(), 'w1-l3-bosque'));
    const fragments = (era: string) =>
      (state.level.eras[era]?.entities ?? []).filter((e) => e.kind === 'pixelFragment').length;

    // 3 globais (10, 20, 52) + 1 exclusivo de cada era (33 em 8 bits, 37 em 16 bits).
    expect(fragments('8bit')).toBe(4);
    expect(fragments('16bit')).toBe(4);
    // O total da FASE continua sendo 5: identidade global nao duplica contagem.
    expect(fragmentTally(state)).toEqual({ collected: 0, total: 5 });
  });

  it('a lista de hostis do HUD e a mesma do dominio (nunca divergem)', () => {
    expect([...hostileKinds()].sort()).toEqual([...ENEMY_KINDS].sort());
  });
});

// ---------------------------------------------------------------------------
// 4. Movimento: o "brinquedo" precisa funcionar sozinho (Lente #15)
// ---------------------------------------------------------------------------

/** Teto do pulo: a MENOR altura (y) alcancada, mantendo (ou nao) o botao. */
function jumpApex(state: GameState, holdButton: boolean): number {
  let out = reduce(state, { type: 'JUMP', pressed: true });
  // O primeiro passo usa a INTENCAO do estado — exatamente como a engine fara.
  out = dispatch(out, { type: 'TICK', deltaMs: STEP });
  let apex = out.player.position.y;

  for (let i = 0; i < 20; i += 1) {
    out = dispatch(out, { type: 'TICK', deltaMs: STEP, input: { ...IDLE, jumpHeld: holdButton } });
    apex = Math.min(apex, out.player.position.y);
  }
  return apex;
}

describe('movimento', () => {
  it('a gravidade assenta o jogador no chao, e ele fica estavel la', () => {
    const state = play();
    expect(state.player.motion.isGrounded).toBe(false);

    const landed = ticks(state, 90);
    expect(landed.player.motion.isGrounded).toBe(true);
    expect(landed.player.position.y).toBeGreaterThan(state.player.position.y);

    // Uma vez no chao, nao afunda: o mapa e a verdade, nao o acumulador de forca.
    const still = ticks(landed, 30);
    expect(still.player.position.y).toBe(landed.player.position.y);
  });

  it('andar move o jogador na direcao pedida', () => {
    const landed = ticks(play(), 60);
    const right = ticks(landed, 30, { ...IDLE, dir: 1 });
    expect(right.player.position.x).toBeGreaterThan(landed.player.position.x);

    const left = ticks(right, 30, { ...IDLE, dir: -1 });
    expect(left.player.position.x).toBeLessThan(right.player.position.x);
  });

  it('soltar o botao cedo corta o pulo (Lente #24: uma tecla, decisoes expressivas)', () => {
    const grounded = ticks(play(), 60);
    const held = jumpApex(grounded, true);
    const tapped = jumpApex(grounded, false);

    // Menor y = mais alto. Segurar sobe mais; soltar corta.
    expect(held).toBeLessThan(tapped);
    expect(tapped).toBeLessThan(grounded.player.position.y);
  });

  it('o pulo emite evento proprio: a engine faz o juice a partir de DADOS (Lente #58)', () => {
    const grounded = ticks(play(), 60);
    const jumped = dispatch(reduce(grounded, { type: 'JUMP', pressed: true }), {
      type: 'TICK',
      deltaMs: STEP,
    });
    expect(jumped.events.map((event) => event.kind)).toContain('jumped');
    expect(jumped.player.velocity.y).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Determinismo: a base do replay e dos ecos (Lente #29)
// ---------------------------------------------------------------------------

describe('determinismo', () => {
  const script: GameAction[] = [
    { type: 'MOVE', direction: 1 },
    { type: 'TICK', deltaMs: STEP },
    { type: 'JUMP', pressed: true },
    { type: 'TICK', deltaMs: STEP },
    { type: 'TICK', deltaMs: STEP },
    { type: 'MOVE', direction: 0 },
    { type: 'JUMP', pressed: false },
    { type: 'TICK', deltaMs: STEP },
    { type: 'SWITCH_ERA', era: '16bit' },
    { type: 'TICK', deltaMs: STEP },
  ];

  const runScript = () => script.reduce((acc, action) => dispatch(acc, action), createInitialState(4242));

  it('o mesmo script produz exatamente o mesmo estado', () => {
    const first = runScript();
    const second = runScript();

    expect(second.tick).toBe(first.tick);
    expect(second.player.position).toEqual(first.player.position);
    expect(second.player.motion).toEqual(first.player.motion);
    expect(second.events).toEqual(first.events);
    expect(second.log).toEqual(first.log);
  });

  it('o redutor nao muta o estado anterior (a UI pode comparar referencias)', () => {
    const before = play();
    const snapshot = JSON.stringify(before);

    dispatch(before, { type: 'MOVE', direction: 1 });
    dispatch(before, { type: 'PAUSE' });
    dispatch(before, { type: 'TICK', deltaMs: STEP, input: IDLE });

    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('a semente do estado nunca muda durante a partida', () => {
    const state = play('solaris', 99);
    expect(ticks(state, 20).seed).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// 6. Telas e pausa: modo explicito, mundo parado (Lente #60)
// ---------------------------------------------------------------------------

describe('telas e pausa', () => {
  it('em menu a simulacao PARA de verdade (nada de "pause que nao pausa")', () => {
    const state = ticks(play(), 5);
    const paused = reduce(state, { type: 'PAUSE' });
    expect(paused.phase).toBe('paused');

    const frozen = dispatch(paused, { type: 'TICK', deltaMs: STEP });
    expect(frozen.tick).toBe(paused.tick);
    expect(frozen.player.position).toEqual(paused.player.position);
    expect(frozen.player.motion).toEqual(paused.player.motion);

    expect(reduce(frozen, { type: 'RESUME' }).phase).toBe('playing');
  });

  it('a pausa volta EXATAMENTE para a tela de onde saiu', () => {
    const menu = reduce(play(), { type: 'OPEN_TAPE_SELECT' });
    const back = reduce(reduce(menu, { type: 'PAUSE' }), { type: 'RESUME' });
    expect(back.phase).toBe('tapeSelect');
    expect(reduce(back, { type: 'CLOSE_MENU' }).phase).toBe('playing');
  });

  it('menus nao abrem por cima de si mesmos nem durante dialogo', () => {
    const dialogue = startGame(createInitialState(5), 'solaris', 5);
    expect(dialogue.phase).toBe('dialogue');
    expect(reduce(dialogue, { type: 'OPEN_ERA_SELECT' }).phase).toBe('dialogue');
  });
});

// ---------------------------------------------------------------------------
// 7. O diferencial do jogo: trocar de era (Lentes #4, #21, #30)
// ---------------------------------------------------------------------------

describe('troca de era', () => {
  it('W1-L1 tem uma era so: nao ha para onde trocar', () => {
    expect(canSwitchEra(play(), '16bit').ok).toBe(false);
  });

  it('trocar de era NAO move o jogador: muda a realidade, nao o corpo', () => {
    const bosque = closeDialogue(loadLevel(play(), 'w1-l3-bosque'));
    const before = { ...bosque.player.position };

    const next = reduce(bosque, { type: 'SWITCH_ERA', era: '16bit' });
    expect(next.player.era).toBe('16bit');
    expect(next.player.position).toEqual(before);
    expect(next.events.map((event) => event.kind)).toContain('eraSwitch');
  });

  it('trocar para uma era com o espaco ocupado e BLOQUEADO, com motivo legivel (Lente #30)', () => {
    let state = closeDialogue(loadLevel(play(), 'w1-l3-bosque'));
    state = reduce(state, { type: 'SWITCH_ERA', era: '16bit' });

    // A parede A (colunas 30-31) existe apenas em 8 bits: no mesmo ponto, a 16 bits e livre.
    const naParede = placePlayer(state, 30 * 16, 9 * 16 + 12);
    const check = canSwitchEra(naParede, '8bit');
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('Espaco ocupado nesta era');

    // A recusa NAO move nem muda o jogador — so gera feedback (nunca uma armadilha).
    const recusado = reduce(naParede, { type: 'SWITCH_ERA', era: '8bit' });
    expect(recusado.player.era).toBe('16bit');
    expect(recusado.player.position).toEqual(naParede.player.position);
    expect(recusado.events.map((event) => event.kind)).toContain('eraSwitchBlocked');
  });

  it('o DOMINIO decide o motor: trocar de era troca o modo de render (Lente #92)', () => {
    const base = play();
    const layer = base.level.eras['8bit'];
    if (!layer) throw new Error('W1-L1 sem camada de 8 bits');

    // As eras 3D existem de verdade (Mundos 4 e 5). Aqui ela e injetada para provar que a
    // regra vale sem depender de um caso particular do vertical slice.
    const com3d: GameState = {
      ...base,
      level: {
        ...base.level,
        eras: { ...base.level.eras, '3d': { ...layer, era: '3d', unlocked: true } },
      },
    };

    const next = reduce(com3d, { type: 'SWITCH_ERA', era: '3d' });
    expect(next.player.era).toBe('3d');
    expect(next.renderMode).toBe('era3d');
  });

  it('as eras do HUD seguem a ordem canonica e mostram o estado de cada uma', () => {
    const chips = eraChips(closeDialogue(loadLevel(play(), 'w1-l3-bosque')));
    expect(chips.map((chip) => chip.era)).toEqual(['8bit', '16bit']);
    expect(chips.every((chip) => chip.unlocked)).toBe(true);
    expect(chips.find((chip) => chip.active)?.era).toBe('8bit');
    // Cada era declara a REGRA que muda: e o que torna o tema mecanico (Lente #21).
    expect(chips.every((chip) => chip.rule.length > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Fitas e habilidades: a escolha de identidade (Lentes #32, #33)
// ---------------------------------------------------------------------------

describe('fitas e habilidades', () => {
  it('nao se usa o que nao se aprendeu — e falhar nao cobra energia', () => {
    const state = play();
    const after = reduce(state, { type: 'USE_ABILITY', ability: 'rock.impacto-sonoro' });

    expect(after.player.energy).toBe(state.player.energy);
    expect(after.events.map((event) => event.kind)).toContain('abilityBlocked');
  });

  it('a Fita Rock entrega o Impacto Sonoro, que custa energia e entra em recarga', () => {
    const state = unlockTape(play(), 'rock', ['rock.impacto-sonoro']);
    expect(canUseAbility(state, 'rock.impacto-sonoro').ok).toBe(true);

    const used = reduce(state, { type: 'USE_ABILITY', ability: 'rock.impacto-sonoro' });
    const cost = ABILITIES['rock.impacto-sonoro']?.cost ?? 0;
    expect(used.player.energy).toBe(BALANCE.player.energyMax - cost);
    expect(used.player.motion.cooldowns['rock.impacto-sonoro']).toBeGreaterThan(0);
    expect(used.events.map((event) => event.kind)).toContain('abilityUsed');

    // Sem energia, a mesma habilidade deixa de responder (nada de "as vezes funciona").
    const semEnergia = {
      ...used,
      player: { ...used.player, energy: 0, motion: { ...used.player.motion, cooldowns: {} } },
    };
    const check = canUseAbility(semEnergia, 'rock.impacto-sonoro');
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('Energia insuficiente');
  });

  it('a habilidade pertence a FITA: trocar de fita desliga a outra (Lente #32)', () => {
    const ambas = unlockTape(
      unlockTape(play(), 'rock', ['rock.impacto-sonoro']),
      'pop',
      ['pop.sprint'],
    );
    const naPop = switchTape(ambas, 'pop');
    expect(naPop.player.activeTape).toBe('pop');

    const check = canUseAbility(naPop, 'rock.impacto-sonoro');
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('Fita Rock');
    // E a habilidade da fita que esta tocando continua disponivel.
    expect(canUseAbility(naPop, 'pop.sprint').ok).toBe(true);
  });

  it('nao se troca para uma fita que ainda nao foi encontrada (Lente #32)', () => {
    const state = play();
    const recusado = switchTape(state, 'jazz');

    expect(recusado.player.activeTape).toBe('rock');
    expect(recusado.events.map((event) => event.kind)).toContain('tapeSwitchBlocked');
    expect(statusMessage(recusado)).toBe('Voce ainda nao encontrou esta fita');
  });
});

// ---------------------------------------------------------------------------
// 9. Ecos temporais: o tema virando jogabilidade (Lentes #8, #41, #42)
// ---------------------------------------------------------------------------

describe('ecos temporais', () => {
  it('sem o gravador nao existe gravacao — e o motivo e explicito, nao misterioso', () => {
    const state = play();
    expect(canRecordNow(state).ok).toBe(false);
    expect(canRecordNow(state).reason).toBe('Voce ainda nao tem o gravador');

    const blocked = reduce(state, { type: 'RECORD_ECHO' });
    expect(blocked.recording).toBeNull();
    expect(blocked.events.map((event) => event.kind)).toContain('abilityBlocked');
  });

  it('com o gravador, o eco guarda ACOES e nasce no mundo (Lente #29)', () => {
    let state = grantAbility(play(), ECHO_ABILITY);
    state = reduce(state, { type: 'RECORD_ECHO' });
    expect(state.recording).not.toBeNull();

    state = ticks(state, 40, { ...IDLE, dir: 1 });
    expect(state.recording?.frames.length).toBeGreaterThanOrEqual(2);

    state = reduce(state, { type: 'STOP_RECORDING' });
    expect(state.echoes).toHaveLength(1);
    expect(state.echoes[0]?.era).toBe('8bit');
    expect(state.echoes[0]?.recording.length).toBeGreaterThanOrEqual(2);
    // O epilogo reexibe as versoes REAIS do jogador: a gravacao fica no progresso.
    expect(state.progress.savedRecordings['8bit']?.length).toBeGreaterThanOrEqual(2);
    expect(state.events.map((event) => event.kind)).toContain('echoRecorded');
  });

  it('uma gravacao curta demais NAO vira eco: eco e acao deliberada (Lente #48)', () => {
    let state = grantAbility(play(), ECHO_ABILITY);
    state = reduce(state, { type: 'RECORD_ECHO' });
    state = reduce(state, { type: 'STOP_RECORDING' });

    expect(state.echoes).toHaveLength(0);
    expect(state.recording).toBeNull();
    expect(state.events.some((event) => event.message === 'Gravacao curta demais')).toBe(true);
  });

  it('um eco por era: o segundo pedido e recusado com motivo (Lente #42)', () => {
    let state = grantAbility(play(), ECHO_ABILITY);
    state = reduce(state, { type: 'RECORD_ECHO' });
    state = ticks(state, 40, { ...IDLE, dir: 1 });
    state = reduce(state, { type: 'STOP_RECORDING' });
    expect(state.echoes).toHaveLength(1);

    const check = canRecordNow(state);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('Esta era ja tem uma versao sua');
  });

  it('o eco ativado vira um corpo no mundo que repete as acoes gravadas', () => {
    let state = grantAbility(play(), ECHO_ABILITY);
    state = reduce(state, { type: 'RECORD_ECHO' });
    state = ticks(state, 40, { ...IDLE, dir: 1 });
    state = reduce(state, { type: 'STOP_RECORDING' });

    const id = state.echoes[0]?.id ?? '';
    state = reduce(state, { type: 'ACTIVATE_ECHO', echoId: id });
    expect(Object.keys(state.echoBodies)).toEqual([id]);
    expect(state.events.map((event) => event.kind)).toContain('echoActivated');

    const antes = state.echoBodies[id]?.player.position.x ?? 0;
    const depois = ticks(state, 30).echoBodies[id]?.player.position.x ?? 0;
    // Ele ANDA: o eco nao e um fantasma decorativo, e um corpo com as mesmas regras.
    expect(depois).not.toBe(antes);
  });
});

// ---------------------------------------------------------------------------
// 10. Objetivos e recompensas: progresso que significa algo (Lentes #40, #49)
// ---------------------------------------------------------------------------

describe('objetivos', () => {
  it('o objetivo de fragmentos mede a FASE, nunca o acumulado da partida', () => {
    const base = play();
    const com5NoBolso: GameState = {
      ...base,
      progress: { ...base.progress, fragments: 5 },
    };
    const fase2 = closeDialogue(loadLevel(com5NoBolso, 'w1-l2-castelo'));

    const view = objectiveViews(fase2).find((item) => item.id === 'w1l2.fragments');
    // 5 fragmentos no bolso, ZERO coletados nesta fase: o objetivo nao se completa sozinho.
    expect(view?.current).toBe(0);
    expect(view?.done).toBe(false);
    expect(view?.target).toBe(5);
  });

  it('coletar na fase faz o objetivo avancar na mesma medida', () => {
    const base = play();
    const fase2 = closeDialogue(
      loadLevel({ ...base, progress: { ...base.progress, fragments: 5 } }, 'w1-l2-castelo'),
    );
    const com8 = { ...fase2, progress: { ...fase2.progress, fragments: 8 } };
    const objective = com8.level.objectives.find((item) => item.id === 'w1l2.fragments');

    expect(objective).toBeDefined();
    expect(objectiveProgress(com8, objective as NonNullable<typeof objective>)).toBe(3);
  });

  it('coletar um fragmento conta na fase e na restauracao da regiao (Lente #49)', () => {
    const base = play();
    const fragment = entityOfKind(base, 'pixelFragment');

    // O fragmento flutua na altura da cabeca: o jogador da um pulinho para pegar.
    let state = ticks(placePlayer(base, fragment.position.x, 9 * 16 + 12), 3);
    state = reduce(state, { type: 'JUMP', pressed: true });
    state = dispatch(state, { type: 'TICK', deltaMs: STEP });

    for (let i = 0; i < 14 && state.progress.fragments === 0; i += 1) {
      state = dispatch(state, { type: 'TICK', deltaMs: STEP, input: { ...IDLE, jumpHeld: true } });
    }

    expect(state.progress.fragments).toBe(1);
    expect(fragmentTally(state).collected).toBe(1);
    expect(state.progress.regionRestoration['w1-l1-parque']).toBeCloseTo(1 / 25);
    expect(state.events.map((event) => event.kind)).toContain('fragmentCollected');
  });

  it('tocar o objetivo conclui a fase, entrega a recompensa e abre a proxima', () => {
    const state = play();
    const goal = entityOfKind(state, 'goal');
    const noObjetivo = placePlayer(state, goal.position.x, goal.position.y);

    // A regra vive em `stepInteractions`: um lugar so decide o que o contato significa.
    const touched = stepInteractions(noObjetivo);
    expect(touched.events.map((event) => event.kind)).toContain('levelComplete');

    // E o resultado observavel e a fase seguinte, com a recompensa ja no bolso.
    const after = dispatch(noObjetivo, { type: 'TICK', deltaMs: STEP });
    expect(after.level.id).toBe('w1-l2-castelo');
    expect(after.player.unlockedTapes).toContain('rock');
    expect(after.player.unlockedAbilities).toContain('rock.impacto-sonoro');
    expect(after.phase).toBe('dialogue');
  });
});

// ---------------------------------------------------------------------------
// 11. Seletores: a fachada que a UI consome (Lente #59)
// ---------------------------------------------------------------------------

describe('seletores do HUD', () => {
  it('o modelo do HUD descreve o estado sem a UI conhecer nenhuma regra', () => {
    const hud = hudModel(play());

    expect(hud.phase).toBe('playing');
    expect(hud.levelId).toBe('w1-l1-parque');
    expect(hud.health).toBe(hud.maxHealth);
    expect(hud.energy).toBe(hud.energyMax);
    expect(hud.objective?.id).toBe('w1l1.goal');
    expect(hud.eras.map((chip) => chip.era)).toEqual(['8bit']);
    expect(hud.tape?.tape).toBe('rock');
    expect(hud.echoes.canRecord).toBe(false);
    expect(hud.enemiesRemaining).toBe(0);
  });

  it('a primeira fase nao tem inimigos: a primeira impressao e convite (Lente #34)', () => {
    const inimigos = (play().level.eras['8bit']?.entities ?? []).filter((entity) =>
      isEnemy(entity.kind),
    );
    expect(inimigos).toHaveLength(0);
  });

  it('o HUD mostra UM objetivo por vez: o proximo pendente (Lente #67)', () => {
    const state = play();
    expect(objectiveViews(state)).toHaveLength(2);
    expect(currentObjective(state)?.done).toBe(false);
    expect(currentObjective(state)?.id).toBe('w1l1.goal');
  });

  it('a mensagem do HUD vem do evento mais recente: um canal, nunca dois', () => {
    const recusado = reduce(play(), { type: 'SWITCH_ERA', era: '16bit' });
    expect(statusMessage(recusado)).toBe('Esta era nao existe aqui');
  });

  it('as fitas exibem a propria limitacao: a escolha precisa ser informada (Lente #32)', () => {
    const chips = tapeChips(play());
    expect(chips).toHaveLength(4);
    expect(chips.every((chip) => chip.tradeoff.length > 0)).toBe(true);
    expect(chips.filter((chip) => chip.active)).toHaveLength(1);
    expect(chips.filter((chip) => chip.unlocked)).toHaveLength(1);
  });

  it('o resumo da fase e da partida saem do estado, nao de contadores paralelos', () => {
    const digest = levelDigest(play());
    expect(digest.objectivesTotal).toBe(2);
    expect(digest.rewardTape).toBe('rock');
    expect(digest.rewardAbilities).toContain('rock.impacto-sonoro');
    expect(digest.restoration).toBe(0);

    const summary = collectionSummary(play());
    expect(summary.tapes).toBe(1);
    expect(summary.abilities).toBe(0);
    expect(summary.bosses).toBe(0);
    expect(summary.unlockedEras).toBe(0);
  });
});
