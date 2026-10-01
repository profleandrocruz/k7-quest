/**
 * src/game/content/abilities.ts — ARVORE DE HABILIDADES (Game Bible, secao "Arvore de Habilidades").
 *
 * REGRA DE DESIGN (Lente #33 - Imaginacao):
 *   Cada fita precisa de UMA habilidade ASSINATURA qualitativa, nao de um numero maior.
 *   A assinatura e sempre o tier 1 da arvore (`abilities[0]`), e e ela que o
 *   vertical slice usa para provar o conceito.
 *
 * DIVERGENCIA REGISTRADA: o GDD lista "Dash" como movimento BASICO, mas a Game Bible
 * coloca Dash como habilidade tier 1 da Fita Eletronica. Seguimos a Game Bible
 * (ver docs/decisions/0003-dash-e-habilidade-da-fita-eletronica.md).
 */
import type { Ability, AbilityId, TapeId } from '../types';

export interface AbilityDef extends Ability {
  /** Tier na arvore (1..5). O tier 1 e a assinatura da fita. */
  tier: number;
  /** A pergunta do jogador que esta habilidade responde (Lente #33). */
  designIntent: string;
}

/** [chave, nome, tipo, custo, cooldownMs, intencao] */
type Row = readonly [string, string, Ability['kind'], number, number, string];

const TREES: Record<TapeId, readonly Row[]> = {
  rock: [
    ['impacto-sonoro', 'Impacto Sonoro', 'areaDamage', 15, 700, 'E se eu puder quebrar o que parecia permanente?'],
    ['quebra-blocos', 'Quebra-Blocos', 'breakBlock', 10, 350, 'Como abrir caminho sem mudar de era?'],
    ['ressonancia', 'Ressonancia', 'areaDamage', 25, 1500, 'E se o som quebrar duas coisas ao mesmo tempo?'],
    ['onda-sismica', 'Onda Sismica', 'areaDamage', 40, 3000, 'Como atingir o que esta longe demais?'],
    ['amplificador-supremo', 'Amplificador Supremo', 'areaDamage', 60, 6000, 'E se eu puder fazer barulho suficiente para acordar o mundo?'],
  ],
  pop: [
    ['sprint', 'Sprint', 'mobility', 10, 400, 'E se eu chegar antes?'],
    ['salto-aprimorado', 'Salto Aprimorado', 'mobility', 15, 600, 'E se pular mais alto mudar o mapa?'],
    ['wall-jump', 'Wall Jump', 'mobility', 12, 250, 'Como subir sem escada?'],
    ['corrida-magnetica', 'Corrida Magnetica', 'mobility', 20, 1200, 'E se eu puder atrair o que quero?'],
    ['starburst', 'Starburst', 'areaDamage', 45, 4000, 'E se eu brilhar o bastante para todos verem?'],
  ],
  jazz: [
    ['flutuacao', 'Flutuacao', 'hover', 8, 200, 'E se eu puder escolher quando pisar?'],
    ['duplo-salto', 'Duplo Salto', 'mobility', 15, 500, 'E se o chao nao for a unica opcao?'],
    ['improvizacao', 'Improvizacao', 'sense', 20, 2000, 'E se eu puder ver o que nao esta visivel?'],
    ['harmonia-temporal', 'Harmonia Temporal', 'timeControl', 35, 4500, 'E se eu puder mudar o compasso?'],
    ['blue-note', 'Blue Note', 'timeControl', 50, 6000, 'E se a nota certa parar o tempo?'],
  ],
  electronic: [
    ['dash', 'Dash', 'mobility', 10, 520, 'E se eu atravessar o que me bloqueia?'],
    ['escudo-digital', 'Escudo Digital', 'shield', 20, 2500, 'E se eu puder ser atingido sem cair?'],
    ['hack-temporal', 'Hack Temporal', 'timeControl', 30, 3500, 'E se eu controlar o inimigo, e nao a mim?'],
    ['quantum-link', 'Quantum Link', 'recordEcho', 25, 1000, 'E se eu puder trabalhar com uma versao de mim mesmo?'],
    ['quantum-shift', 'Quantum Shift', 'hack', 55, 7000, 'E se eu puder ver o codigo do mundo?'],
  ],
};

function buildAbilities(): Record<AbilityId, AbilityDef> {
  const out: Record<AbilityId, AbilityDef> = {};
  (Object.keys(TREES) as TapeId[]).forEach((tape) => {
    TREES[tape].forEach((row, index) => {
      const [key, name, kind, cost, cooldownMs, designIntent] = row;
      const id: AbilityId = `${tape}.${key}`;
      out[id] = { id, tape, name, cost, cooldownMs, kind, tier: index + 1, designIntent };
    });
  });
  return out;
}

export const ABILITIES: Record<AbilityId, AbilityDef> = buildAbilities();

/**
 * A habilidade ASSINATURA de cada fita = tier 1.
 * Se uma fita nao tiver assinatura distinta, ela e uma cor, nao uma escolha (Lente #32).
 */
export const SIGNATURE_ABILITY: Record<TapeId, AbilityId> = {
  rock: 'rock.impacto-sonoro',
  pop: 'pop.sprint',
  jazz: 'jazz.flutuacao',
  electronic: 'electronic.dash',
};

export function abilitiesOfTape(tape: TapeId): AbilityDef[] {
  return TREES[tape]
    .map((row) => ABILITIES[`${tape}.${row[0]}`])
    .filter((a): a is AbilityDef => a !== undefined);
}

export function ownAbilityOfTape(tape: TapeId, unlocked: readonly AbilityId[]): AbilityDef | undefined {
  return abilitiesOfTape(tape).find((a) => unlocked.includes(a.id));
}
