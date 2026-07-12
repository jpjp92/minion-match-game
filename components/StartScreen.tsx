'use client';

import { useState } from 'react';
import { Difficulty } from '../types.ts';

interface StartScreenProps {
  playerName: string;
  isReady: boolean;
  onPlayerNameChange: (name: string) => void;
  onStart: (difficulty: Difficulty) => void;
  onShowLeaderboard: () => void;
}

const StartScreen = ({
  playerName,
  isReady,
  onPlayerNameChange,
  onStart,
  onShowLeaderboard,
}: StartScreenProps) => {
  const [error, setError] = useState('');

  const handleStart = (difficulty: Difficulty) => {
    const normalizedName = playerName.trim();
    if (normalizedName.length < 2) {
      setError('닉네임을 2자 이상 입력해주세요.');
      return;
    }
    if (normalizedName.toLowerCase() === 'anonymous') {
      setError('다른 닉네임을 입력해주세요.');
      return;
    }
    if (!isReady) return;
    setError('');
    onStart(difficulty);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#f8f5f2] via-[#f5f1ed] to-[#ece9e6] px-4 py-8 text-[#152844] sm:px-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-yellow-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col items-center justify-center">
        <header className="mb-9 text-center sm:mb-12">
          <div className="mb-5 inline-block border-b-2 border-blue-600 pb-1 text-xs font-black uppercase tracking-[0.42em] text-blue-600 sm:text-sm">
            Memory Game
          </div>
          <h1 className="font-fredoka text-5xl font-black leading-none tracking-tight drop-shadow-sm sm:text-7xl lg:text-8xl">
            <span className="text-blue-600">Minion</span>{' '}
            <span className="text-yellow-500">Match</span>
          </h1>
          <p className="mt-5 font-serif text-lg italic text-stone-500 sm:text-xl">Choose your challenge</p>
        </header>

        <section className="w-full max-w-xl">
          <label htmlFor="player-name" className="mb-2 block text-center text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Nickname
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(event) => {
              onPlayerNameChange(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleStart(Difficulty.EASY);
            }}
            placeholder="Enter Nickname"
            maxLength={12}
            autoComplete="nickname"
            autoFocus
            aria-describedby={error ? 'player-name-error' : undefined}
            aria-invalid={Boolean(error)}
            className="w-full rounded-2xl border-2 border-stone-200 bg-white/80 px-5 py-4 text-center text-lg font-bold text-[#152844] shadow-sm outline-none transition-all placeholder:text-stone-300 focus:border-blue-500 focus:bg-white focus:shadow-md sm:text-xl"
          />
          <div className="min-h-7 pt-2 text-center">
            {error && <p id="player-name-error" role="alert" className="text-sm font-bold text-red-500">{error}</p>}
            {!error && !isReady && <p className="text-sm font-bold text-stone-400">Preparing Minions...</p>}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleStart(Difficulty.EASY)}
              disabled={!isReady}
              className="group rounded-2xl border-b-4 border-yellow-600 bg-yellow-400 px-5 py-5 text-[#152844] transition-all hover:brightness-105 active:translate-y-1 active:border-b-0 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-4">
                <span className="text-4xl transition-transform group-hover:scale-110">🍌</span>
                <span className="flex flex-col items-start">
                  <span className="text-xl font-black uppercase leading-none">Easy</span>
                  <span className="mt-1 text-xs font-bold uppercase tracking-wide text-[#152844]/70">12 Cards</span>
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStart(Difficulty.NORMAL)}
              disabled={!isReady}
              className="group rounded-2xl border-b-4 border-yellow-600 bg-yellow-400 px-5 py-5 text-[#152844] transition-all hover:brightness-105 active:translate-y-1 active:border-b-0 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-4">
                <span className="text-4xl transition-transform group-hover:scale-110">👓</span>
                <span className="flex flex-col items-start">
                  <span className="text-xl font-black uppercase leading-none">Normal</span>
                  <span className="mt-1 text-xs font-bold uppercase tracking-wide text-[#152844]/70">16 Cards</span>
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onShowLeaderboard}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#152844] px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-900/15 transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <span>🏆</span>
            <span>View Hall of Fame</span>
          </button>
        </section>
      </div>
    </main>
  );
};

export default StartScreen;
