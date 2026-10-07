/**
 * src/game/content/levels/tiled/w1-l3-bosque.ts — FASE GERADA A PARTIR DO TILED.
 *
 * NAO EDITE ESTE ARQUIVO A MAO: ele e reescrito por `npm run levels:import -- --write`.
 * Para mudar o que o jogo faz, mude o codigo da fase em `src/game/content/levels/` e
 * rode `npm run levels:export`; para mudar o MAPA, edite no Tiled e importe.
 *
 * Gerado de: w1-l3-bosque
 * Eras: 16bit, 8bit
 */
// O arquivo mora em levels/tiled/, entao types.ts esta a TRES niveis acima
// (game/types.ts) e authoring.ts a dois (levels/authoring.ts).
import type { LevelDefinition } from '../../../types';
import { at } from '../authoring';

export const w1L3Bosque: LevelDefinition = {
  id: "w1-l3-bosque",
  world: 1,
  name: "Bosque da Imaginacao",
  startEra: "8bit",
  unlockedEras: ["8bit","16bit"],
  tilemaps: {
    "16bit": [
      "................................................................",
      "................................................................",
      "................................................................",
      "................................................................",
      "................................................................",
      "..........................................####..................",
      "............................................##..................",
      ".......................................##.......................",
      "............................................##..................",
      "....................................##..........................",
      "............................................##............G.....",
      "##################...####################...####################",
      "################################################################",
      "################################################################",
    ],
    "8bit": [
      "................................................................",
      "................................................................",
      "................................................................",
      "................................................................",
      "................................................................",
      "..............................##..........##....................",
      "..............................##................................",
      "..............................##.......##.......................",
      "..............................##................................",
      "..............................BB....##..........................",
      "..............................BB..........................G.....",
      "##################...####################...####################",
      "################################################################",
      "################################################################",
    ],
  },
  spawns: [
    { kind: "checkpoint", at: at(5, 9) },
    { kind: "checkpoint", at: at(54, 9) },
    { kind: "pixelFragment", at: at(10, 9) },
    { kind: "pixelFragment", at: at(20, 9) },
    { kind: "pixelFragment", at: at(33, 8), era: "8bit" },
    { kind: "pixelFragment", at: at(37, 8), era: "16bit" },
    { kind: "pixelFragment", at: at(52, 9) },
    { kind: "floppy", at: at(50, 9), era: "16bit", props: {"reveal":"conceito.bosque"} },
    { kind: "pixelSlime", at: at(24, 9), era: "8bit", props: {"patrol":3} },
    { kind: "memoryBug", at: at(47, 9), era: "16bit", props: {"patrol":2} },
  ],
  objectives: [
    { id: "w1l3.goal", kind: "reachGoal", description: "Atravesse o bosque alternando eras" },
    { id: "w1l3.fragments", kind: "collectFragments", description: "Recolha 4 Fragmentos de Pixel", target: 4 },
  ],
  dialogue: [
    {
      "id": "w1l3.vinyl",
      "when": "onStart",
      "skippable": true,
      "lines": [
        {
          "speaker": "Mnemos",
          "text": "O bosque nao mudou. Voce mudou de idade."
        },
        {
          "speaker": "Mnemos",
          "text": "O que era parede para um, e passagem para o outro."
        }
      ]
    }
  ],
  musicRef: "bgm.8bit.bosque-da-imaginacao",
  rewards: {"unlockEra":"16bit","abilities":["pop.sprint"]},
  designNote: "A FASE QUE DECIDE O PROJETO. O jogador precisa alternar eras para atravessar, e cada parede conserva duas solucoes (Lente #32). O chao e identico nas duas eras de proposito: trocar de era nunca derruba o jogador numa cova invisivel (Lente #30).",
};
