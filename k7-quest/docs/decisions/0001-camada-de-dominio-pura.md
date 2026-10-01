# 0001 — O jogo tem uma camada de domínio pura, separada do motor

**Status:** Aceita · **Data:** 2026-10-01

## Contexto

O K7 Quest foi especificado em quatro documentos de design antes da primeira linha de código
(`GAME_DESIGN_CONTEXT.md`, `_ARQUITETURA.md`, `_PROCESSO.md`, `_CASSETTE_QUEST.md`). A regra que mais
aparece neles é a da **Lente #92**: *a tecnologia é o meio, não o propósito — e é o elemento mais
volátil dos quatro da Tetrade*.

A tentação real não é o oposto disso: é começar a *parecer* disciplinado e ir deixando o motor vazar para
dentro da regra. Um `player.y -= velocity` dentro de um componente, um `Math.random()` num método de
spawn, um `if (phase === 'playing')` espalhado por cinco arquivos. Nada disso quebra na hora — quebra
quando ninguém mais consegue alterar uma curva de dificuldade com segurança.

## Decisão

Existe uma fronteira verificável: **`src/game/` não importa React, Phaser, Pixi, Three, Matter nem
`Date.now()`/`Math.random()`.**

- `src/game/` — regras, dados, estado. Puro, determinístico, serializável. Roda headless nos testes.
- `src/engine/` — tempo, input, render, persistência. **Fala com o jogo pelo barril `src/game`.**
- `src/ui/` — React. Consome o barril e **nunca** `src/game/rules/*`.

O que a fronteira compra, em uma frase por item:

| Ganho | Como |
|---|---|
| Testes sem navegador | `reduce` é uma função de duas entradas e uma saída |
| Replay e reexecução exata | `state.log` é a lista de ações; mesmo seed + mesmas ações = mesmo mundo |
| Trocar de motor sem reescrever regra | `renderMode` é um campo do estado, decidido pelo domínio |
| Anti-padrões impossible de escrever | `Math.random()` em `src/game/` é erro de compilação por review |

O reducer é a única porta de entrada do estado: `dispatch(state, action) => nextState`. Nenhum
componente escreve no estado do jogo.

## Consequências

**Boas.**

- `domain.test.ts` roda em Node puro (`vitest`, ambiente `node`), em milissegundos.
- A camada de domínio é a única que documenta regra. `gameBalance.ts` tem um único comentário por número.
- Um bug de física reproduz: `?seed=1234` (ver `src/ui/urlOptions.ts`).

**Ruins.**

- Duas camadas para atravessar ao mudar uma regra. É o preço, e é proposital.
- Estado grande: `GameState` é ~500 linhas de tipo. Manual, mas cada campo tem motivo.
- Regra e apresentação às vezes precisam do mesmo dado. A solução é o **barril + seletores**, não
  importar `rules/` na UI.

## Alternativas rejeitadas

**Estado global único + Zustand.** Menos indireção, mas cada `setState` vira um ciclo de render e o
reducer puro deixa de existir. O teste determinístico dependeria de agendar `setTimeout`.

**Só TypeScript e sem framework de estado.** Equivalente no papel; Zustand entra apenas como *ponte de
notificação* entre o estado fora do React e o React (ver `src/engine/store.ts`).

**Regras dentro dos componentes Phaser.** É como a maioria dos jogos Web é escrita — e é exatamente o
que torna ajuste de `game feel` um trabalho de caça ao tesouro.

## Revisitar quando

O domínio ganhar um sistema que dependa do tempo real (áudio reativo, tremor de câmera que altera a
física). Aí o passo fixo vira `dt` variável e este ADR precisa de uma revisão explícita.
