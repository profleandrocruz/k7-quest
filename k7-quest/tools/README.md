# tools/ — ponte entre o código e o Tiled Map Editor

Fases do K7 Quest são **dados**, não código (`GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md`, seção 8). Isso
significa duas coisas: elas são legíveis em `git diff` e são **validadas por teste** — mas ler 64
caracteres por linha num editor de texto não é autoria de fase, é castigo.

O Tiled entra aqui como **editor visual**, nunca como fonte da verdade.

## O comando

```bash
npm run levels:export
```

Gera em `public/levels/`:

| Arquivo | O que é |
|---|---|
| `w1-l1-parque--8bit.tmj` | Um mapa por **(fase × era)** |
| `k7-terrain.png` | Tileset placeholder (8 tiles × 16 px), gerado sem dependências |
| `manifest.json` | Mapa → `{ levelId, world, era, tamanho }` |

A pasta inteira é **gerada** e está no `.gitignore`: versionar `.tmj` duplicaria cada mudança de fase
num diff ilegível, e quem decide o conteúdo da fase é `src/game/content/levels/`, não o arquivo
exportado (Lente #90). Para abrir no Tiled, rode o comando — ele recria tudo em um segundo.

Saída real hoje:

```
[levels] 6 mapa(s) -> public/levels/
[tileset] 8 tiles em 128x128 -> k7-terrain.png
  - w1-l1-parque--8bit.tmj (60x14, 7 entidades)
  - w1-l2-castelo--8bit.tmj (60x14, 11 entidades)
  - w1-l3-bosque--8bit.tmj (64x14, 7 entidades)
  - w1-l3-bosque--16bit.tmj (64x14, 8 entidades)
  - w1-boss-menino-eterno--8bit.tmj (40x14, 7 entidades)
  - w1-boss-menino-eterno--16bit.tmj (40x14, 6 entidades)
```

Repare que `w1-l3-bosque` tem contagens **diferentes** por era (7 e 8). Está certo: aquela fase tem um
fragmento e um floppy exclusivos de cada era, e o exportador respeita isso.

## Como abrir no Tiled

1. Instale o [Tiled](https://www.mapeditor.org/) (gratuito).
2. **File → Open Map** → `public/levels/w1-l1-parque--8bit.tmj`.
3. Os tiles aparecem. Passe o mouse sobre um tile para ver o código que ele representa.

Cada mapa tem **duas camadas**, porque no jogo elas são coisas diferentes:

- `8bit` / `16bit` — camada de **tiles** (o terreno, estático).
- `8bit__entidades` — camada de **objetos** (os spawns: inimigos, coletáveis, checkpoints).

Achatar as duas faria o designer arrastar um inimigo e o validador do jogo não ver nada. Separá-las mantém
cada mapa honesto sobre o que é fixo e o que se move.

Propriedades do mapa (`Map Properties`) carregam o contexto do design: `k7LevelId`, `k7DesignNote`,
`k7Objectives`, `k7RewardTape`… É por isso que o mapa exportado **explica a si mesmo**.

## A legenda de tiles

| Índice (GID − 1) | Código | Significado |
|---|---|---|
| 0 | `#` | sólido |
| 1 | `B` | bloco quebrável (exige a Fita Rock) |
| 2 | `^` | espinho |
| 3 | `~` | água |
| 4 | `E` | âncora de eco |
| 5 | `D` | porta entre eras |
| 6 | `G` | objetivo da fase |
| 7 | `P` | plataforma móvel |

O índice **é** o GID do Tiled (`GID = índice + 1`), e a ordem está em `tools/pngTileset.mjs`.

> **Regra de ouro do autor:** só adicione tiles **no fim** da lista. Inserir no meio muda o GID de
> todos os tiles seguintes e quebra silenciosamente todos os mapas já exportados.

## Onde isso ainda NÃO vai

Direção inversa — editar no Tiled e devolver ao código — **não existe ainda**. É o item 2 do
`docs/loops.md`. O `manifest.json` já carrega o `levelId` de cada mapa justamente para permitir essa
leitura.

Até lá, o ciclo é: **editar `src/game/content/levels/world1.ts` → rodar os testes → exportar para
conferir no Tiled**. O que o Tiled mostrar é sempre o que o jogo faz — nunca o contrário.

## Por que o script usa o resolver do Vite

`export-tiled-levels.mjs` carrega os `.ts` das fases com `vite.ssrLoadModule`, o mesmo resolvedor que
o app usa em desenvolvimento. Não há build prévio nem `ts-node`: o exportador **não pode sair de
sincronia** com `src/game/` porque ele lê o mesmo código, com as mesmas regras, na mesma hora.
