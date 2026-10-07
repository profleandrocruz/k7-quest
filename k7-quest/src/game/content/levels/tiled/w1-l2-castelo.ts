/**
 * src/game/content/levels/tiled/w1-l2-castelo.ts — FASE GERADA A PARTIR DO TILED.
 *
 * NAO EDITE ESTE ARQUIVO A MAO: ele e reescrito por `npm run levels:import -- --write`.
 * Para mudar o que o jogo faz, mude o codigo da fase em `src/game/content/levels/` e
 * rode `npm run levels:export`; para mudar o MAPA, edite no Tiled e importe.
 *
 * Gerado de: w1-l2-castelo
 * Eras: 8bit
 */
// O arquivo mora em levels/tiled/, entao types.ts esta a TRES niveis acima
// (game/types.ts) e authoring.ts a dois (levels/authoring.ts).
import type { LevelDefinition } from '../../../types';
import { at } from '../authoring';

export const w1L2Castelo: LevelDefinition = {
  id: "w1-l2-castelo",
  world: 1,
  name: "Castelo de Blocos",
  startEra: "8bit",
  unlockedEras: ["8bit"],
  tilemaps: {
    "8bit": [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      "..................####......................................",
      "......................##....................................",
      "...............###....##....................................",
      "......................BB....................................",
      "......................BB..............^^^...........G.......",
      "##############################...###########################",
      "############################################################",
      "############################################################",
    ],
  },
  spawns: [
    { kind: "checkpoint", at: at(5, 9) },
    { kind: "checkpoint", at: at(32, 9) },
    { kind: "pixelFragment", at: at(9, 9) },
    { kind: "pixelFragment", at: at(16, 7) },
    { kind: "pixelFragment", at: at(19, 5) },
    { kind: "pixelFragment", at: at(28, 9) },
    { kind: "pixelFragment", at: at(45, 9) },
    { kind: "floppy", at: at(47, 9), props: {"reveal":"conceito.castelo"} },
    { kind: "toyKnight", at: at(27, 9), props: {"patrol":4} },
    { kind: "toyKnight", at: at(42, 9), props: {"patrol":3} },
    { kind: "memoryBug", at: at(35, 9), props: {"patrol":2} },
  ],
  objectives: [
    { id: "w1l2.goal", kind: "reachGoal", description: "Abra o caminho e alcance a torre" },
    { id: "w1l2.fragments", kind: "collectFragments", description: "Recolha 5 Fragmentos de Pixel", target: 5 },
  ],
  dialogue: [
    {
      "id": "w1l2.guardian",
      "when": "onStart",
      "skippable": true,
      "lines": [
        {
          "speaker": "Guardiao dos Blocos",
          "text": "As coisas mudam quando crescemos."
        },
        {
          "speaker": "Guardiao dos Blocos",
          "text": "Mas continuam sendo nossas."
        }
      ]
    }
  ],
  musicRef: "bgm.8bit.castelo-de-blocos",
  rewards: {"abilities":["rock.quebra-blocos"]},
  designNote: "Provar a habilidade qualitativa da Fita Rock. Duas solucoes para a parede (quebrar ou contornar) — Lente #32. Espinhos tiram 1 de vida, nunca matam de imediato: o castelo ensina que escolher a rota e do jogador.",
};
