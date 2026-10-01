/**
 * src/main.tsx — O UNICO LUGAR QUE MONTA O REACT.
 *
 * Decisao de arquitetura (GAME_DESIGN_CONTEXT_ARQUITETURA.md, secao 1):
 *   "Se um arquivo em src/game/ importa react, a arquitetura esta errada."
 * O corollary e o inverso, e vale para este arquivo: ele nao sabe NADA de regra.
 * Le a URL (parametros de reproducao), monta a arvore e sai. Quem decide alguma coisa
 * e o dominio, depois, via `send`.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { resetGame, setRunSeed, setSelectedAvatar } from './engine/store';
import { readUrlOptions } from './ui/urlOptions';
import './ui/ui.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('main: #root nao existe em index.html — a arvore do React nao tem onde montar.');
}

const options = readUrlOptions(window.location.search);

// `?seed=1234` reexecuta exatamente a mesma partida (Lente #29 — reproduzibilidade).
// `?reset=1` recomeca do zero e `?avatar=luna` pre-seleciona quem vai jogar.
setRunSeed(options.seed);
if (options.avatar) setSelectedAvatar(options.avatar);
if (options.reset) resetGame();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
