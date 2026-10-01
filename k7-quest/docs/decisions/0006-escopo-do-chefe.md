# 0006 — A arena do Menino Eterno está pronta; a luta multi-forma não

**Status:** Aceita · **Data:** 2026-10-01 · **Lentes:** #31, #32, #42, #61, #77

## Contexto

A tese do chefe é *"se eu crescer, deixarei de ser feliz"*. O documento de sistema define como isso vira
**regra de mundo**: o cenário repete a si mesmo, e o caminho só abre quando o jogador **escolhe**
avançar.

Uma luta de chefe precisa de duas coisas, e elas têm custos muito diferentes:

1. **A arena** — geometria, câmera, recompensa.
2. **A luta** — formas com mecânica própria, barras de vida, fases, interludes.

## Decisão

Construímos a **arena** e a regra do cenário agora; a luta multi-forma fica registrada como marco.

O que existe (`w1-boss-menino-eterno`):

- Duas camadas de era com **plataformas reposicionadas** — a mesma plataforma reaparece noutro lugar
  em 16 bits. O mundo "congelado" mantém as coisas no lugar, e o jogador precisa aceitar que a
  passagem existe em outro arranjo.
- Objetivo `defeatBoss` declarado, recompensa da Fita Pop, diálogo de entrada, checkpoints.
- Inimigo de patrulha para dar ritmo (Lente #44).

O que **não** existe ainda: as 6 formas, cada uma com a mecânica exclusiva que sua tese pede
(Criança Eterna, Rebelde Perdido, Produtivo Infinito, Guardião Sobrecarregado, Ancião Esquecido,
Forma Absoluta).

A regra que já está escrita e deve ser respeitada quando a luta entrar: **nenhuma forma pode ser
"enchimento de barra de vida"** — cada uma precisa de uma mecânica que o jogador não teria visto antes,
e o checkpoint entre formas é obrigatório (Lente #41).

## Consequências

- O objetivo `defeatBoss` marca o chefe como derrotado ao tocar no objetivo. É um **placeholder
  funcional**, não uma mentira: o marco seguinte substitui essa condição por `forma.concluida`.
- A arena não está "meia pronta por accidento": ela é a parte que não muda quando a luta entrar.

## Alternativas rejeitadas

**Um chefe "de verdade" simples, com duas fases e barra de vida.** Seria mais completo e seria uma
mentira de escopo: a luta simples seria a primeira do jogo, e a primeira luta define o padrão de como
o jogo espera que o jogador lute.

**Deixar a arena para depois.** A arena é o que dá a última chance de validar o sistema de eras com
um contexto de tensão antes de expandir para outros mundos.

## Revisitar quando

O vertical slice for validado em playtest (`docs/loops.md`, marco 1). A luta é o marco 3.
