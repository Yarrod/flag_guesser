import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateRound } from './rounds';
import type { FlagItem } from '../data/flags';

function makeFlag(id: string): FlagItem {
  return {
    id,
    czechName: `CZ ${id}`,
    englishName: `EN ${id}`,
    imagePath: `/flags/${id}.png`,
    audioPath: `/audio/names/${id}.mp3`,
    audioPathEn: `/audio/names-en/${id}.mp3`
  };
}

const TEST_FLAGS = ['aa', 'bb', 'cc', 'dd', 'ee'].map(makeFlag);

describe('generateRound', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires at least three choices', () => {
    expect(() => generateRound(TEST_FLAGS, [], 2)).toThrow('Need at least 3 choices in a round.');
  });

  it('requires enough flags for the requested choice count', () => {
    expect(() => generateRound(TEST_FLAGS.slice(0, 2), [], 3)).toThrow(
      'Need at least 3 flags to generate a round.'
    );
  });

  it('avoids recently used correct flags when alternatives exist', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const { round } = generateRound(TEST_FLAGS, ['aa'], 3);

    expect(round.correct.id).toBe('bb');
  });

  it('includes the correct flag exactly once and keeps choices distinct', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const { round } = generateRound(TEST_FLAGS, [], 3);
    const choiceIds = round.choices.map((choice) => choice.id);

    expect(choiceIds).toHaveLength(3);
    expect(new Set(choiceIds).size).toBe(3);
    expect(choiceIds.filter((id) => id === round.correct.id)).toHaveLength(1);
  });

  it('trims history to the last three correct answers', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const { round, nextHistory } = generateRound(TEST_FLAGS.slice(0, 4), ['aa', 'bb', 'cc'], 3);

    expect(round.correct.id).toBe('dd');
    expect(nextHistory).toEqual(['bb', 'cc', 'dd']);
  });
});
