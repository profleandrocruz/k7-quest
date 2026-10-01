/**
 * src/ui/screens/EndScreen.tsx — FIM DE PARTIDA, DIGESTO E EPILOGO (Lentes #40, #97).
 *
 * Tres situations diferentes, uma tela. A distincao importa porque cada uma promete
 * uma coisa diferente ao jogador:
 *   - `gameOver`   nao e fim de jogo: e um checkpoint atras. A saida e RENASCER, nao sair.
 *   - `levelComplete` e o digesto: o que esta fase ENTREGA, listado na hora (Lente #40).
 *   - `ending` e o epilogo: devolve ao jogador a propria vida, em numeros.
 *
 * Todos os numeros vem de `levelDigest`/`collectionSummary` — seletores que JA calcularam
 * a resposta. A tela nao soma nada por conta propria.
 */
import { send } from '../../engine/store';
import { collectionSummary, levelDigest } from '../../game';
import { useLiveGameState } from '../useLiveGameState';
import Overlay from './Overlay';

export default function EndScreen() {
  const state = useLiveGameState();
  const digest = levelDigest(state);
  const summary = collectionSummary(state);

  const title =
    state.phase === 'gameOver'
      ? 'Voce caiu'
      : state.phase === 'ending'
        ? 'O tempo passou'
        : 'Fase concluida';

  const lead =
    state.phase === 'gameOver'
      ? 'O progresso continua: da para voltar do ultimo checkpoint.'
      : state.phase === 'ending'
        ? 'Crescer nao e abandonar quem fomos.'
        : digest.objectivesTotal > 0
          ? `${digest.objectivesDone} de ${digest.objectivesTotal} objetivos.`
          : 'Fase resolvida.';

  return (
    <Overlay label={title}>
      <div className="card">
        <h2 className="card__title">{title}</h2>
        <p className="card__lead">{lead}</p>

        <dl className="digest">
          <div className="digest__row">
            <dt>Fragmentos na fase</dt>
            <dd>
              {digest.fragments.collected}/{digest.fragments.total}
            </dd>
          </div>
          <div className="digest__row">
            <dt>Restauracao da regiao</dt>
            <dd>{Math.round(digest.restoration * 100)}%</dd>
          </div>
          <div className="digest__row">
            <dt>Fitas</dt>
            <dd>{summary.tapes}</dd>
          </div>
          <div className="digest__row">
            <dt>Habilidades</dt>
            <dd>{summary.abilities}</dd>
          </div>
          <div className="digest__row">
            <dt>Eras conectadas</dt>
            <dd>{summary.unlockedEras}</dd>
          </div>
          {digest.rewardTape ? (
            <div className="digest__row digest__row--reward">
              <dt>Esta fase entregou</dt>
              <dd>{digest.rewardTape}</dd>
            </div>
          ) : null}
        </dl>

        <div className="card__actions">
          {state.phase === 'gameOver' ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => send({ type: 'RESPAWN' })}
            >
              Renascer — <kbd>Espaco</kbd>
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => send({ type: 'OPEN_TITLE' })}>
            Voltar ao titulo
          </button>
        </div>
      </div>
    </Overlay>
  );
}
