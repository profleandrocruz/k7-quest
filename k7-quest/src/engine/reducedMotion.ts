/**
 * src/engine/reducedMotion.ts — A PREFERENCIA DO JOGADOR VEM ANTES DO JUICE (Lente #48).
 *
 * "Juicy nao pode virar hostil": camera com suavizacao, shake e flash sao maravilhosos
 * para quem tolera e insuportaveis para quem tem sensibilidade a movimento.
 *
 * Fica num modulo proprio (e nao dentro do hook React) porque as DUAS camadas precisam
 * disto: o DOM (CSS/transicoes) e o canvas (camera). Uma implementacao, dois consumos.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

/** Assina mudancas da preferencia (o jogador pode mudar no meio da partida). */
export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const media = window.matchMedia(QUERY);
  const handler = (): void => listener(media.matches);
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
