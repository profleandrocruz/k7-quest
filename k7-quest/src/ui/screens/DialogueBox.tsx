/**
 * src/ui/screens/DialogueBox.tsx — A FALA NA TELA (Lentes #65, #64, #39).
 *
 * Tres coisas importam aqui:
 *   - o texto vem do ESTADO (`state.dialogue`), nunca de uma cena codificada;
 *   - mostrar o AVANCO (`2/5`) e o que impede a sensacao de fala infinita (Lente #39);
 *   - o painel e APLICAVEL ao contexto, nao decorativo: o leitor de tela anuncia o
 *     dialogo, e existe um botao com o mesmo efeito da tecla.
 *
 * `dialogueLine` vem do barril de seletores: a UI pergunta ao dominio, nunca le as
 * regras diretamente (regra do `src/game/index.ts`).
 */
import { send } from '../../engine/store';
import { dialogueLine } from '../../game';
import { useLiveGameState } from '../useLiveGameState';
import Overlay from './Overlay';

export default function DialogueBox() {
  const state = useLiveGameState();
  const active = state.dialogue;
  const line = dialogueLine(state);

  // Sem linha nao ha o que dizer: renderiza nada em vez de um painel vazio.
  if (!active || !line) return null;

  const total = active.lines.length;

  return (
    <Overlay
      label="Dialogo"
      variant="bottom"
      onEscape={() => send({ type: 'ADVANCE_DIALOGUE' })}
    >
      <div className="dialogue">
        <p className="dialogue__speaker">{line.speaker}</p>
        <p className="dialogue__text">{line.text}</p>
        <div className="dialogue__footer">
          <span className="dialogue__count">
            {active.index + 1}/{total}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => send({ type: 'ADVANCE_DIALOGUE' })}
          >
            Continuar — <kbd>Espaco</kbd>
          </button>
        </div>
      </div>
    </Overlay>
  );
}
