# K7 Quest: Echoes of Generations

> **Sentir que todas as suas versões — de onde você veio e para onde você vai — são necessárias
> para resolver o que está à frente.**
>
> *Crescer não é abandonar quem fomos.*

Jogo de plataforma 2D em que a evolução das eras dos videogames é metáfora das fases da vida. O
Pixelverse foi se fragmentando, e **Janus** precisa restaurar a conexão entre as gerações — usando,
para isso, as versões de si mesmo que já deixou para trás.

**O que queremos que o jogo transforme (Lente #97):** que o jogador termine olhando para as próprias
fases da vida com mais gentileza, em vez de com medo de perder quem era.

---

## Rodar

```bash
cd k7-quest
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o jogo |
| `npm test` | 45 testes do domínio, headless |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + build de produção |
| `npm run levels:export` | Exporta as fases para o Tiled Map Editor |

## Controles

| Ação | Tecla |
|---|---|
| Andar | `←` `→` ou `A` `D` |
| Pular (segurar = mais alto) | `Espaço`, `W` ou `↑` |
| Trocar de era | `1` … `5` |
| Trocar de fita | `Z` `X` `C` `V` |
| Menu de fita / de era | `T` / `R` |
| Pausar · retomar · sair do menu | `Esc` |
| Dash | `Shift` (a partir da Fita Eletrônica) |

O HUD também é clicável e navegável por teclado: nenhum comando existe só no teclado.

## Onde as coisas estão

```
k7-quest/
  src/game/      REGRAS PURAS — sem React, sem motor, sem Date.now, sem Math.random
  src/engine/    TEMPO, INPUT, RENDER — fala com o jogo pelo barril
  src/ui/        HUD, menus, diálogo — DOM (acessível por padrão)
  tools/         Ponte com o Tiled Map Editor
  docs/          Decisões (ADR), roadmap de loops, registro de playtests
```

A regra que sustenta o projeto inteiro: **se um arquivo em `src/game/` importa `react`, a
arquitetura está errada.** Ela está escrita, com as consequências, em
[`k7-quest/docs/decisions/0001`](k7-quest/docs/decisions/0001-camada-de-dominio-pura.md).

## Documentos

**Design** (nesta raiz) — as lentes e o sistema do jogo:

- [`GAME_DESIGN_CONTEXT.md`](GAME_DESIGN_CONTEXT.md) — as 100 lentes e como aplicá-las aqui
- [`GAME_DESIGN_CONTEXT_ARQUITETURA.md`](GAME_DESIGN_CONTEXT_ARQUITETURA.md) — React, loop, render, acessibilidade
- [`GAME_DESIGN_CONTEXT_PROCESSO.md`](GAME_DESIGN_CONTEXT_PROCESSO.md) — Regra do Loop, playtest, balanceamento
- [`GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md`](GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md) — fases, fitas, ecos, chefes
- [`Cassette_Quest_GDD_Completo.md`](Cassette_Quest_GDD_Completo.md) · [`Game Bible`](Cassette_Quest_Game_Bible_Completa.md) · [`Narrative Bible`](Cassette_Quest_Narrative_Bible.md)

**Processo** (em `k7-quest/docs/`): [índice](k7-quest/docs/README.md) · [ADRs](k7-quest/docs/decisions/) · [roadmap de loops](k7-quest/docs/loops.md) · [playtests](k7-quest/docs/playtests.md)

## Estado atual — leia antes de julgar o tamanho

Isto é um **vertical slice**: existe para responder a pergunta mais cara do projeto,
*"o Sistema de Eras é divertido por 5 minutos?"* (ver [`docs/loops.md`](k7-quest/docs/loops.md), marco 1).

Pronto: domínio puro, 4 fases do Mundo 1 (incluindo a que obriga a alternar eras), loop de jogo em
passo fixo, input semântico, HUD acessível, validação automatizada de fases, exportação para o Tiled.

Ainda não existe, e está escrito por quê: luta multi-forma do chefe (ADR 0006), K7 Deck, era 3D,
puzzles de física, Mundos 2–5 (ADR 0002).

**Nenhum jogador humano jogou ainda.** É a primeira pendência do roadmap.

## Direitos autorais

Este repositório **não** distribui obras de terceiros.

O arquivo `the-art-of-game-design-a-book-of-lenses_3.pdf` é um livro **comercializado** (*The Art of
Game Design*, Jesse Schell, Schell Games). É material de referência, não obra deste projeto.

**Estado atual:** ele está **versionado** no commit `50aed1c` (*Initial commit*). O `.gitignore`
desta raiz já o cobre daqui em diante, mas um arquivo **já rastreado** continua no índice — regra de
ignore não desatualiza histórico. Enquanto ele estiver lá:

```bash
# 1. Parar de versionar daqui em diante (o arquivo continua no seu disco, intacto)
git rm --cached the-art-of-game-design-a-book-of-lenses_3.pdf
git commit -m "chore: para de versionar material de referencia protegido por direitos autorais"

# 2. Opcional: apagar também dos commits já publicados. Isso REESCREVE o histórico,
#    exige force-push, e quem já clonou precisa reclonar. Sugestão: git filter-repo.
#    Decisão do mantenedor — não é um passo automático.
```

Por que não fiz o passo 1 sozinho: ele mexe no índice deste repositório e faz parte de uma decisão
maior (se o histórico também será reescrito). O passo 2, em especial, é irreversível para quem já
clonou.
