# 0007 — Quatro efeitos de habilidade implementados; o resto é `passive` com nota

**Status:** Aceita · **Data:** 2026-10-01 · **Lentes:** #33, #42

## Contexto

A Game Bible define uma árvore de **20 habilidades** (4 fitas × 5 tiers). O código precisava de uma
decisão sobre o que fazer com as 16 que o vertical slice não usa.

O risco real não é "não implementar". É **implementar de forma silenciosa**: uma habilidade que
aparece no HUD, aceita o clique, consome energia e **não faz nada**. O jogador perde a confiança na
interface inteira — e a Lente #57 diz que feedback é o que sustenta essa confiança.

## Decisão

`src/game/content/abilityEffects.ts` é a tabela de efeitos, separada da árvore de nomes/custos. Todo
efeito implementado é um de quatro tipos:

| Tipo | O que faz | Habilidades no slice |
|---|---|---|
| `breakArea` | Quebra Blocos e atinge inimigos num raio | `rock.*` |
| `boost` | Impulso de velocidade temporário | `pop.sprint` |
| `shield` | Invulnerabilidade temporária | `electronic.escudo-digital` |
| `freezeWorld` | Para o mundo (inimigos e tempo) | `jazz.harmonia-temporal`, `electronic.hack-temporal` |

Habilidades cujo sistema de suporte ainda não existe entram como `{ kind: 'passive', note: '...' }`,
com a `note` dizendo **o que falta**. Nunca como um `case` vazio.

Exemplo do contrato:

```ts
'pop.wall-jump': {
  kind: 'passive',
  note: 'requer deteccao de parede encostada por lado (motion ainda nao expoe isso)',
},
```

A `note` é o compromisso: quando o sistema chegar, a nota vira trabalho com critério, não caça.

## Consequências

- Uma habilidade `passive` **não é inútil**: `jazz.flutuacao` e `electronic.dash` estão marcadas assim
  e são ativas de verdade — implementadas onde a regra mora (movimento), não na tabela de efeitos.
- O `tier 1` de cada fita é sempre a assinatura, e a assinatura é a que está implementada. É o que
  permite ao vertical slice provar a mecânica de identidade com 4 habilidades em vez de 20.
- Um teste garante que toda habilidade tem entrada na tabela. Entrar na árvore sem entrada na tabela
  é falha de teste, não um botão morto em produção.

## Alternativas rejeitadas

**Implementar as 20 agora.** Doze delas dependem de sistemas que não existem (parede encostada,
atração de objetos, escala de pulo separada). Implementar "do jeito que dá" produz a promessa falsa que
este ADR existe para evitar.

**Deixar a assinatura fora da tabela de efeitos.** Seria mais coeso conceitualmente, mas espalha
condições (`if (abilityId === 'jazz.flutuacao')`) por dentro da regra de movimento. A regra fica
declarando nomes de habilidade, e aí a árvore vira código.

## Revisitar quando

Um sistema de suporte entrar: detecção de parede (wall jump), escala de pulo separada (salto
aprimorado), objetos atraíveis (corrida magnética). Cada um desses vira um item do `docs/loops.md`.
