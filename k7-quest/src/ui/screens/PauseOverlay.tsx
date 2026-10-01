/**
 * src/ui/screens/PauseOverlay.tsx — PAUSAR E PAUSAR DE VERDADE (Lente #39).
 *
 * Ate aqui a palavra "pausa" e um nome de tela. O que a torna real e a regra: `PAUSE`
 * grava `phaseBeforePause` e muda `phase`, e `useGameLoop` so roda quando a fase e
 * `playing`. Nao existe caminho em que o mundo ande com o jogo pausado — o menu
 * simplesmente nao desenha nada, porque nada se move.
 *
 * Por isso esta tela avisa: "o jogo continua parado" e verdade, literalmente.
 */
import { send } from '../../engine/store';
import { currentObjective, fragmentTally } from '../../game';
import { useLiveGameState } from '../useLiveGameState';
import Overlay from './Overlay';

export default function PauseOverlay() {
  const state = useLiveGameState();
  const objective = currentObjective(state);
  const fragments = fragmentTally(state);

  return (
    <Overlay label="Jogo pausado" onEscape={() => send({ type: 'RESUME' })}>
      <div className="card">
        <h2 className="card__title">Pausa</h2>
        <p className="card__lead">{state.level.name || 'Fase sem nome'}</p>
        <p className="card__note">O mundo continua exatamente onde estava.</p>

        {objective ? (
          <p className="card__note">
            Objetivo: {objective.description} ({objective.current}/{objective.target})
          </p>
        ) : null}
        <p className="card__note">
          Fragmentos nesta fase: {fragments.collected}/{fragments.total}
        </p>

        <div className="card__actions">
          <button type="button" className="btn btn--primary" onClick={() => send({ type: 'RESUME' })}>
            Continuar — <kbd>Esc</kbd>
          </button>
          <button type="button" className="btn" onClick={() => send({ type: 'OPEN_TITLE' })}>
            Voltar ao titulo
          </button>
        </div>
      </div>
    </Overlay>
  );
}
