# 0005 — Recompensas do vertical slice anteciparam a Fita Pop

**Status:** Aceita (temporária) · **Data:** 2026-10-01 · **Lentes:** #32, #40, #90

## Contexto

Duas divergências entre GDD e a necessidade de o vertical slice ser testável.

**1. A Fita Rock.** O GDD a entrega ao vencer o Menino Eterno. A Narrative Bible define o prólogo
("O Último Eco") como: *aprender movimento, encontrar o Walkman Temporal, escolher o avatar*. São
momentos diferentes.

**2. A Fita Pop.** O GDD a entrega ao Glitch Rider (Mundo 2). Mas o demo definido no próprio GDD
precisa de Rock **e** Pop para provar a escolha de fita.

## Decisão

| Fase | Recompensa | Por quê |
|---|---|---|
| 1.1 Parque | Fita **Rock** + `rock.impacto-sonoro` | O Walkman é o "encontrar" do prólogo; entrega a primeira identidade **antes** do chefe |
| 1.2 Castelo | `rock.quebra-blocos` | A Fase 1.2 precisa da segunda habilidade para a parede ter duas soluções |
| 1.3 Bosque | Desbloqueia a era **16 bits** + `pop.sprint` | A fase **é** sobre alternar eras; o sistema tem de existir antes da próxima |
| 1.3 Chefe (Menino Eterno) | Fita **Pop** | Com duas fitas em mãos, a escolha de identidade (Lente #32) finalmente é testável |

A última linha é a única que **contradiz** o GDD de propósito: sem uma segunda fita até o fim do
Mundo 1, o jogador nunca escolhe, e o sistema central do jogo nunca é exercitado.

## Consequências

- A arena do Menino Eterno é o **lugar errado** para a Pop no jogo completo. Quando o Mundo 2 existir,
  ela volta ao Glitch Rider (ou vira upgrade de tier 2). Está anotado em `src/game/content/levels/world1.ts`.
- A Fase 1.3 entrega `pop.sprint` sem a fita Pop. Isso é intencional: o **efeito** do Sprint (impulso de
  velocidade) existe antes de o objeto existir. Ao ganhar a fita, a mesma habilidade fica usável como
  assinatura.

## Alternativas rejeitadas

**Manter o GDD ao pé da letra.** O vertical slice não teria escolha de fita nenhuma, e a pergunta mais
cara do projeto ("o Sistema de Eras é divertido?") seria respondida sem o outro pilar da identidade.

**Atrasar tudo para o Mundo 2.** O vertical slice passaria a medir uma fração do jogo.

## Revisitar quando

O Mundo 2 entrar em produção. Aí: Pop volta ao Glitch Rider, e a Fase 1.3 deixa de conceder `pop.sprint`.
