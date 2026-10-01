# 0004 — O eco reproduz movimento, não habilidades

**Status:** Aceita · **Data:** 2026-10-01 · **Lentes:** #8, #9, #42, #73

## Contexto

O GDD define os Ecos Temporais como "versões alternativas de Janus auxiliam na resolução de
desafixos". A frase admite duas leituras opostas:

1. **NPC aliado** que faz coisas que o jogador não consegue.
2. **Uma versão do jogador**, gravada e repetida.

A leitura 2 é a que serve ao tema: *"crescer não é abandonar quem fomos"* — o jogo não te dá ajuda,
ele te faz **trabalhar com quem você já foi**. A leitura 1 é um NPC aliado, que não tem nada a ver
com a mensagem final.

A leitura 2, implementada, exige o eco rodando as **mesmas regras de movimento** do jogador. E aqui
surge a pergunta de escopo: o que exatamente é gravado?

## Decisão

O eco grava **ações de movimento** (direção e botão de pulo), amostradas a ~4 Hz, e as **reproduz pelo
mesmo `stepMotion`** do jogador:

```ts
// src/game/rules/echoes.ts
const result = stepMotion(body.player, dtMs, {
  dir: frame.dir,
  jumpHeld: frame.jump,
  jumpPressed: frame.jump && !previous.jump,  // a BORDA é derivada
  dashPressed: false,
}, grid);
```

O eco **não reproduz habilidades** nesta passada. A decisão é: o eco é uma *memória de
movimento*; habilidades exigem um registro de efeitos (dano, quebra, congelamento) com tempo de
simulação próprio, e isso é uma segunda máquina, não um detalhe.

Restrições que acompanham a decisão:

- **Um eco por era.** Acima disso, o puzzle vira ilegível (Lente #42).
- **Gravação curta demais é recusada** ("Gravacao curta demais"): eco é ação deliberada, não um botão
  que às vezes funciona (Lente #48).
- **O eco não pune.** Energia e vida do eco são zero; ele pausa e recomeça o ciclo (Lente #41).
- **O eco não interage com outra era** (Lente #21) — o espaço é a regra do jogo.

## Consequências

- O corpo do eco é um `PlayerState` completo, então ele respeita gravidade, colisão e coyote time sem
  nenhum código duplicado — e nunca "desmente" a física do jogador.
- A gravação fica em `progress.savedRecordings`, o que já habilita o final que mostra **as versões
  reais do jogador** (Lentes #10, #64, #97) sem trabalho extra.
- Habilidades não são eco-adas. Se um puzzle exigir "o eco segura a porta enquanto eu passo", ele não
  existe ainda.

## Alternativas rejeitadas

**Eco que guarda posições.** Mais simples, e quebra o determinismo: o eco ficaria "errado" sempre que o
jogador fizesse algo diferente da gravação original.

**Reproduzir habilidades desde já.** Emenda aopi: dois sistemas de efeito (o do jogador e o do eco)
com o mesmo timestep, o dobro de superfície de bug, e nenhum ganho de design comprovado por playtest.

## Revisitar quando

O primeiro puzzle de eco exigir uma habilidade — nesse momento, o ADR vira item 3 do `docs/loops.md`, e
a pergunta a responder é: *o puzzle fica melhor com a habilidade do eco, ou com o eco segurando
posição?*
