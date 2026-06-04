import type { Items } from '../types';
import { itemsKey } from './items';

export type ConditionKeyArgs = {
  character: string;
  skill: number;
  terminal: string;
  items: Items;
};

export function conditionKey({ character, skill, terminal, items }: ConditionKeyArgs): string {
  return `${character.trim()}|${skill}|${terminal.trim()}|${itemsKey(items)}`;
}

export function conditionLabel({ character, skill, terminal }: Omit<ConditionKeyArgs, 'items'>): string {
  const name = character.trim() || 'Unknown';
  const term = terminal.trim();
  return term ? `${name} - SL${skill} - ${term}` : `${name} - SL${skill}`;
}
