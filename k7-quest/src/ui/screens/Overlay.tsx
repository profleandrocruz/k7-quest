/**
 * src/ui/screens/Overlay.tsx — A BASE DE TODA TELHA CHEIA.
 *
 * Dois cuidados que existem por MOTIVO, nao por estilo:
 *
 * 1. O foco vai para o CONTAINER, nunca para um botao. `useInput` ignora as teclas de
 *    jogo quando o foco esta num `button`/`input` (acessibilidade primeiro, Lente #48),
 *    e um overlay focado num botao deixaria Esc preso nao fechando a pausa. Com o
 *    container focado, os atalhos continuam funcionando E o leitor de tela anuncia a tela.
 *
 * 2. `role="dialog"` + `aria-modal`: quem nao ve a tela precisa saber que o jogo
 *    CONTINUA rodando atras dela. Isso e verdade — por isso o texto diz isso.
 */
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export type OverlayVariant = 'center' | 'bottom';

interface OverlayProps {
  /** Nome da tela para leitores de tela. Descreva a TELA, nao o botao. */
  label: string;
  /** O que Escape faz nesta tela. Ausente = nesta tela, Escape nao faz nada. */
  onEscape?: () => void;
  variant?: OverlayVariant;
  children: ReactNode;
}

export default function Overlay({ label, onEscape, variant = 'center', children }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Só interessa quando o foco caiu num botao (aí `useInput` ja teria recusado).
    // `stopPropagation` evita que o tratador da janela trate o Escape uma segunda vez.
    if (event.key !== 'Escape' || !onEscape) return;
    event.preventDefault();
    event.stopPropagation();
    onEscape();
  };

  return (
    <div
      ref={ref}
      className="overlay"
      data-variant={variant}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
