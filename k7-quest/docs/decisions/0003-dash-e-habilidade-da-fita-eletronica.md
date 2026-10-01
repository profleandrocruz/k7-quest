# 0003 — Dash é habilidade da Fita Eletrônica, não movimento básico

**Status:** Aceita · **Data:** 2026-10-01 · **Lentes:** #32, #33, #42

## Contexto

Os documentos do projeto discordam, e ambos são canônicos:

- **GDD**, seção "Mecânicas Principais → Movimento": lista *Caminhar, Correr, Pular, Wall Jump, Dash,
  Flutuação* como movimentos básicos.
- **Game Bible**, seção "Árvore de Habilidades": coloca **Dash como tier 1 da Fita Eletrônica**, ao
  lado de Escudo Digital, Hack Temporal, Quantum Link e Quantum Shift.

Não é detalhe. A escolha decide **quando** o dash aparece: no minuto 1 (jogo inteiro) ou na Fase 1.3
(Mundo 1, ao vencer o Menino Eterno).

## Decisão

Segue a **Game Bible**: `electronic.dash` é tier 1 da Fita Eletrônica. Está em
`src/game/content/abilities.ts` e o gate está no código de movimento:

```ts
// src/game/rules/motion.ts
const hasDash = player.unlockedAbilities.includes('electronic.dash');
if (input.dashPressed && hasDash && ...) { /* inicia o dash */ }
```

O gate é **explícito** porque a assinatura da fita é uma propriedade do código, não uma promessa: uma
fita sem assinatura distinta é uma cor, não uma escolha.

Consequência de design aceita: no vertical slice o jogador **não tem dash**. Ele anda, pula, quebra
blocos (Rock) e corre (Sprint, Pop). Para o dash, precisa chegar à Fase 1.3.

## Consequências

- A progressão de mobilidade é **visível**: o dash é uma conquista, não um botão que já estava lá.
- O Mundo 1 treina as três habilidades que ele usa. Nada fica "guardado para depois" (Lente #42).
- `attempts` de wall jump e salto duplo ficam como `passive` documentado (ADR 0007).

## Alternativas rejeitadas

**Dash básico desde o início (GDD).** Custa a progressão de mobilidade e — pior — faz o Mundo 1 ter
seis verbos quando o jogador ainda está aprendendo a andar. A Lente #48 pede que os primeiros passos
sejam autoexplicativos.

## Revisitar quando

A Fita Eletrônica for conquistada e o dash entrar no fluxo de jogo. Se o dash *não* gerar diferença
perceptível nos playtests, a alternativa a considerar é devolvê-lo ao movimento básico — e este ADR
é o lugar onde essa discussão já foi feita uma vez.
