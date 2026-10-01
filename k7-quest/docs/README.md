# docs/ — o sistema de documentos do K7 Quest

Regra que vem de `GAME_DESIGN_CONTEXT_PROCESSO.md` (cap. 24): *um documento existe para lembrar ou
para comunicar. Se não serve a nenhum dos dois, não escreva.*

## Índice

| Documento | Responde a quê | Como vive |
|---|---|---|
| [`decisions/`](./decisions/) | "Por que isso foi feito assim?" | Mudam a cada decisão. Curto e datado. |
| [`loops.md`](./loops.md) | "O que fazer agora?" | Muda a cada marco |
| [`playtests.md`](./playtests.md) | "O que mudou por causa de um jogador?" | Cresce a cada sessão |
| [`../tools/README.md`](../tools/README.md) | "Como autoro uma fase no Tiled?" | Com o workflow |

## As decisões (ADR)

Um ADR por decisão que **custou uma discussão**. Curto de propósito: contexto, decisão,
consequências, alternativas rejeitadas, e quando revisitar.

| # | Assunto | Status |
|---|---|---|
| [0001](./decisions/0001-camada-de-dominio-pura.md) | O jogo tem uma camada de domínio pura, separada do motor | Aceita |
| [0002](./decisions/0002-motores-por-trabalho.md) | Quatro bibliotecas de render, cada uma com UM trabalho | Aceita |
| [0003](./decisions/0003-dash-e-habilidade-da-fita-eletronica.md) | Dash é habilidade da Fita Eletrônica, não movimento básico | Aceita |
| [0004](./decisions/0004-escopo-dos-ecos.md) | O eco reproduz movimento, não habilidades | Aceita |
| [0005](./decisions/0005-recompensas-das-fases.md) | Recompensas do slice anteciparam a Fita Pop | Aceita (temporária) |
| [0006](./decisions/0006-escopo-do-chefe.md) | A arena do Menino Eterno está pronta; a luta multi-forma não | Aceita |
| [0007](./decisions/0007-efeitos-de-habilidade.md) | Quatro efeitos implementados; o resto é `passive` com nota | Aceita |

### Como citar uma decisão no código

O código aponta para o ADR pelo caminho, e o ADR aponta para o código. Assim, quem encontra uma
regra estranha chega à discussão em um salto:

```ts
/**
 * DIVERGENCIA REGISTRADA (docs/decisions/0005-recompensas-das-fases.md):
 * a Pop vem aqui porque o slice precisa de DUAS fitas para provar a escolha (Lente #32).
 */
```

## Onde vive a **documentação de design** (não está aqui)

Os quatro documentos de lenses e de jogo vivem na raiz do repositório, ao lado do código:

| Arquivo | O que é |
|---|---|
| `GAME_DESIGN_CONTEXT.md` | As 100 lentes + como aplicá-las a este jogo |
| `GAME_DESIGN_CONTEXT_ARQUITETURA.md` | React: estado, loop, render, input, acessibilidade |
| `GAME_DESIGN_CONTEXT_PROCESSO.md` | Regra do Loop, prototipagem, playtest, balanceamento |
| `GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md` | O sistema do K7 Quest: fases, fitas, ecos, chefes |
| `Cassette_Quest_GDD_Completo.md` | Game design document original |
| `Cassette_Quest_Game_Bible_Completa.md` | Narrativa, fases, habilidades, recompensas |
| `Cassette_Quest_Narrative_Bible.md` | Arcos de Janus e Bit Zero, capítulo a capítulo |

E a **tabela de balanceamento** é código, não documento: `src/game/gameBalance.ts` tem um comentário
de intenção por número. É por isso que `docs/decisions/0005` diz "recompensa da Fase 1.3" e o
leitor sabe exatamente onde olhar.
