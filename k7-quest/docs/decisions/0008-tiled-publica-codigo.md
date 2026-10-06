# 0008 — O Tiled publica código, mas o código continua decidindo

**Status:** Aceita · **Data:** 2026-10-05

## Contexto

O roadmap tinha um furo declarado: o exportador existia, o importador não (`docs/loops.md`,
item 2). Sem ele, o Tiled era um **visualizador** — o designer abria o mapa, arrastava um inimigo e
não tinha como publicar. E a frase de `tools/README.md` era dura: *um designer que não pode publicar
não autoria*.

Isso criava uma tentação de inverter a fonte da verdade: deixar o `.tmj` virar o arquivo mestre, já
que é o que o designer edita. Seria o caminho mais curto até "arrastar um tile e o jogo muda".

Tres coisas pressionavam nessa direcao:

1. **O `.tmj` é um arquivo gerado.** Versioná-lo duplica cada mudança de fase num diff ilegível, e
   o jogo inteiro depende de revisão de código. Um mapa que pode virar fonte da verdade é um mapa
   que ninguém mais revisa.
2. **O editor visual não conhece a regra do jogo.** Uma parede no Tiled não sabe se o objetivo fica
   alcançável depois dela. Quem sabe é `levels/validate.ts`, e ele só roda sobre `LevelDefinition`.
3. **Perder o comentário de design é perder o projeto.** As fases do slice têm comentários que
   explicam *por que* o mapa é assim — a alternância de eras do bosque, as duas soluções do castelo.
   Sobrescrever `world1.ts` a partir de um mapa apagaria a *tese* da fase junto com o chão.

## Decisão

**O Tiled publica código; o código continua sendo a fonte da verdade.** Três regras:

1. **A conversão mora no domínio, não em `tools/`.** `src/game/content/levels/tiledFormat.ts`
   guarda a regra nos dois sentidos, e os dois scripts (export e import) carregam **esse mesmo
   módulo**. Uma regra testada em um lugar não pode ter uma segunda cópia não testada em outro —
   é o ADR 0001 aplicado ao tooling.
2. **Fase importada é fase comum.** Ela passa pelo mesmo `validateLevel` e pelos mesmos testes que
   uma fase escrita à mão. Importar não abre um caminho sem teste, só um caminho mais curto.
3. **`import` por padrão não escreve nada.** Ele compara e diz o que mudou; `--write` é a decisão
   explícita de publicar. E o código importado vai para `content/levels/tiled/`, não por cima de
   `world1.ts` — o registro de fases escolhe entre os dois, à vista.

O `.tmj` ganhou uma propriedade `k7Meta`: o JSON da fase sem tiles e sem spawns. Ela existe porque
as `k7*` legíveis (`k7Objectives` = `id:kind`) **não devolvem a fase inteira** — perdem `target` e
`description`. Uma ida-e-volta que perde dado não é ida-e-volta.

## Consequências

**Boas.**

- O ciclo fecha: *editar no Tiled → `levels:import` (confere) → `--write` → `npm test`*.
- O Tiled deixa de ser, explicitamente, um visualizador, sem virar a fonte da verdade.
- Exportar e importar não podem divergir: um teste de ida-e-volta cobre toda fase do slice.
- Divergência entre a ordem do tileset e a legenda do domínio agora **falha o comando**, em vez de
  corromper mapas em silêncio.

**Ruins.**

- Há dois lugares onde uma fase pode viver (`world1.ts` e `tiled/`). É uma ambiguidade real, e a
  mitigação é o registro ser explícito — não dá para "descobrir" qual usar.
- A ordem dos spawns precisa sobreviver à viagem (`k7Order`). Sem ela, exportar/importar reordenava o
  array e produzia um diff que mexe em linhas sem mudar nada.
- Diálogo, objetivos e recompensas viajam em `k7Meta` mas **não são editáveis** como Property. Um
  mapa ainda não é um `GameDesignDocument`, e fingir que é seria mentir para o designer.

## Alternativas rejeitadas

**`.tmj` como fonte da verdade.** É o que a maioria dos projetos faz, e funciona — até a primeira vez
que alguém editar um mapa e quebrar a fase. Aí ninguém sabe se o erro está no mapa ou no código, e o
validador headless (a única rede de segurança real deste projeto, Lente #30) deixa de existir.

**Importador reescrevendo `world1.ts`.** Menos arquivos, e a/comments de design do slice
desapareceriam na primeira importação. O ganho é de conveniência de autoria; o custo é a tese da
fase.

**Um editor próprio em vez do Tiled.** Decisão adiada: só se o Tiled se mostrar um obstáculo
real no uso, e não antes. É a mesma postura do ADR 0002 em relação aos motores.

## Revisitar quando

O Mundo 2 entrar (fases grandes demais para ler em `.tmj`raw) **ou** quando o número de fases
importadas do Tiled passar das escritas à mão — nesse dia, a ambiguidade dos dois lugares custa mais
do que o código duplicado que ela evita.
