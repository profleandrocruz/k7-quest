/**
 * src/game/content/tapes.ts — AS QUATRO FITAS MESTRE.
 *
 * Um comando, quatro comportamentos. A fita e a unica alavanca de decisao do jogador
 * durante a fase — ela precisa ser simples de trocar e clara na tela (Lentes #32, #59).
 *
 * A propriedade `cost` (abaixo) e a honestidade do sistema: toda fita forte cobra algo.
 * Sem custo, o jogador so escolhe a "melhor" e a escolha deixa de existir (Lente #42).
 */
import type { TapeId } from '../types';
import { SIGNATURE_ABILITY } from './abilities';

export interface TapeDisplay {
  id: TapeId;
  name: string;
  /** Tribo/voz que a fita representa no mundo. */
  voice: string;
  /** O que a fita faz de diferente NO JOGO (uma frase, sem numeros). */
  playstyle: string;
  /** A limitacao honesta da fita. Toda fita tem uma. */
  tradeoff: string;
  /** Cor da fita no HUD e no inventario (Lente #59: 3 canais de comunicacao). */
  color: string;
  /** Mundo em que a fita e conquistada (Recompensa do chefe). */
  world: 1 | 2 | 3 | 4;
  /** Habilidade assinatura, conforme a Arvore de Habilidades da Game Bible. */
  signature: string;
}

export const TAPES: Record<TapeId, TapeDisplay> = {
  rock: {
    id: 'rock',
    name: 'Fita Rock',
    voice: 'Impacto e permanencia',
    playstyle: 'Peso e controle no ar: cada movimento e uma afirmacao.',
    tradeoff: 'Lenta para reagir. Exige planejar antes de pular.',
    color: '#c0392b',
    world: 1,
    signature: SIGNATURE_ABILITY.rock,
  },
  pop: {
    id: 'pop',
    name: 'Fita Pop',
    voice: 'Velocidade e alcance',
    playstyle: 'Rapida e impulsiva: alcança lugares que as outras nao alcançam.',
    tradeoff: 'Derrapa. Frear no lugar certo e mais dificil do que parece.',
    color: '#e84393',
    world: 2,
    signature: SIGNATURE_ABILITY.pop,
  },
  jazz: {
    id: 'jazz',
    name: 'Fita Jazz',
    voice: 'Fluidez e ambiguidade',
    playstyle: 'Planeio e improviso: o tempo aceita ser negociado.',
    tradeoff: 'Cada acao rende menos impacto imediato.',
    color: '#f6b93b',
    world: 3,
    signature: SIGNATURE_ABILITY.jazz,
  },
  electronic: {
    id: 'electronic',
    name: 'Fita Eletronica',
    voice: 'Precisao e versoes',
    playstyle: 'Dash e ecos: voce deixa de ser um so.',
    tradeoff: 'Depende de energia e de planejamento; sem energia, nao existe.',
    color: '#00d8d6',
    world: 4,
    signature: SIGNATURE_ABILITY.electronic,
  },
};

export const TAPES_ORDERED: TapeDisplay[] = [
  TAPES.rock,
  TAPES.pop,
  TAPES.jazz,
  TAPES.electronic,
];

/**
 * Fita inicial do jogo. Antes da primeira Fita Mestre o jogador nao tem
 * nenhuma habilidade: ele aprende o movimento puro primeiro (Lente #42).
 */
export const STARTING_TAPE: TapeId = 'rock';

/** Fitas que o vertical slice precisa provar: Rock (Mundo 1) e Pop (inicio do Mundo 2). */
export const VERTICAL_SLICE_TAPES: readonly TapeId[] = ['rock', 'pop'];
