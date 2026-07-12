import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../types.ts';
import { DIFFICULTY_CONFIG, isDifficulty } from './config.ts';
import { validateScoreInput } from './validation.ts';

describe('difficulty config', () => {
  it('keeps pair count and theoretical minimum moves aligned', () => {
    expect(DIFFICULTY_CONFIG[Difficulty.EASY].pairCount).toBe(6);
    expect(DIFFICULTY_CONFIG[Difficulty.NORMAL].pairCount).toBe(8);
    expect(DIFFICULTY_CONFIG[Difficulty.EASY].minMoves).toBe(6);
    expect(DIFFICULTY_CONFIG[Difficulty.NORMAL].minMoves).toBe(8);
  });

  it('accepts only supported difficulties', () => {
    expect(isDifficulty('EASY')).toBe(true);
    expect(isDifficulty('NORMAL')).toBe(true);
    expect(isDifficulty('HARD')).toBe(false);
  });
});

describe('validateScoreInput', () => {
  it('normalizes and accepts a valid score', () => {
    expect(validateScoreInput({
      player_name: '  Bob  ',
      difficulty: Difficulty.EASY,
      moves: 10,
      time_taken: 30,
    })).toEqual({
      success: true,
      data: {
        player_name: 'Bob',
        difficulty: Difficulty.EASY,
        moves: 10,
        time_taken: 30,
      },
    });
  });

  it.each([
    [{}, '플레이어 이름'],
    [{ player_name: '1234567890123', difficulty: 'EASY', moves: 6, time_taken: 10 }, '플레이어 이름'],
    [{ player_name: 'Anonymous', difficulty: 'EASY', moves: 6, time_taken: 10 }, '사용할 수 없는'],
    [{ player_name: 'Bob', difficulty: 'HARD', moves: 6, time_taken: 10 }, '난이도'],
    [{ player_name: 'Bob', difficulty: 'EASY', moves: 1, time_taken: 10 }, '이동 횟수'],
    [{ player_name: 'Bob', difficulty: 'EASY', moves: 6.5, time_taken: 10 }, '이동 횟수'],
    [{ player_name: 'Bob', difficulty: 'EASY', moves: 6, time_taken: 0 }, '플레이 시간'],
  ])('rejects invalid score input %#', (input, message) => {
    const result = validateScoreInput(input);
    expect(result.success).toBe(false);
    if (result.success === false) expect(result.error).toContain(message);
  });
});
