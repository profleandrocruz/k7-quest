# tools/ — ponte entre o código e o Tiled Map Editor

Fases do K7 Quest são **dados**, não código (`GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md`, seção 8). Isso
significa duas coisas: elas são legíveis em `git diff` e são **validadas por teste** — mas ler 64
caracteres por linha num editor de texto não é autoria de fase, é castigo.

O Tiled entra aqui como **editor visual**, nunca como fonte da verdade.

## Os dois comandos

```bash
npm run levels:export                 # codigo  -> public/levels/*.tmj
npm run levels:import                 # public/levels/*.tmj -> "o que mudou?"
npm run levels:import -- --write      # public/levels/*.tmj -> codigo
```

### `export` — mostro o jogo no editor visual

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

### `import` — trago o mapa editado de volta para o código

O `manifest.json` já carrega o `levelId` de cada mapa justamente para permitir essa leitura.

```bash
npm run levels:import
```

Sem argumento, **não escreve nada**: ele só compara e diz o que mudou.

```
[import] 6 mapa(s) -> 4 fase(s)

[import] w1-l3-bosque:
  8bit linha 7 coluna 30: "#" -> "."
  spawn NOVO: pixelFragment@400,144

[import] o Tiled tem mudancas ainda NAO publicadas no codigo.
[import] para publicar:  npm run levels:import -- --write
```

Só com `--write` ele gera `src/game/content/levels/tiled/*.ts`.

**Duas garantias que valem mais que o comando:**

1. **Fase importada passa no mesmo validador** das fases escritas à mão
   (`levels/validate.ts`). Importar do Tiled não cria um caminho sem teste — só um caminho mais
   curto. Se a edição no mapa selar o objetivo, o importador recusa e mostra a fase reprovada.
2. **Exportar e importar são a mesma regra.** A conversão mora em
   `src/game/content/levels/tiledFormat.ts`, e os dois scripts carregam esse mesmo módulo. Não
   existem duas implementações para divergirem em silêncio.

### O que o importador NÃO faz

- **Não apaga o comentário de design.** As fases do slice têm comentários que explicam *por que* o
  mapa é assim (a alternância de eras do bosque, as duas soluções do castelo). Por isso o código
  importado vai para `content/levels/tiled/` e não por cima do `world1.ts`. O `levels/index.ts`
  escolhe entre os dois explicitamente — nada é sobrescrito em silêncio.
- **Não adivinha a identidade de um spawn.** Um spawn sem `era` aparece nas camadas de *todas* as
  eras. O importador decide: presente em todas as camadas → global; em parte delas → exclusivo
  daquelas. É a regra que `buildEntities` usa, e inverter essa leitura faria um coletável contar
  duas vezes (ou sumir ao trocar de era).

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

O índice **é** o GID do Tiled (`GID = índice + 1`). A ordem vem de `TILE_LEGEND` em
`src/game/rules/tilemap.ts` (a legenda do domínio) — e `tools/pngTileset.mjs` só desenha o PNG.

> **Regra de ouro do autor:** só adicione tiles **no fim** da lista. Inserir no meio muda o GID de
> todos os tiles seguintes e quebra silenciosamente todos os mapas já exportados. O `export`
> compara as duas listas e **falha o comando** se elas divergirem, justamente porque essa
> divergência é invisível no mapa e corrói o terreno em silêncio.

## Onde a conversão mora (e por que não está em `tools/`)

A conversão `.tmj` ↔ fase está em **`src/game/content/levels/tiledFormat.ts`**, não em `tools/`.

O motivo é o do ADR 0001 aplicado ao tooling: `tools/` faz I/O e não pode ser testado; a *regra*
pode. Então:

- `tools/export-tiled-levels.mjs` e `tools/import-tiled-levels.mjs` carregam **o mesmo módulo**;
- a ida-e-volta é provada por `tiledFormat.test.ts` (12 testes, incluindo "toda fase do slice
  volta idêntica");
- ninguém precisa acreditar que dois scripts concordam — eles chamam a mesma função.

## O que o Tiled ainda não sabe fazer

O ciclo fechado é: **editar no Tiled → `npm run levels:import` (confere) → `--write` (publica) →
`npm test`**. O que o Tiled mostra continua vindo do jogo, e o que o jogo roda passa pelo mesmo
validador de sempre.

Continua fora do alcance do editor visual: **diálogo, objetivos e recompensas são metadados** que
viajam em `k7Meta` (JSON), mas não são *editáveis* como Property no Tiled. Um mapa ainda não é um
`GameDesignDocument`: o GDD é o que define a **tese** de uma fase, e isso continua no código.

## Por que o script usa o resolver do Vite

`export-tiled-levels.mjs` carrega os `.ts` das fases com `vite.ssrLoadModule`, o mesmo resolvedor que
o app usa em desenvolvimento. Não há build prévio nem `ts-node`: o exportador **não pode sair de
sincronia** com `src/game/` porque ele lê o mesmo código, com as mesmas regras, na mesma hora.
