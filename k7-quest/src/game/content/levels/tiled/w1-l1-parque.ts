/**
 * src/game/content/levels/tiled/w1-l1-parque.ts — FASE GERADA A PARTIR DO TILED.
 *
 * NAO EDITE ESTE ARQUIVO A MAO: ele e reescrito por `npm run levels:import -- --write`.
 * Para mudar o que o jogo faz, mude o codigo da fase em `src/game/content/levels/` e
 * rode `npm run levels:export`; para mudar o MAPA, edite no Tiled e importe.
 *
 * Gerado de: w1-l1-parque
 * Eras: 8bit
 */
// O arquivo mora em levels/tiled/, entao types.ts esta a TRES niveis acima
// (game/types.ts) e authoring.ts a dois (levels/authoring.ts).
import type { LevelDefinition } from '../../../types';
import { at } from '../authoring';

export const w1L1Parque: LevelDefinition = {
  id: "w1-l1-parque",
  world: 1,
  name: "Parque dos Primeiros Pixels",
  startEra: "8bit",
  unlockedEras: ["8bit"],
  tilemaps: {
    "8bit": [
      "............................................................",
      "............................................................",
      ".....B......................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      "..............................###...........................",
      "............................................................",
      "..............#####.........................................",
      "............................................................",
      "........E...............................................G...",
      "####################....####################....############",
      "############################################################",
      "############################################################",
    ],
  },
  spawns: [
    { kind: "checkpoint", at: at(6, 9) },
    { kind: "pixelFragment", at: at(10, 9) },
    { kind: "pixelFragment", at: at(16, 7) },
    { kind: "pixelFragment", at: at(24, 9) },
    { kind: "pixelFragment", at: at(31, 5) },
    { kind: "pixelFragment", at: at(40, 9) },
    { kind: "floppy", at: at(20, 9), props: {"reveal":"concept-art.parque"} },
  ],
  objectives: [
    { id: "w1l1.goal", kind: "reachGoal", description: "Chegue ao fim do parque" },
    { id: "w1l1.fragments", kind: "collectFragments", description: "Recolha 5 Fragmentos de Pixel", target: 5 },
  ],
  dialogue: [
    {
      "id": "w1l1.intro",
      "when": "onStart",
      "skippable": true,
      "lines": [
        {
          "speaker": "Mnemos",
          "text": "As geracoes deixaram de conversar."
        },
        {
          "speaker": "Mnemos",
          "text": "Agora elas comecaram a se temer."
        },
        {
          "speaker": "Pix",
          "text": "Voce e novo por aqui?"
        },
        {
          "speaker": "Pix",
          "text": "Nao deixe os pixels apagarem suas lembrancas."
        }
      ]
    }
  ],
  musicRef: "bgm.8bit.primeiros-pixels",
  rewards: {"tape":"rock","abilities":["rock.impacto-sonoro"]},
  designNote: "Ensinar movimento e o gravador de eco. Sem inimigos e sem covas: a primeira fase nunca pode punir (Lentes #34, #48). A plataforma baixa fica em r8 para que o jogador POSSA andar por baixo dela e escolha subir por curiosidade.",
};
