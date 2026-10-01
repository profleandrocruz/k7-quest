/**
 * src/App.tsx — O MONTADOR: LIGA O MOTOR AO JOGO E ESCOLHE A TELA PELA FASE.
 *
 * Este arquivo e propositalmente pequeno. Ele nao decide nada de regra e nao guarda
 * estado de jogo; faz tres coisas e pronto (Lente #42 — simplicidade):
 *   1. liga o motor (input, loop, preferencia de movimento);
 *   2. resolve o unico estado que a propria aplicacao precisa resolver (`boot`);
 *   3. escolhe a TELA a partir de UM campo: `phase` (Lente #60 — modo explicito).
 *
 * Repare que nao existe `isPlaying`/`isMenu`/`isPaused`: uma unica fase decide a tela
 * inteira, e por consequencia nao existe estado impossivel de representar.
 */
import { useEffect, useRef } from 'react';
import { useGameLoop } from './engine/useGameLoop';
import { useInput } from './engine/useInput';
import { usePrefersReducedMotion } from './engine/usePrefersReducedMotion';
import { send, useHudStore } from './engine/store';
import DialogueBox from './ui/screens/DialogueBox';
import EndScreen from './ui/screens/EndScreen';
import PauseOverlay from './ui/screens/PauseOverlay';
import SelectMenu from './ui/screens/SelectMenu';
import TitleScreen from './ui/screens/TitleScreen';
import GameCanvas from './ui/GameCanvas';
import Hud from './ui/Hud';
import type { GamePhase } from './game';

/** Fases em que o MUNDO esta a vista: o HUD so aparece quando ha algo para ler. */
const WORLD_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'playing',
  'dialogue',
  'bossIntro',
  'cutscene',
  'paused',
]);

export default function App() {
  const phase = useHudStore((s) => s.hud.phase);
  const running = useHudStore((s) => s.running);
  const reducedMotion = usePrefersReducedMotion();

  // Ordem importa: o motor e do APP e vale para qualquer tela que ele mostre.
  useInput();
  useGameLoop(running);

  // `boot` e o unico estado que o app resolve sozinho: o mundo ja esta montado em
  // `createInitialState`, entao o unico trabalho e abrir o titulo. E idempotente,
  // e por isso sobrevive ao duplo mount do StrictMode sem mandar BOOT_DONE duas vezes.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    send({ type: 'BOOT_DONE' });
  }, []);

  // A preferencia vive no elemento raiz: o CSS do documento e o canvas (que le
  // `reducedMotion.ts`) precisam dos DOIS ler a mesma fonte (Lente #48).
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  // Foco: um menu usa botao, e `useInput` ignora teclas de jogo quando o foco esta
  // num controle de formulario. Ao voltar ao jogo, o foco tem que SAIR do menu, senao
  // as setas continuam "digitando" no botao e o personagem nao anda.
  useEffect(() => {
    if (!WORLD_PHASES.has(phase)) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.overlay')) active.blur();
  }, [phase]);

  return (
    <div className="app" data-phase={phase}>
      <GameCanvas />
      {WORLD_PHASES.has(phase) ? <Hud /> : null}
      <Overlay phase={phase} />
    </div>
  );
}

/**
 * A tela vem da FASE. Um `switch` — e nao uma pilha de booleanos — porque assim
 * "titulo e pausa ao mesmo tempo" e um estado que nao pode nem ser escrito.
 */
function Overlay({ phase }: { phase: GamePhase }) {
  switch (phase) {
    case 'title':
    case 'avatarSelect':
      return <TitleScreen />;
    case 'paused':
      return <PauseOverlay />;
    case 'tapeSelect':
      return <SelectMenu mode="tape" />;
    case 'eraSelect':
      return <SelectMenu mode="era" />;
    case 'dialogue':
      return <DialogueBox />;
    case 'gameOver':
    case 'levelComplete':
    case 'ending':
      return <EndScreen />;
    default:
      return null;
  }
}
