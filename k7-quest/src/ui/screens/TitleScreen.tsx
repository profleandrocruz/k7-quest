/**
 * src/ui/screens/TitleScreen.tsx — A PRIMEIRA DECISAO (Lentes #32, #60).
 *
 * Escolher avatar aqui e o unico momento em que essa escolha existe; depois disso ela
 * pertence ao estado do dominio e a tela nao a repete. E por isso que existe UMA tela
 * de avatar e nao um menu de avatar dentro do jogo.
 *
 * Os botoes NAO recebem `autoFocus`: se focassem, `useInput` passaria a tratar as
 * setas como entrada de formulario e o personagem nao andaria. Ver `Overlay.tsx`.
 */
import { getRunSeed, setSelectedAvatar, startRun, useHudStore } from '../../engine/store';
import Overlay from './Overlay';
import type { AvatarId } from '../../game';

interface AvatarCard {
  id: AvatarId;
  name: string;
  tagline: string;
}

/**
 * Apresentacao, nao regra: o dominio guarda o `AvatarId` e nada mais sobre ele.
 * Deliberadamente sem invencao de lore — o vertical slice ainda nao tem historia
 * escrita para os dois (Lente #90 — honestidade de escopo).
 */
const AVATARS: readonly AvatarCard[] = [
  { id: 'solaris', name: 'Janus Solaris', tagline: 'O avatar padrao do vertical slice.' },
  { id: 'luna', name: 'Janus Luna', tagline: 'O mesmo mundo, outra escolha de identidade.' },
];

const CONTROLS: readonly (readonly [string, string])[] = [
  ['A / D  ou  setas', 'andar'],
  ['Espaco', 'pular e confirmar'],
  ['Shift', 'dash'],
  ['1 a 5', 'trocar de era'],
  ['Z X C V', 'trocar de fita'],
  ['T / R', 'abrir fitas / eras'],
  ['Esc', 'pausar'],
];

export default function TitleScreen() {
  const avatar = useHudStore((s) => s.avatar);
  const seed = getRunSeed();

  return (
    <Overlay label="Tela de titulo">
      <div className="card card--wide">
        <p className="card__eyebrow">K7 Quest</p>
        <h1 className="card__title">Echoes of Generations</h1>
        <p className="card__lead">Crescer nao e abandonar quem fomos.</p>

        <fieldset className="avatars">
          <legend className="avatars__legend">Quem vai lembrar</legend>
          {AVATARS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="avatar"
              aria-pressed={avatar === option.id}
              onClick={() => setSelectedAvatar(option.id)}
            >
              <span className="avatar__name">{option.name}</span>
              <span className="avatar__tagline">{option.tagline}</span>
            </button>
          ))}
        </fieldset>

        <button type="button" className="btn btn--primary" onClick={() => startRun(avatar)}>
          Comecar — <kbd>Espaco</kbd>
        </button>

        {seed !== undefined ? (
          <p className="card__note">Seed {seed}: esta partida vai ser sempre a mesma.</p>
        ) : null}

        <dl className="controls">
          {CONTROLS.map(([keys, action]) => (
            <div className="controls__row" key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Overlay>
  );
}
