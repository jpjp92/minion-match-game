import { Difficulty } from '../../types.ts';
import { DIFFICULTY_CONFIG, isDifficulty } from './config.ts';

export interface ScoreInput {
  player_name: string;
  difficulty: Difficulty;
  moves: number;
  time_taken: number;
}

export type ScoreValidationResult =
  | { success: true; data: ScoreInput }
  | { success: false; error: string };

export const normalizePlayerName = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const validateScoreInput = (value: unknown): ScoreValidationResult => {
  if (!value || typeof value !== 'object') {
    return { success: false, error: '요청 본문이 올바르지 않습니다.' };
  }

  const input = value as Record<string, unknown>;
  const playerName = normalizePlayerName(input.player_name);

  if (playerName.length < 2 || playerName.length > 12) {
    return { success: false, error: '플레이어 이름은 2자 이상 12자 이하여야 합니다.' };
  }

  if (playerName.toLowerCase() === 'anonymous') {
    return { success: false, error: '사용할 수 없는 플레이어 이름입니다.' };
  }

  if (!isDifficulty(input.difficulty)) {
    return { success: false, error: '지원하지 않는 난이도입니다.' };
  }

  const config = DIFFICULTY_CONFIG[input.difficulty];
  const moves = input.moves;
  const timeTaken = input.time_taken;

  if (!Number.isInteger(moves) || (moves as number) < config.minMoves || (moves as number) > config.maxMoves) {
    return { success: false, error: '이동 횟수가 허용 범위를 벗어났습니다.' };
  }

  if (!Number.isInteger(timeTaken) || (timeTaken as number) < 1 || (timeTaken as number) > config.maxTimeSeconds) {
    return { success: false, error: '플레이 시간이 허용 범위를 벗어났습니다.' };
  }

  return {
    success: true,
    data: {
      player_name: playerName,
      difficulty: input.difficulty,
      moves: moves as number,
      time_taken: timeTaken as number,
    },
  };
};
