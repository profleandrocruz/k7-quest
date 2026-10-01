/**
 * src/ui/screens/SelectMenu.tsx — AS DUAS ESCOLHAS QUE MUDAM O JOGO (Lentes #21, #32).
 *
 * Eras e fitas sao os dois canais de decisao do jogo, e por isso dividem a mesma tela:
 * a unica diferenca e o que cada troca muda.
 *
 * Duas garantias de design moram aqui:
 *   - o atalho EXIBIDO e a tecla que FUNCIONA (as duas coisas vem de `ERA_SHORTCUTS` /
 *     `TAPE_SHORTCUTS`, pelo mesmo caminho do keymap) — Lente #59, 3 canais, 1 verdade;
 *   - a tela mostra a limitacao honesta de cada opcao (`tradeoff`) e o motivo da trava
 *     (`blockedReason`). Escolha informada e o que torna a escolha uma decisao.
 *
 * `canSwitchEraTo` / `canSwitchTapeTo` sao as fachadas do dominio: a UI pergunta se PODE,
 * e o proprio `send` decide de novo no reducer. Duas fontes, mesma regra.
 */
import { send } from '../../engine/store';
import { canSwitchEraTo, canSwitchTapeTo, eraChips, tapeChips } from '../../game';
import { useLiveGameState } from '../useLiveGameState';
import Overlay from './Overlay';
import type { EraChip, GameState, TapeChip } from '../../game';

export type SelectMode = 'tape' | 'era';

const LEAD: Record<SelectMode, string> = {
  tape: 'A fita muda o estilo do jogo, nao apenas um numero.',
  era: 'Trocar de era e o que este jogo e: o mesmo espaco, outra regra.',
};

export default function SelectMenu({ mode }: { mode: SelectMode }) {
  const state = useLiveGameState();
  // Bloco de corpo, e nao `=> send(...)`: `send` devolve o estado e um retorno de valor
  // num callback `void` e armadilha de leitura (o leitor espera que ele execute algo).
  const close = (): void => {
    send({ type: 'CLOSE_MENU' });
  };

  return (
    <Overlay label={mode === 'tape' ? 'Escolha a fita' : 'Escolha a era'} onEscape={close}>
      <div className="card card--wide">
        <h2 className="card__title">{mode === 'tape' ? 'Fitas' : 'Eras'}</h2>
        <p className="card__lead">{LEAD[mode]}</p>

        <ul className="choices">
          {mode === 'tape'
            ? tapeChips(state).map((chip) => (
                <TapeChoice key={chip.tape} chip={chip} state={state} onPick={close} />
              ))
            : eraChips(state).map((chip) => (
                <EraChoice key={chip.era} chip={chip} state={state} onPick={close} />
              ))}
        </ul>
      </div>
    </Overlay>
  );
}

function TapeChoice({
  chip,
  state,
  onPick,
}: {
  chip: TapeChip;
  state: GameState;
  onPick: () => void;
}) {
  // A fachada responde a MESMA pergunta que o reducer vai responder ao chegar la.
  const check = canSwitchTapeTo(state, chip.tape);

  return (
    <li>
      <button
        type="button"
        className="choice"
        aria-pressed={chip.active}
        disabled={!chip.unlocked}
        title={check.ok ? undefined : check.reason}
        onClick={() => {
          send({ type: 'SWITCH_TAPE', tape: chip.tape });
          onPick();
        }}
      >
        <kbd className="choice__key">{chip.shortcut.toUpperCase()}</kbd>
        <span className="choice__name" style={{ color: chip.color }}>
          {chip.name}
        </span>
        <span className="choice__detail">{chip.playstyle}</span>
        <span className="choice__tradeoff">{chip.tradeoff}</span>
        <span className="choice__signature">
          Assinatura: {chip.signatureName}
          {!chip.unlocked ? ' — bloqueada' : ''}
        </span>
      </button>
    </li>
  );
}

function EraChoice({
  chip,
  state,
  onPick,
}: {
  chip: EraChip;
  state: GameState;
  onPick: () => void;
}) {
  const check = canSwitchEraTo(state, chip.era);

  return (
    <li>
      <button
        type="button"
        className="choice"
        aria-pressed={chip.active}
        disabled={!check.ok || chip.active}
        title={check.ok ? undefined : check.reason}
        onClick={() => {
          send({ type: 'SWITCH_ERA', era: chip.era });
          onPick();
        }}
      >
        <kbd className="choice__key">{chip.shortcut}</kbd>
        <span className="choice__name" style={{ color: chip.palette }}>
          {chip.name}
        </span>
        <span className="choice__detail">{chip.tagline}</span>
        <span className="choice__tradeoff">{chip.rule}</span>
        <span className="choice__signature">
          {chip.active ? 'Voce esta aqui' : check.ok ? 'Liberada' : (check.reason ?? 'Bloqueada')}
        </span>
      </button>
    </li>
  );
}
