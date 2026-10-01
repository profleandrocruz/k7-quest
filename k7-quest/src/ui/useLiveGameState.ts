/**
 * src/ui/useLiveGameState.ts — LEITURA AO VIVO PARA A UI (Lentes #18, #92).
 *
 * O problema que este hook resolve: a store publica para o React a 10 Hz
 * (`HUD_PUBLISH_EVERY_STEPS`) e so o `HudModel`. Alguns menus precisam de mais —
 * os CHIPS de era e fita, por exemplo, que nao cabem no modelo do HUD.
 *
 * A solucao NAO e aumentar a frequencia do React. Seria 60 `setState` por segundo
 * para redesenhar a mesma barra de vida: jank, e jank destroi o Fluxo (Lente #18).
 *
 * A solucao e o modelo de PULL que o canvas ja usa: assina a publicacao para
 * re-renderizar e le o estado atual no momento da renderizacao. O menu continua
 * discreto; ele apenas le mais campos do mesmo snapshot.
 */
import { getGameState, useHudStore } from '../engine/store';
import type { GameState } from '../game';

export function useLiveGameState(): GameState {
  // Assinar o `hud` e o que faz o componente re-renderizar a cada publicacao.
  useHudStore((s) => s.hud);
  return getGameState();
}
