# 0002 — Quatro bibliotecas de render, cada uma com UM trabalho

**Status:** Aceita · **Data:** 2026-10-01

## Contexto

O pedido inicial traz **Phaser + Pixi + React Three Fiber + Matter** juntos, e a intuição manda
avisar antes de escrever código. Isso não é geringa: são quatro motores gráficos (dois deles WebGL
concorrentes) somados a um motor de física.

O problema concreto não é bundle. É **foco**. O documento de processo mede a saúde de um projeto por
quantos loops de iteração ele fechou (Regra do Loop, cap. 7). Um motor por *tarefa concreta* é
barato de aprender e caro de esquecer. Um motor por *ideia que parece boa* é o inverso.

Também há um risco simétrico: as duas mecânicas que **não são plataforma** podem ser exatamente as que
dão identidade ao jogo, e vale a pena pagar um chunk por elas.

## Decisão

Cada biblioteca entra quando existe um **trabalho nomeado** para ela. Nenhuma entra por curiosidade.

| Biblioteca | Trabalho único | Quando entra |
|---|---|---|
| **Phaser 3** | O mundo 2D: tilemap (Tiled), entidades, câmera, pixels | **Agora** |
| **React + Zustand** | HUD, menus, diálogo — DOM, acessível por padrão | **Agora** |
| **React Three Fiber** | A era **3D** (Universo 3D, Mundo 4) e a arena final do Bit Zero | Com o Mundo 4 |
| **PixiJS** | O **K7 Deck** (estante de fitas, linha do tempo): canvas sempre-ligado sobre o jogo | Com a tela de coleção |
| **Matter.js** | Puzzles de física: as Pontes do Cuidado e os muros do Construtor | Com o Mundo 4 |

Dois argumentos que merecem ficar escritos, porque são os não-óbvios:

**Por que Pixi e não um segundo Phaser para o Deck.** O Deck fica *sempre visível por cima do jogo*. Um
segundo `Phaser.Game` custa um contexto WebGL e um loop de render próprios — dois arquivos de render
concorrendo pela GPU a cada quadro, por uma lista de cassetes. O Pixi faz a mesma coisa com uma
instância leve e um único contexto.

**Por que Matter.js standalone, e não a física embutida do Phaser.** As duas pontes do Mundo 4 precisam
ser *simuláveis sem render*. Com Matter.js puro, a mesma simulação roda no teste, medindo se a ponte
segura o peso, e no jogo, desenhando. O teste de balanceamento de uma fase física passa a existir.

## Consequências

**Boas.**

- Nenhuma dependência entra "por enquanto". As três pendentes estão marcadas como marco, com o
  gatilho escrito.
- Trocar de qualquer um dos três motores futuros não toca regra (ADR 0001 garante).
- O build separa o que é essencial do que é futuro: `manualChunks` cria um chunk por motor.

**Ruins.**

- Três dependências instaladas que ainda não têm código. É o preço consciente de não commitar.
- O `manualChunks` declara **só o que existe**. Uma biblioteca instalada sem cena não ganha chunk:
  o config ficaria mentindo sobre o que o jogo carrega. Cada motor entra no chunk junto com a sua cena
  (ver o comentário em `vite.config.ts` e os marcos 4–6 do `docs/loops.md`).

## Alternativas rejeitadas

**Usar só Phaser e P3 para tudo.** O R3F é o motor certo para "profundidade: o mesmo espaço tem mais
camadas" (a regra declarada da era 3D). E o Pixi é o certo para UI canvas sempre-ligada. Trazer o 3D
para dentro do Phaser custaria mais em gambiarra do que o chunk.

**Adiar todas.** Deixar Pixi/Matter/Three fora até o fim é o mesmo erro, na direção oposta: a fase
física do Mundo 4 chega sem plano.

## Revisitar quando

O Deck existir (Pixi entra) **ou** o Mundo 4 começar (R3F e Matter entram). Se o Deck for decidido como
DOM puro — é uma hipótese legítima — este ADR perde o Pixi e a linha é removida.
