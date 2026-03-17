import type { FlagItem } from '../data/flags';
import type { Round } from './types';

const RECENT_CORRECT_HISTORY = 3;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function pickDistinctItems<T>(source: T[], count: number): T[] {
  return shuffle(source).slice(0, count);
}

export function generateRound(
  flags: FlagItem[],
  recentCorrectIds: string[],
  choiceCount: number
): { round: Round; nextHistory: string[] } {
  if (choiceCount < 3) {
    throw new Error('Need at least 3 choices in a round.');
  }

  if (flags.length < choiceCount) {
    throw new Error(`Need at least ${choiceCount} flags to generate a round.`);
  }

  const notRecentlyUsed = flags.filter((flag) => !recentCorrectIds.includes(flag.id));
  const pool = notRecentlyUsed.length > 0 ? notRecentlyUsed : flags;

  const correct = pool[randomInt(pool.length)];
  const incorrectPool = flags.filter((flag) => flag.id !== correct.id);
  const incorrect = pickDistinctItems(incorrectPool, choiceCount - 1);

  const choices = shuffle([correct, ...incorrect]);
  const nextHistory = [...recentCorrectIds, correct.id].slice(-RECENT_CORRECT_HISTORY);

  return {
    round: { correct, choices },
    nextHistory
  };
}
