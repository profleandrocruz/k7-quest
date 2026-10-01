/**
 * src/engine/usePrefersReducedMotion.ts — a preferencia, disponivel para o React.
 * Ver `reducedMotion.ts` para a implementacao compartilhada com o canvas.
 */
import { useEffect, useState } from 'react';
import { onReducedMotionChange, prefersReducedMotion } from './reducedMotion';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const unsubscribe = onReducedMotionChange(setReduced);
    setReduced(prefersReducedMotion());
    return unsubscribe;
  }, []);

  return reduced;
}
