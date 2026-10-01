/**
 * src/game/content/eras.ts — DADOS DE APRESENTACAO E REGRA DAS ERAS.
 *
 * Fonte unica de verdade para as QUATRO camadas de render (React HUD, Phaser, Pixi, Three).
 * Motivo (Lente #9 - Unificacao): se cada motor tivesse sua propria tabela de paletas,
 * as eras deixariam de parecer a mesma coisa em telas diferentes.
 *
 * `rule` NAO e decoracao: e a descricao em uma frase do que a era faz DIFERENTE
 * (GAME_DESIGN_CONTEXT.md, secao 11.1 - o tema precisa ser mecanico).
 */
import type { EraId } from '../types';

export interface EraPalette {
  /** Fundo do ceu / cena. */
  bg: string;
  /** Cor base do terreno. */
  fg: string;
  /** Destaque (UI, particulas, fitas). */
  accent: string;
  /** Cor da "nevoa"/fundo distante, para profundidade. */
  fog: string;
}

export interface EraDisplay {
  id: EraId;
  /** Nome no mundo do jogo (GDD). */
  name: string;
  /** Fase da vida que a era representa. */
  lifeStage: string;
  /** Nome tecnologico, para a linha do tempo da UI. */
  techAge: string;
  /** Frase curta mostrada no HUD e na tela de selecao. Nunca explica emocao (Lente #64). */
  tagline: string;
  palette: EraPalette;
  /** Identificador da trilha musical (Lentes #63, #58). */
  music: string;
  /** A REGRA que esta era introduz (Lente #21). Uma frase, sem numeros. */
  rule: string;
  /** Motor que renderiza esta era com mais proveito. */
  renderMode: 'platformer' | 'era3d' | 'physicsPuzzle';
}

export const ERAS: Record<EraId, EraDisplay> = {
  '8bit': {
    id: '8bit',
    name: 'Reino 8 Bits',
    lifeStage: 'Infancia',
    techAge: '8 bits',
    tagline: 'O mundo era do tamanho do quintal.',
    palette: { bg: '#0d1b0e', fg: '#5b8c5a', accent: '#f2e14c', fog: '#16281a' },
    music: 'bgm.8bit.primeiros-pixels',
    rule: 'Sem dash: o mundo e simples e cada passo importa.',
    renderMode: 'platformer',
  },
  '16bit': {
    id: '16bit',
    name: 'Cidade 16 Bits',
    lifeStage: 'Adolescencia',
    techAge: '16 bits',
    tagline: 'Rapido demais para ter certeza de nada.',
    palette: { bg: '#1a0a14', fg: '#c0392b', accent: '#e84393', fog: '#2b1020' },
    music: 'bgm.16bit.avenida-arcade',
    rule: 'Rapido e derrapante: velocidade sem controle.',
    renderMode: 'platformer',
  },
  '32bit': {
    id: '32bit',
    name: 'Republica 32 Bits',
    lifeStage: 'Vida adulta na sociedade',
    techAge: '32 bits',
    tagline: 'O relogio nunca foi embora.',
    palette: { bg: '#0b1016', fg: '#2c3e50', accent: '#00d8d6', fog: '#151f2b' },
    music: 'bgm.32bit.centro-financeiro',
    rule: 'Tudo custa tempo: energia e recursos sao mais escassos.',
    renderMode: 'platformer',
  },
  '3d': {
    id: '3d',
    name: 'Universo 3D',
    lifeStage: 'Vida adulta na familia',
    techAge: 'Polygonos',
    tagline: 'O amor tambem tem peso.',
    palette: { bg: '#120b1c', fg: '#8e44ad', accent: '#f6b93b', fog: '#221230' },
    music: 'bgm.3d.vila-das-conexoes',
    rule: 'Profundidade: o mesmo espaco tem mais camadas do que voce consegue carregar.',
    renderMode: 'era3d',
  },
  quantum: {
    id: 'quantum',
    name: 'Nexus Quantico',
    lifeStage: 'Terceira idade',
    techAge: 'Quantico',
    tagline: 'O tempo ficou mais leve do que a saudade.',
    palette: { bg: '#04121a', fg: '#16a085', accent: '#a8e6cf', fog: '#0a2230' },
    music: 'bgm.quantum.biblioteca-do-tempo',
    rule: 'Leveza: a gravidade cede e cada momento dura mais.',
    renderMode: 'era3d',
  },
};

/** A era que corresponde a cada mundo da campanha. */
export const WORLD_ERA: Record<number, EraId> = {
  1: '8bit',
  2: '16bit',
  3: '32bit',
  4: '3d',
  5: 'quantum',
};

export const WORLD_TITLES: Record<number, string> = {
  1: 'O Reino das Primeiras Memorias',
  2: 'As Vozes da Identidade',
  3: 'A Cidade Que Nunca Descansa',
  4: 'Pontes e Muros',
  5: 'O Horizonte das Memorias',
};
