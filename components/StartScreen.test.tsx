// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { Difficulty } from '../types.ts';
import StartScreen from './StartScreen.tsx';

afterEach(cleanup);

const setup = (overrides: Partial<ComponentProps<typeof StartScreen>> = {}) => {
  const props: ComponentProps<typeof StartScreen> = {
    playerName: '',
    isReady: true,
    onPlayerNameChange: vi.fn(),
    onStart: vi.fn(),
    onShowLeaderboard: vi.fn(),
    ...overrides,
  };
  render(<StartScreen {...props} />);
  return props;
};

describe('StartScreen', () => {
  it('requires a nickname before entering the game', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /easy/i }));
    expect(screen.getByRole('alert').textContent).toContain('닉네임을 2자 이상 입력해주세요.');
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it('starts with the selected difficulty after a nickname is registered', async () => {
    const user = userEvent.setup();
    const props = setup({ playerName: 'Kevin' });
    await user.click(screen.getByRole('button', { name: /normal/i }));
    expect(props.onStart).toHaveBeenCalledWith(Difficulty.NORMAL);
  });

  it('does not allow the reserved Anonymous display name', async () => {
    const user = userEvent.setup();
    const props = setup({ playerName: 'Anonymous' });
    await user.click(screen.getByRole('button', { name: /easy/i }));
    expect(screen.getByRole('alert').textContent).toContain('다른 닉네임을 입력해주세요.');
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it('keeps difficulty actions disabled while images are loading', () => {
    setup({ isReady: false });
    expect((screen.getByRole('button', { name: /easy/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /normal/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Preparing Minions...').textContent).toBe('Preparing Minions...');
  });

  it('surfaces an image loading failure with a retry action instead of waiting forever', async () => {
    const user = userEvent.setup();
    const onRetryLoad = vi.fn();
    setup({ isReady: false, loadError: '게임 이미지를 불러오지 못했습니다. 다시 시도해 주세요.', onRetryLoad });
    expect(screen.queryByText('Preparing Minions...')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('게임 이미지를 불러오지 못했습니다.');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetryLoad).toHaveBeenCalledOnce();
  });

  it('opens the hall of fame independently from game entry', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /view hall of fame/i }));
    expect(props.onShowLeaderboard).toHaveBeenCalledOnce();
  });
});
