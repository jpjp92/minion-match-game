import { describe, expect, it } from 'vitest';
import { Difficulty } from '../types.ts';
import { createBoard } from './gameUtils.ts';

const images = Array.from({ length: 10 }, (_, index) => `/images/${index + 1}.jpg`);

describe('createBoard', () => {
  it.each([
    [Difficulty.EASY, 6],
    [Difficulty.NORMAL, 8],
  ])('creates two cards for every pair in %s', (difficulty, pairCount) => {
    const board = createBoard(difficulty, images);
    const pairs = new Map<number, string[]>();

    for (const card of board) {
      const pair = pairs.get(card.pairId) ?? [];
      pair.push(card.image);
      pairs.set(card.pairId, pair);
      expect(card.isFlipped).toBe(false);
      expect(card.isMatched).toBe(false);
    }

    expect(board).toHaveLength(pairCount * 2);
    expect(new Set(board.map(card => card.id)).size).toBe(board.length);
    expect(pairs.size).toBe(pairCount);
    for (const pair of pairs.values()) {
      expect(pair).toHaveLength(2);
      expect(pair[0]).toBe(pair[1]);
    }
  });

  it('does not mutate the source image pool', () => {
    const original = [...images];
    createBoard(Difficulty.EASY, images);
    expect(images).toEqual(original);
  });
});
