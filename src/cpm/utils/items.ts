import type { Items } from '../types';

export const DEFAULT_ITEMS: Items = {
  score: false,
  coin: true,
  exp: false,
  timeItem: false,
  bomb: false,
  fivetofour: true,
};

export function normalizeItems(input?: Partial<Items>): Items {
  return {
    score: Boolean(input?.score),
    coin: input?.coin === undefined ? DEFAULT_ITEMS.coin : Boolean(input?.coin),
    exp: Boolean(input?.exp),
    timeItem: Boolean(input?.timeItem),
    bomb: Boolean(input?.bomb),
    fivetofour: input?.fivetofour === undefined ? DEFAULT_ITEMS.fivetofour : Boolean(input?.fivetofour),
  };
}

export function itemsKey(items: Items): string {
  return `S${items.score ? 1 : 0}C${items.coin ? 1 : 0}E${items.exp ? 1 : 0}T${items.timeItem ? 1 : 0}B${items.bomb ? 1 : 0}F${items.fivetofour ? 1 : 0}`;
}

export function itemsLabel(items: Items): string[] {
  const names: string[] = [];
  if (items.score) names.push('Score');
  if (items.coin) names.push('Coin');
  if (items.exp) names.push('Exp');
  if (items.timeItem) names.push('Time');
  if (items.bomb) names.push('Bomb');
  if (items.fivetofour) names.push('5-4');
  return names.length ? names : ['None'];
}
