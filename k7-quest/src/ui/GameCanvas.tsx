/**
 * src/ui/GameCanvas.tsx — O MUNDO (e nada mais).
 *
 * O canvas e a unica parte do jogo que nao e DOM. Ele nao tem estado proprio: a cena
 * `PlatformerScene` LE `getGameState()` a cada quadro (modelo de PULL, ver store.ts) e
 * desenha. Este componente cria e destroi a `Phaser.Game` — e so isso.
 *
 * Repare o que NAO esta aqui: nenhum `setState` por quadro, nenhuma regra, nenhum
 * input. O HUD e DOM e vive em outro arquivo (Lente #48: DOM e legivel por padrao).
 */
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PlatformerScene } from '../engine/phaser/PlatformerScene';

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: '#0d1b0e',
      scale: {
        // RESIZE: o canvas acompanha o elemento, e nao o contrario. Assim o mesmo
        // codigo funciona em monitor, celular e janela dividida.
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
      // Pixel art sem suavizacao e com pixels travados (Lente #58).
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scene: [PlatformerScene],
    });

    return () => {
      // `true` remove o canvas do DOM. Sem isto, o duplo mount do StrictMode deixa
      // dois canvas empilhados e o jogador ve o mundo duplicado.
      game.destroy(true);
    };
  }, []);

  // O mundo e inerte para leitores de tela: quem narra o jogo e o HUD, nao o canvas.
  return <div className="canvas-host" ref={hostRef} aria-hidden="true" />;
}
