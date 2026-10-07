/**
 * src/game/content/levels/tiled/w1-boss-menino-eterno.ts — FASE GERADA A PARTIR DO TILED.
 *
 * NAO EDITE ESTE ARQUIVO A MAO: ele e reescrito por `npm run levels:import -- --write`.
 * Para mudar o que o jogo faz, mude o codigo da fase em `src/game/content/levels/` e
 * rode `npm run levels:export`; para mudar o MAPA, edite no Tiled e importe.
 *
 * Gerado de: w1-boss-menino-eterno
 * Eras: 16bit, 8bit
 */
// O arquivo mora em levels/tiled/, entao types.ts esta a TRES niveis acima
// (game/types.ts) e authoring.ts a dois (levels/authoring.ts).
import type { LevelDefinition } from '../../../types';
import { at } from '../authoring';

export const w1BossMeninoEterno: LevelDefinition = {
  id: "w1-boss-menino-eterno",
  world: 1,
  name: "O Menino Eterno",
  startEra: "8bit",
  unlockedEras: ["8bit","16bit"],
  tilemaps: {
    "16bit": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "............###...............###.......",
      "........................................",
      "....................###...###...........",
      "........................................",
      "........................................",
      "..................................G.....",
      "########################################",
      "########################################",
      "########################################",
    ],
    "8bit": [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "............###.........................",
      "........................................",
      "..........................###...........",
      "........................................",
      "........................................",
      "..................................G.....",
      "########################################",
      "########################################",
      "########################################",
    ],
  },
  spawns: [
    { kind: "checkpoint", at: at(3, 9) },
    { kind: "checkpoint", at: at(22, 9) },
    { kind: "pixelFragment", at: at(13, 4) },
    { kind: "pixelFragment", at: at(27, 6) },
    { kind: "pixelFragment", at: at(31, 9) },
    { kind: "pixelFragment", at: at(36, 9) },
    { kind: "toyKnight", at: at(18, 9), era: "8bit", props: {"patrol":3} },
  ],
  objectives: [
    { id: "w1boss.goal", kind: "defeatBoss", description: "Enfrente o Menino Eterno" },
  ],
  dialogue: [
    {
      "id": "w1boss.intro",
      "when": "onStart",
      "skippable": true,
      "lines": [
        {
          "speaker": "O Menino Eterno",
          "text": "Se eu crescer, deixarei de ser feliz."
        },
        {
          "speaker": "O Menino Eterno",
          "text": "Se eu impedir todos de crescerem, ninguem sofrera."
        }
      ]
    }
  ],
  musicRef: "bgm.8bit.menino-eterno",
  rewards: {"tape":"pop"},
  designNote: "A tese do Menino Eterno (\"se eu crescer, deixo de ser feliz\") vira REGRA: o cenario repete a si mesmo, e as plataformas reaparecem noutro arranjo em 16 bits. A luta multi-forma e o proximo marco (docs/decisions/0006-escopo-do-chefe.md).",
};
