/**
 * src/engine/phaser/PlatformerScene.ts — O CANVAS DESENHA, O DOMINIO DECIDE (Lente #92).
 *
 * Contrato desta cena (curto de proposito):
 *   1. Ela NAO simula nada. Nao integra fisica, nao move ninguem, nao decide colisao.
 *   2. Ela LE `getGameState()` a cada quadro (modelo de PULL) e desenha o que existe.
 *   3. Ela NAO desenha HUD. HUD e DOM: acessivel por padrao e legivel por leitor de tela
 *      (Lente #48). No canvas fica so o mundo.
 *
 * Por que PULL e nao eventos: o canvas roda a 60+ fps e o dominio a 60 passos/s, mas as
 * duas frequencias NAO precisam coincidir. Ler o estado atual a cada quadro e a forma
 * mais simples (e menos bugavel) de manter as duas independentes.
 *
 * SEM ARTE AINDA: o vertical slice desenha retangulos usando a paleta de cada era. Isso
 * provar o que precisa ser provado — que a era muda o ESPACO — sem fingir um polimento
 * que ainda nao existe (Lente #90: honestidade de escopo).
 */
import Phaser from 'phaser';
import { BALANCE, ERAS, TILE_SIZE, hostileKinds } from '../../game';
import type { CollisionGrid, Entity, EraId, EraLayer, GameState } from '../../game';
import { prefersReducedMotion } from '../reducedMotion';
import { getGameState } from '../store';

/** Profundidades de desenho: nunca dependem da ordem de criacao. */
const DEPTH = { grid: 0, entities: 10, echo: 15, player: 20 } as const;

/** Altura visivel alvo, em tiles. Define o zoom: o jogador precisa LER o que vem adiante. */
const VISIBLE_TILES_Y = 15;

/**
 * Cores de PERIGO e RECOMPENSA sao as mesmas em todas as eras (Lente #59).
 * A era muda o cenario; ela nao pode mudar o SIGNIFICADO das coisas.
 */
const COLOR = {
  danger: 0xe74c3c,
  reward: 0xf2e14c,
  rare: 0xf6b93b,
  memory: 0x9b59b6,
  checkpoint: 0x2ecc71,
  goal: 0xffffff,
  player: 0xf7f9ff,
  playerOutline: 0x101418,
  echo: 0x00d8d6,
} as const;

function toHex(css: string, fallback = 0x555555): number {
  const parsed = Number.parseInt(css.replace('#', ''), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * A cor de uma entidade, com uma regra so: PERIGO e RECOMPENSA nao mudam de era.
 *
 * O `accent` entra so para o que nao tem significado proprio (portais, blocos,
 * estrutura). E a unica coisa que a paleta da era consegue mudar.
 */
function entityColor(entity: Entity, accent: number): number {
  if (hostileKinds().has(entity.kind)) return COLOR.danger;

  switch (entity.kind) {
    case 'pixelFragment':
      return COLOR.reward;
    case 'floppy':
      return COLOR.rare;
    case 'lostMemory':
      return COLOR.memory;
    case 'checkpoint':
      return COLOR.checkpoint;
    case 'goal':
      return COLOR.goal;
    case 'cartridge':
    case 'echoAnchor':
    case 'bossGate':
    default:
      return accent;
  }
}

export class PlatformerScene extends Phaser.Scene {
  private gridLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private echoLayer!: Phaser.GameObjects.Graphics;
  private playerBox!: Phaser.GameObjects.Rectangle;
  /**
   * Quadradinho que marca para ONDE o jogador olha.
   *
   * `Rectangle` do Phaser nao tem espelhamento, e um corpo retangular e simetrico nao
   * comunica direcao nenhuma — sem isto, andar para a esquerda e para a direita e
   * visualmente a MESMA coisa (Lente #53). Um ponto na borda da frente resolve.
   */
  private facingMark!: Phaser.GameObjects.Rectangle;

  // Chaves de cache: so redesenhamos o que MUDOU. O tilemap e estatico por era, e
  // redesenhar ~900 tiles por quadro seria desperdicio puro.
  private drawnLevelId: string | null = null;
  private drawnEra: EraId | null = null;
  private drawnGrid: CollisionGrid | null = null;

  private reducedMotion = false;

  constructor() {
    super({ key: 'platformer' });
  }

  create(): void {
    this.gridLayer = this.add.graphics().setDepth(DEPTH.grid);
    this.entityLayer = this.add.graphics().setDepth(DEPTH.entities);
    this.echoLayer = this.add.graphics().setDepth(DEPTH.echo);

    this.playerBox = this.add
      .rectangle(0, 0, BALANCE.player.width, BALANCE.player.height, COLOR.player)
      .setOrigin(0, 0)
      .setDepth(DEPTH.player)
      .setStrokeStyle(1, COLOR.playerOutline);

    this.facingMark = this.add
      .rectangle(0, 0, 3, 3, COLOR.playerOutline)
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.player);

    this.reducedMotion = prefersReducedMotion();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.applyZoom());

    const cameras = this.cameras.main;
    cameras.setRoundPixels(true);
    this.applyZoom();
  }

  override update(): void {
    const state = getGameState();
    const layer = state.level.eras[state.player.era];
    if (!layer) return;

    this.syncWorld(state, layer);
    this.drawEntities(state, layer);
    this.drawEchoes(state);
    this.drawPlayer(state);
  }
  private applyZoom(): void {
    const target = VISIBLE_TILES_Y * TILE_SIZE;
    // Zoom INTEIRO: pixel art em escala fracionaria fica borrada (Lente #58).
    const zoom = Phaser.Math.Clamp(Math.floor(this.scale.height / target), 2, 6);
    this.cameras.main.setZoom(zoom);
  }

  // -------------------------------------------------------------------------
  // Atores: redesenhados a cada quadro, porque sao a unica parte do canvas que
  // se move. Tudo entra num unico `clear()` por camada — tres `clear()` por
  // quadro, nunca um por objeto.
  // -------------------------------------------------------------------------

  /**
   * COR DE PERIGO E RECOMPENSA e a MESMA em todas as eras (Lente #59).
   *
   * Por que: a era muda o CENARIO, nunca o SIGNIFICADO. Se um fragmento fosse
   * amarelo na 8bit e vermelho na 32bit, o jogador teria que reaprender o jogo
   * cinco vezes para nao errar o que importa.
   */
  private drawEntities(state: GameState, layer: EraLayer): void {
    const g = this.entityLayer;
    g.clear();

    const accent = toHex(ERAS[layer.era].palette.accent);

    for (const entity of layer.entities) {
      // Coletado sumiu de vez: redesenhar apagado seria mentir sobre o mundo.
      if (entity.collected === true) continue;
      // `era === null` significa "existe em todas"; as de outra era nao aparecem.
      if (entity.era !== null && entity.era !== layer.era) continue;

      const { x, y } = entity.position;
      const { x: w, y: h } = entity.size;
      const hostile = hostileKinds().has(entity.kind);

      g.fillStyle(entityColor(entity, accent), 1);
      g.fillRect(x, y, w, h);

      // Inimigo sempre contornado: o contorno e o que diz "isto me machuca" sem
      // precisar de texto nem de som (Lente #57).
      if (hostile || state.debug.showHitboxes) {
        g.lineStyle(1, COLOR.playerOutline);
        g.strokeRect(x, y, w, h);
      }
    }
  }

  /** Ecos ativos: a MESMA vida, so que vista de lado (Lentes #8, #58). */
  private drawEchoes(state: GameState): void {
    const g = this.echoLayer;
    g.clear();

    for (const body of Object.values(state.echoBodies)) {
      const { x, y } = body.player.position;
      // Meia opacidade: o eco e MEMORIA do jogador, nao o jogador. A diferenca
      // precisa caber num unico quadro, antes de qualquer rotulo.
      g.fillStyle(COLOR.echo, 0.45);
      g.fillRect(x, y, body.player.size.x, body.player.size.y);
    }
  }

  private drawPlayer(state: GameState): void {
    const player = state.player;
    const box = this.playerBox;

    // A caixa E o alvo do `startFollow`: e por isso que ela e movida aqui, e nao
    // em `syncWorld`. Camera e desenho nesta ordem para o follow nunca mirar um
    // jogador com uma posicao de quadro atrasada.
    box.setPosition(player.position.x, player.position.y);
    box.setSize(player.size.x, player.size.y);

    // O marcador fica na BORDA da frente do corpo: e o que diz "para onde".
    const centerX = player.position.x + player.size.x / 2;
    const centerY = player.position.y + player.size.y / 2;
    const toward = player.facing === 'left' ? -1 : 1;
    this.facingMark.setPosition(centerX + toward * (player.size.x / 2 - 2), centerY);

    // Piscar ao levar dano: prova de que o golpe CONTOU. Desligado com movimento
    // reduzido — piscar e exatamente o tipo de movimento que incomoda (Lente #48).
    const damaged = player.invulnerableMs > 0;
    const flicker = damaged && !this.reducedMotion && Math.floor(this.time.now / 70) % 2 === 0;
    box.setAlpha(flicker ? 0.35 : 1);
    this.facingMark.setAlpha(flicker ? 0.35 : 1);
  }

  // -------------------------------------------------------------------------
  // Mundo: paleta, tilemap e camera (redesenhados so quando algo muda)
  // -------------------------------------------------------------------------

  private syncWorld(state: GameState, layer: EraLayer): void {
    const changed =
      this.drawnLevelId !== state.level.id ||
      this.drawnEra !== state.player.era ||
      this.drawnGrid !== layer.collision;

    if (changed) {
      this.drawnLevelId = state.level.id;
      this.drawnEra = state.player.era;
      this.drawnGrid = layer.collision;

      this.cameras.main.setBackgroundColor(ERAS[state.player.era].palette.bg);
      this.drawGrid(layer);
      this.fitCamera(layer);
    }

    // A camera segue o jogador: suavizada (game feel) ou direta (reduced motion —
    // panning suave e exatamente o que incomoda quem tem sensibilidade a movimento).
    const follow = this.reducedMotion ? 1 : 0.22;
    this.cameras.main.startFollow(this.playerBox, true, follow, follow);
    this.cameras.main.setFollowOffset(-BALANCE.player.width / 2, -BALANCE.player.height / 2);
  }

  private fitCamera(layer: EraLayer): void {
    const { width, height, tileSize } = layer.collision;
    this.cameras.main.setBounds(0, 0, width * tileSize, height * tileSize);
  }

  /**
   * Desenha o tilemap. O mapa em TEXTO e a verdade (Lente #90): o que o validador
   * aprova e exatamente o que aparece aqui.
   */
  private drawGrid(layer: EraLayer): void {
    const palette = ERAS[layer.era].palette;
    const { rows, tileSize } = layer.collision;
    const g = this.gridLayer;
    g.clear();

    const solid = toHex(palette.fg);
    const accent = toHex(palette.accent);
    const fog = toHex(palette.fog);

    rows.forEach((line, ty) => {
      for (let tx = 0; tx < line.length; tx += 1) {
        const code = line[tx];
        if (code === undefined || code === '.') continue;

        const x = tx * tileSize;
        const y = ty * tileSize;

        if (code === '#') {
          g.fillStyle(solid, 1);
          g.fillRect(x, y, tileSize, tileSize);
        } else if (code === 'B') {
          // Bloco quebravel: a cor do chao com um vinco do destaque. Precisa ser
          // visivelmente DIFERENTE do chao solido — o jogador tem que saber onde tentar.
          g.fillStyle(solid, 1);
          g.fillRect(x, y, tileSize, tileSize);
          g.fillStyle(accent, 1);
          g.fillRect(x + 3, y + 3, tileSize - 6, 2);
        } else if (code === '^') {
          g.fillStyle(COLOR.danger, 1);
          g.fillTriangle(x, y + tileSize, x + tileSize / 2, y, x + tileSize, y + tileSize);
        } else if (code === '~') {
          g.fillStyle(fog, 1);
          g.fillRect(x, y, tileSize, tileSize);
        } else if (code === 'P' || code === 'D') {
          g.fillStyle(accent, 1);
          g.fillRect(x, y, tileSize, tileSize / 3);
        }
        // 'G' e 'E' viram ENTIDADES ao carregar a fase (ver `buildEntities`): quem
        // desenha esses dois e a camada de entidades, nao a grade.
      }
    });
  }
}
