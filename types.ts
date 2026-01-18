
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM'
}

export interface Card {
  id: number;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
  pairId: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  moves: number;
  time: number;
  difficulty: Difficulty;
  date: string;
}

export interface GameState {
  cards: Card[];
  flippedIndices: number[];
  moves: number;
  matches: number;
  status: 'IDLE' | 'PREVIEW' | 'PLAYING' | 'WON';
  difficulty: Difficulty;
  bestScore: number;
}
