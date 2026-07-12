// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Difficulty, type LeaderboardEntry } from '../types.ts';
import LeaderboardModal from './LeaderboardModal.tsx';

afterEach(cleanup);

const entries: LeaderboardEntry[] = Array.from({ length: 9 }, (_, index) => ({
  id: String(index + 1),
  name: `Player ${index + 1}`,
  moves: index + 10,
  time: index + 20,
  difficulty: Difficulty.EASY,
  date: '2026-07-12',
}));

describe('LeaderboardModal', () => {
  it('keeps entries below rank 7 available inside the scroll area', () => {
    render(
      <LeaderboardModal
        entries={entries}
        activeTab={Difficulty.EASY}
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Player 7')).toBeTruthy();
    expect(screen.getByText('Player 8')).toBeTruthy();
    expect(screen.getByText('Player 9')).toBeTruthy();
    expect(screen.getByTestId('leaderboard-scroll-area').className).toContain('max-h-[420px]');
    expect(screen.getByTestId('leaderboard-scroll-area').className).toContain('overflow-auto');
  });
});
