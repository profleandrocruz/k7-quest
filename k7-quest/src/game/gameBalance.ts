/**
 * src/game/gameBalance.ts
 *
 * UNICO lugar com numeros ajustaveis do K7 Quest (Lente #47 - o balanceador).
 *
 * Regras de uso:
 *   1. Todo numero entra no jogo por REFERENCIA (`BALANCE.player.jumpVelocity`), nunca copiado.
 *   2. Nenhum valor de "game feel" e escolhido por calculo: so por sensacao, com playtest.
 *   3. Cada mudanca significativa vai para `docs/playtests.md` com data + motivo.
 *
 * Ver GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md, secao 9.
 */

export const BALANCE = {
  /** Passo fixo da simulacao. Independente do refresh da maquina (Lente #18). */
  fixedStepMs: 1000 / 60,

  player: {
    /** Lente #41: 3 coracoes e generoso o bastante para nao punir a exploracao. */
    maxHealth: 3,
    moveSpeed: 180, // unidades por SEGUNDO
    acceleration: 900, // px/s^2 — so por sensacao
    friction: 1400,
    jumpVelocity: -420,
    /** Corte do pulo ao soltar o botao: mesma tecla, decisoes expressivas (Lente #24). */
    jumpCutMultiplier: 0.45,
    maxFallSpeed: 760,
    gravity: 1500,
    /** Lente #53: tolerancia apos sair da plataforma — o jogador sente controle. */
    coyoteMs: 100,
    /** Lente #56: a interface "entende" a intencao do jogador. */
    jumpBufferMs: 120,
    invulnerableAfterHitMs: 1200,
    knockback: { x: 190, y: -210 },
    energyMax: 100,
    energyRegenPerSec: 12,
    dash: { speed: 420, durationMs: 150, cooldownMs: 520 },
    /** Squash & stretch: uma acao, varias recompensas (Lente #58). */
    landSquashMs: 120,
    width: 14,
    height: 20,
  },

  /** Lentes #7/#9/#21: cada era altera a REGRA, nao apenas o pixel. */
  eras: {
    '8bit': { gravityScale: 1.0, moveSpeedScale: 1.0, paletteTint: '#5b8c5a' },
    /** Adolescencia: rapido e escorregadio. */
    '16bit': { gravityScale: 1.15, moveSpeedScale: 1.25, paletteTint: '#c0392b' },
    /** Produtividade: pressao, pouco espaco para erro. */
    '32bit': { gravityScale: 1.0, moveSpeedScale: 0.95, paletteTint: '#2c3e50' },
    /** Familia: cuidado, peso, movimento deliberado. */
    '3d': { gravityScale: 0.9, moveSpeedScale: 0.9, paletteTint: '#8e44ad' },
    /** Terceira idade: leveza, tempo mais generoso. */
    quantum: { gravityScale: 0.7, moveSpeedScale: 1.05, paletteTint: '#16a085' },
  },

  /**
   * Lentes #32/#33: cada fita altera o ESTILO de jogo (o `feel`), nao so um numero.
   * Toda fita tem um CUSTO claro alem do beneficio.
   */
  tapes: {
    /** Pesado e firme: muito controle no ar, pouca velocidade. */
    rock: { moveSpeedScale: 0.9, accelerationScale: 0.85, airControlScale: 1.25, frictionScale: 1.2 },
    /** Rapido e escorregadio: alcance, pouca precisao. */
    pop: { moveSpeedScale: 1.2, accelerationScale: 1.3, airControlScale: 0.8, frictionScale: 0.7 },
    /** Fluido e imprevisivel: o tempo e negociavel. */
    jazz: { moveSpeedScale: 1.0, accelerationScale: 1.1, airControlScale: 1.1, frictionScale: 0.9 },
    /** Preciso e adaptavel. */
    electronic: { moveSpeedScale: 1.05, accelerationScale: 1.0, airControlScale: 1.0, frictionScale: 1.0 },
  },

  eraSwitch: {
    /** Lente #57: a troca precisa parecer instantanea. Este e o tempo MAXIMO de feedback. */
    feedbackMs: 80,
    /** Evita spam que transformaria puzzles em exploit (Lente #30). */
    cooldownMs: 120,
  },

  echoes: {
    /** ~4 amostras/segundo: economiza memoria sem perder legibilidade. */
    sampleIntervalTicks: 15,
    /** Lente #41: o eco NAO pune o jogador — ele pausa e reinicia o ciclo. */
    pauseOnEraMismatch: true,
    maxRecordingSeconds: 20,
    /** Se a gravacao ficar curta demais, ela nao vale como eco (Lente #48). */
    minRecordingTicks: 15,
  },

  rewards: {
    /** Lente #49: cada fragmento deve mover a restauracao VISIVEL da regiao. */
    fragmentsPerRestorationStep: 25,
    /** Lente #40: recompensas precisam de impacto imediato e compreensivel. */
    pickupFeedbackMs: 300,
  },

  /** Lentes #44/#46: inimigos sao obstaculos interessantes, nao sacos de pancada. */
  enemies: {
    damageContact: 1,
    /** Espinhos nunca matam instantaneamente: tirar 1 de vida ensina (Lente #34). */
    spikeDamage: 1,
    /** "Bug de Memoria" do GDD: remove plataformas temporariamente. */
    memoryBugDisableMs: 2200,
  },

  /** Lente #29: pesos visiveis = valor esperado visivel. */
  floppyDropChance: { enemy: 0.04, miniboss: 1.0, boss: 1.0 },

  /** Lente #61: a curva de interesse da luta final. */
  boss: {
    /** Entre formas: respiro, dialogo curto e RESTAURO DE VIDA (Lente #41). */
    restoreHealthBetweenForms: true,
    interludeMs: 2600,
  },
} as const;

export type Balance = typeof BALANCE;
