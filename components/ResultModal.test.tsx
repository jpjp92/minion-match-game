// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResultModal from './ResultModal.tsx';

afterEach(cleanup);

const setup = (saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'saved') => {
  const callbacks = {
    onPlayAgain: vi.fn(),
    onShowLeaderboard: vi.fn(),
    onBackToMenu: vi.fn(),
  };
  render(<ResultModal moves={10} time={18} playerName="Kevin" saveStatus={saveStatus} {...callbacks} />);
  return callbacks;
};

describe('ResultModal', () => {
  it('shows the completed score and all next actions', () => {
    setup();
    expect(screen.getByText('10').textContent).toBe('10');
    expect(screen.getByText('18s').textContent).toBe('18s');
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hall of Fame/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Menu' })).toBeTruthy();
  });

  it('routes each action independently', async () => {
    const user = userEvent.setup();
    const callbacks = setup();
    await user.click(screen.getByRole('button', { name: 'Play Again' }));
    await user.click(screen.getByRole('button', { name: /Hall of Fame/ }));
    await user.click(screen.getByRole('button', { name: 'Back to Menu' }));
    expect(callbacks.onPlayAgain).toHaveBeenCalledOnce();
    expect(callbacks.onShowLeaderboard).toHaveBeenCalledOnce();
    expect(callbacks.onBackToMenu).toHaveBeenCalledOnce();
  });

  it('blocks navigation while the score is saving', () => {
    setup('saving');
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.getByText('Saving your record...').textContent).toBe('Saving your record...');
  });
});
