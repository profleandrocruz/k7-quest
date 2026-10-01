/**
 * src/game/content/abilityEffects.ts — O QUE CADA HABILIDADE FAZ NO MUNDO.
 *
 * Por que separado de `abilities.ts`: ali estao os NOMES e os CUSTOS (a arvore da
 * Game Bible); aqui esta o EFEITO. Assim o balanceamento de "quanto custa" nao se
 * mistura com "o que faz", e um designer ajusta um sem risco de quebrar o outro.
 *
 * HONESTIDADE DE ESCOPO (Lente #42 — Simplicidade):
 *   Quatro tipos de efeito estao implementados no vertical slice. As habilidades que
 *   dependem de sistemas ainda nao construidos estao marcadas como `passive` com a
 *   nota do que falta. Elas NUNCA sao silenciosamente inuteis: um teste garante que
 *   toda habilidade tem uma entrada aqui.
 *   Ver docs/decisions/0007-efeitos-de-habilidade.md.
 */
import type { AbilityId } from '../types';

export type AbilityEffect =
  /** Quebra Blocos e atinge inimigos dentro de um raio (Fita Rock). */
  | { kind: 'breakArea'; radiusTiles: number; alsoDamage?: number }
  /** Impulso de velocidade temporario — a assinatura da Fita Pop. */
  | { kind: 'boost'; durationMs: number; speedScale: number }
  /** Escudo: invulnerabilidade temporaria (Fita Eletronica). */
  | { kind: 'shield'; durationMs: number }
  /** Para o mundo (Jazz/Eletronica): a versao mecanica de "mudar o compasso". */
  | { kind: 'freezeWorld'; durationMs: number }
  /** Reconhecida, mas o sistema de suporte ainda nao existe. `note` diz o que falta. */
  | { kind: 'passive'; note: string };

export const ABILITY_EFFECTS: Record<AbilityId, AbilityEffect> = {
  // ---- FITA ROCK: impacto e permanencia ----
  'rock.impacto-sonoro': { kind: 'breakArea', radiusTiles: 1.6, alsoDamage: 2 },
  'rock.quebra-blocos': { kind: 'breakArea', radiusTiles: 2.2 },
  'rock.ressonancia': { kind: 'breakArea', radiusTiles: 2.6, alsoDamage: 2 },
  'rock.onda-sismica': { kind: 'breakArea', radiusTiles: 3.4, alsoDamage: 3 },
  'rock.amplificador-supremo': { kind: 'breakArea', radiusTiles: 4.5, alsoDamage: 4 },

  // ---- FITA POP: velocidade e alcance ----
  'pop.sprint': { kind: 'boost', durationMs: 700, speedScale: 1.55 },
  'pop.salto-aprimorado': {
    kind: 'passive',
    note: 'requer escalonamento separado da velocidade de pulo (nao existe em BALANCE ainda)',
  },
  'pop.wall-jump': {
    kind: 'passive',
    note: 'requer deteccao de parede encostada por lado (motion ainda nao expoe isso)',
  },
  'pop.corrida-magnetica': {
    kind: 'passive',
    note: 'requer atracao de objetos — depende do sistema de entidades fisicas (Matter)',
  },
  'pop.starburst': {
    kind: 'passive',
    note: 'dano radial com custo alto; entra na mesma passada das formas de chefe',
  },

  // ---- FITA JAZZ: fluidez e ambiguidade ----
  'jazz.flutuacao': {
    kind: 'passive',
    note: 'ATIVA: implementada em motion.ts (segurar pulo durante a queda)',
  },
  'jazz.duplo-salto': {
    kind: 'passive',
    note: 'requer contador de pulos aereos em MotionState',
  },
  'jazz.improvizacao': {
    kind: 'passive',
    note: 'revelacao de segredos — depende do sistema de zonas/visibilidade',
  },
  'jazz.harmonia-temporal': { kind: 'freezeWorld', durationMs: 3200 },
  'jazz.blue-note': { kind: 'freezeWorld', durationMs: 5200 },

  // ---- FITA ELETRONICA: precisao e versoes ----
  'electronic.dash': {
    kind: 'passive',
    note: 'ATIVA: implementada em motion.ts (gate por unlockedAbilities)',
  },
  'electronic.escudo-digital': { kind: 'shield', durationMs: 2600 },
  'electronic.hack-temporal': { kind: 'freezeWorld', durationMs: 4000 },
  'electronic.quantum-link': {
    kind: 'passive',
    note: 'ATIVA: habilita RECORD_ECHO — ver rules/echoes.ts',
  },
  'electronic.quantum-shift': { kind: 'freezeWorld', durationMs: 7000 },
};

export function effectOf(ability: AbilityId): AbilityEffect {
  return ABILITY_EFFECTS[ability] ?? { kind: 'passive', note: 'efeito nao declarado' };
}
