import { Difficulty } from '../../types.ts';

export interface DifficultyConfig {
  pairCount: number;
  minMoves: number;
  maxMoves: number;
  maxTimeSeconds: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: {
    pairCount: 6,
    minMoves: 6,
    maxMoves: 1000,
    maxTimeSeconds: 86400,
  },
  [Difficulty.NORMAL]: {
    pairCount: 8,
    minMoves: 8,
    maxMoves: 1000,
    maxTimeSeconds: 86400,
  },
};

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && Object.values(Difficulty).includes(value as Difficulty);

