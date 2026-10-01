/**
 * src/ui/urlOptions.ts — A URL E A CONSOLE DO JOGO (Lentes #29, #22).
 *
 * `?seed=1234`    a mesma partida, o mesmo mundo, sempre igual
 * `?reset=1`      recomeca do zero em vez de retomar o estado anterior
 * `?avatar=luna`  pre-seleciona quem vai jogar
 *
 * Sao parametros de REPRODUTIBILIDADE, nao de configuracao. Um bug que so aparece na
 * terceira partida e um bug que ninguem consegue reproduzir depois — e um bug que nao
 * se conserta.
 */
import type { AvatarId } from '../game';

export interface UrlOptions {
  seed: number | undefined;
  avatar: AvatarId | undefined;
  reset: boolean;
}

const AVATARS: readonly AvatarId[] = ['solaris', 'luna'];

function toInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function readUrlOptions(search: string): UrlOptions {
  const params = new URLSearchParams(search);
  const avatar = params.get('avatar');
  return {
    seed: toInt(params.get('seed')),
    // `.find` devolve `undefined` para qualquer valor fora da lista: entrada invalida
    // nao pode virar um avatar que o dominio nunca conheceu.
    avatar: AVATARS.find((id) => id === avatar),
    reset: params.get('reset') === '1',
  };
}
