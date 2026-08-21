
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameState, LeaderboardEntry } from './types.ts';
import { createBoard, fetchAvailableImages, preloadImages } from './utils/gameUtils.ts';
import { fetchWithTimeout } from './lib/http.ts';
import Card from './components/Card.tsx';
import StartScreen from './components/StartScreen.tsx';
import LeaderboardModal from './components/LeaderboardModal.tsx';
import ResultModal from './components/ResultModal.tsx';

const MATCH_RESOLUTION_DELAY_MS = 220;
const MISMATCH_RESET_DELAY_MS = 600;

const readBestScore = (difficulty: Difficulty): number => {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(`bestScore_${difficulty}`)) || 0;
};

const App: React.FC = () => {
  const [imagePool, setImagePool] = useState<string[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [previewTimer, setPreviewTimer] = useState(5);

  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    flippedIndices: [],
    moves: 0,
    matches: 0,
    status: 'IDLE',
    difficulty: Difficulty.EASY,
    bestScore: readBestScore(Difficulty.EASY),
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<Difficulty>(Difficulty.EASY);
  const [playerName, setPlayerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const previewIntervalRef = useRef<number | null>(null);
  const resolutionTimeoutRef = useRef<number | null>(null);
  const savedScoreKeyRef = useRef<string | null>(null);

  const loadAssets = useCallback(async () => {
    setIsLoadingPool(true);
    setPoolError(null);
    const images = await fetchAvailableImages();
    setImagePool(images);
    setPoolError(images.length === 0 ? '게임 이미지를 불러오지 못했습니다. 다시 시도해 주세요.' : null);
    setIsLoadingPool(false);
  }, []);

  useEffect(() => {
    const savedPlayerName = window.localStorage.getItem('minion_player_name');
    if (savedPlayerName && savedPlayerName.toLowerCase() !== 'anonymous') setPlayerName(savedPlayerName.slice(0, 12));

    void loadAssets();
    
    const loadScores = async () => {
      try {
        const response = await fetchWithTimeout('/api/scores');
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(`HTTP ${response.status}${body?.reason ? ` (${body.reason})` : ''}`);
        }

        const data: any[] = await response.json();
        if (Array.isArray(data)) {
          const entries: LeaderboardEntry[] = data.map(row => ({
            id: row.id.toString(),
            name: row.player_name,
            difficulty: row.difficulty as Difficulty,
            moves: row.moves,
            time: row.time_taken,
            date: new Date(row.created_at).toLocaleDateString()
          })).filter(entry => entry.name && entry.name.toLowerCase() !== 'anonymous');
          setLeaderboard(entries);
          localStorage.setItem('minion_leaderboard', JSON.stringify(entries));
          return;
        }
      } catch (e) {
        console.warn('Failed to load from API, falling back to local storage', e);
      }
      
      try {
        const saved = localStorage.getItem('minion_leaderboard');
        if (saved) {
          const entries = JSON.parse(saved) as LeaderboardEntry[];
          setLeaderboard(entries.filter(entry => entry.name && entry.name.toLowerCase() !== 'anonymous'));
        }
      } catch (e) {
        console.warn('Failed to parse local leaderboard', e);
      }
    };
    loadScores();
  }, [loadAssets]);

  const clearGameTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (previewIntervalRef.current !== null) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    if (resolutionTimeoutRef.current !== null) {
      clearTimeout(resolutionTimeoutRef.current);
      resolutionTimeoutRef.current = null;
    }
  }, []);

  const startActualGame = useCallback(() => {
    clearGameTimers();
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    setTimer(0);
    timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
  }, [clearGameTimers]);

  const initGame = useCallback(async (difficulty: Difficulty = gameState.difficulty) => {
    if (imagePool.length === 0) return;

    setIsGameLoading(true);
    clearGameTimers();
    setIsProcessing(false);
    setSaveStatus('idle');
    savedScoreKeyRef.current = null;

    const newCards = createBoard(difficulty, imagePool);
    const imageUrls = Array.from(new Set(newCards.map(c => c.image)));
    await preloadImages(imageUrls);

    setGameState({
      cards: newCards,
      flippedIndices: [],
      moves: 0,
      matches: 0,
      status: 'PREVIEW',
      difficulty,
      bestScore: readBestScore(difficulty)
    });

    setPreviewTimer(5);
    setIsGameLoading(false);

    previewIntervalRef.current = window.setInterval(() => {
      setPreviewTimer(t => {
        if (t <= 1) {
          if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
          startActualGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [clearGameTimers, gameState.difficulty, imagePool, startActualGame]);

  const startFromMenu = useCallback((difficulty: Difficulty) => {
    const normalizedName = playerName.trim();
    if (!normalizedName || imagePool.length === 0 || isGameLoading) return;
    window.localStorage.setItem('minion_player_name', normalizedName);
    setPlayerName(normalizedName);
    void initGame(difficulty);
  }, [imagePool.length, initGame, isGameLoading, playerName]);

  const handleCardClick = useCallback((index: number) => {
    if (isProcessing || gameState.status !== 'PLAYING') return;

    setGameState(prev => {
      if (prev.cards[index].isFlipped || prev.cards[index].isMatched) return prev;

      const updatedCards = [...prev.cards];
      updatedCards[index] = { ...updatedCards[index], isFlipped: true };
      const newFlipped = [...prev.flippedIndices, index];

      if (newFlipped.length === 2) {
        setIsProcessing(true);
        const [firstIdx, secondIdx] = newFlipped;
        const isMatch = updatedCards[firstIdx].pairId === updatedCards[secondIdx].pairId;
        const nextMoves = prev.moves + 1;

        if (isMatch) {
          resolutionTimeoutRef.current = window.setTimeout(() => {
            resolutionTimeoutRef.current = null;
            setGameState(current => {
              const matchedCards = [...current.cards];
              matchedCards[firstIdx] = { ...matchedCards[firstIdx], isMatched: true };
              matchedCards[secondIdx] = { ...matchedCards[secondIdx], isMatched: true };
              const nextMatches = current.matches + 1;
              const totalPairs = current.cards.length / 2;
              const hasWon = nextMatches === totalPairs;
              if (hasWon && timerRef.current) clearInterval(timerRef.current);

              setIsProcessing(false);
              return {
                ...current,
                cards: matchedCards,
                flippedIndices: [],
                matches: nextMatches,
                status: hasWon ? 'WON' : 'PLAYING',
                bestScore: hasWon ? updateBestScore(nextMoves, current.difficulty) : current.bestScore
              };
            });
          }, MATCH_RESOLUTION_DELAY_MS);
        } else {
          resolutionTimeoutRef.current = window.setTimeout(() => {
            resolutionTimeoutRef.current = null;
            setGameState(current => {
              const resetCards = [...current.cards];
              resetCards[firstIdx] = { ...resetCards[firstIdx], isFlipped: false };
              resetCards[secondIdx] = { ...resetCards[secondIdx], isFlipped: false };
              setIsProcessing(false);
              return { ...current, cards: resetCards, flippedIndices: [] };
            });
          }, MISMATCH_RESET_DELAY_MS);
        }
        return { ...prev, cards: updatedCards, flippedIndices: newFlipped, moves: nextMoves };
      }
      return { ...prev, cards: updatedCards, flippedIndices: newFlipped };
    });
  }, [isProcessing, gameState.status]);

  const updateBestScore = (score: number, difficulty: Difficulty): number => {
    const key = `bestScore_${difficulty}`;
    if (typeof window === 'undefined') return score;
    const currentBest = Number(window.localStorage.getItem(key)) || 0;
    if (score < currentBest || currentBest === 0) {
      window.localStorage.setItem(key, score.toString());
      return score;
    }
    return currentBest;
  };

  useEffect(() => {
    return clearGameTimers;
  }, [clearGameTimers]);

  const backToMenu = useCallback(() => {
    clearGameTimers();
    setIsProcessing(false);
    setSaveStatus('idle');
    setGameState(prev => ({ ...prev, status: 'IDLE', flippedIndices: [] }));
  }, [clearGameTimers]);

  const saveToLeaderboard = useCallback(async () => {
    const normalizedName = playerName.trim();
    if (!normalizedName || isSaving) return;

    const scoreKey = `${normalizedName}:${gameState.difficulty}:${gameState.moves}:${timer}`;
    if (savedScoreKeyRef.current === scoreKey) return;
    savedScoreKeyRef.current = scoreKey;
    setIsSaving(true);
    setSaveStatus('saving');
    let cloudSaveFailed = false;

    let savedEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: normalizedName,
      moves: gameState.moves,
      time: timer,
      difficulty: gameState.difficulty,
      date: new Date().toLocaleDateString()
    };
    
    try {
      const response = await fetchWithTimeout('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: normalizedName,
          difficulty: gameState.difficulty,
          moves: gameState.moves,
          time_taken: timer,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(`HTTP ${response.status}${body?.reason ? ` (${body.reason})` : ''}${body?.error ? `: ${body.error}` : ''}`);
      }
      const row = await response.json();
      savedEntry = {
        id: String(row.id),
        name: row.player_name,
        difficulty: row.difficulty as Difficulty,
        moves: row.moves,
        time: row.time_taken,
        date: new Date(row.created_at).toLocaleDateString(),
      };
    } catch (e) {
      cloudSaveFailed = true;
      console.error('Failed to save score to cloud (saved locally):', e);
    } finally {
      setLeaderboard(current => {
        const updated = [...current, savedEntry]
          .sort((a, b) => (a.moves !== b.moves ? a.moves - b.moves : a.time - b.time));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('minion_leaderboard', JSON.stringify(updated));
        }
        return updated;
      });
      setLeaderboardTab(gameState.difficulty);
      setIsSaving(false);
      // 저장 중에 Play Again 등으로 이동했다면 지난 판의 결과 문구를 덮어쓰지 않는다.
      if (savedScoreKeyRef.current === scoreKey) {
        setSaveStatus(cloudSaveFailed ? 'error' : 'saved');
      }
    }
  }, [gameState.difficulty, gameState.moves, isSaving, playerName, timer]);

  useEffect(() => {
    if (gameState.status === 'WON' && playerName.trim() && !isSaving) {
      const timeout = setTimeout(() => {
        saveToLeaderboard();
      }, 700); // 0.7초 정도 성공 화면을 보여준 뒤 자동 저장
      return () => clearTimeout(timeout);
    }
  }, [gameState.status, isSaving, playerName, saveToLeaderboard]);

  useEffect(() => {
    if (!isLeaderboardOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLeaderboardOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isLeaderboardOpen]);

  if (gameState.status === 'IDLE') {
    return (
      <>
        <StartScreen
          playerName={playerName}
          isReady={!isLoadingPool && !isGameLoading && imagePool.length > 0}
          loadError={isLoadingPool ? null : poolError}
          onRetryLoad={() => void loadAssets()}
          onPlayerNameChange={setPlayerName}
          onStart={startFromMenu}
          onShowLeaderboard={() => setIsLeaderboardOpen(true)}
        />
        {isLeaderboardOpen && (
          <LeaderboardModal
            entries={leaderboard}
            activeTab={leaderboardTab}
            onTabChange={setLeaderboardTab}
            onClose={() => setIsLeaderboardOpen(false)}
          />
        )}
      </>
    );
  }

  const actualTotalPairs = gameState.cards.length / 2;

  return (
    <div className="game-background min-h-screen min-h-dvh flex flex-col items-center text-white selection:bg-yellow-400 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.08),transparent_70%)]"></div>
      </div>

      <main className="relative z-10 w-full max-w-5xl px-3 sm:px-4 py-2 sm:py-8 flex flex-col gap-3 sm:gap-6">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-2xl">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-4xl font-fredoka font-bold text-yellow-400 leading-none tracking-tight">MINION MATCH</h1>
            <p className="text-blue-300 font-black uppercase text-[7px] sm:text-[10px] tracking-widest mt-0.5 sm:mt-1">
              {gameState.status === 'PREVIEW' ? 'Memorize Mode' : `${gameState.difficulty} • ${playerName}`}
            </p>
            <div className="mt-2 flex justify-center gap-2 sm:justify-start">
              <button type="button" onClick={() => initGame(gameState.difficulty)} className="rounded-lg bg-blue-600/80 px-3 py-1 text-[9px] font-black uppercase text-white transition-colors hover:bg-blue-500">Restart</button>
              <button type="button" onClick={backToMenu} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-black uppercase text-gray-300 transition-colors hover:bg-white/10">Menu</button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-black/40 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-white/10 w-full sm:w-auto">
            {[
              { label: 'Moves', value: gameState.moves, color: 'text-white' },
              {
                label: gameState.status === 'PREVIEW' ? 'Wait' : 'Time',
                value: gameState.status === 'PREVIEW' ? `${previewTimer}s` : `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`,
                color: gameState.status === 'PREVIEW' ? 'text-orange-400' : 'text-blue-400'
              },
              { label: 'Pairs', value: `${gameState.matches}/${actualTotalPairs || 0}`, color: 'text-yellow-400' },
              { label: 'Best', value: gameState.bestScore === 0 ? '--' : gameState.bestScore, color: 'text-purple-400' }
            ].map((stat, i) => (
              <div key={i} className="px-1 sm:px-2 py-0.5 sm:py-1 text-center border-r last:border-0 border-white/5 min-w-[55px] sm:min-w-[90px]">
                <p className="text-[6px] sm:text-[8px] uppercase font-black text-gray-500 tracking-tighter mb-0.5">{stat.label}</p>
                <p className={`text-[12px] sm:text-lg font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="w-full">
          <section className="relative w-full">
            {isGameLoading ? (
              <div className="min-h-[350px] sm:min-h-[550px] flex flex-col items-center justify-center space-y-4 sm:space-y-6 bg-white/[0.02] rounded-[2rem] sm:rounded-[2.5rem] border-2 border-dashed border-white/10 p-4 sm:p-6">
                {isGameLoading ? (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-fredoka text-base sm:text-lg font-bold text-yellow-400 animate-pulse">Preloading Bananas...</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl sm:text-7xl animate-bounce">🍌</span>
                    <h2 className="text-lg sm:text-2xl font-bold font-fredoka text-white text-center">Ready for your mission?</h2>
                    <div className="w-full max-w-xs space-y-2 mb-2">
                      <p className="text-[10px] text-gray-500 uppercase font-black text-center tracking-widest italic">Agent Identifier Required</p>
                      <input
                        type="text"
                        placeholder="Enter Agent Name..."
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={12}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors text-center font-bold text-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-sm">
                      {(['EASY', 'NORMAL'] as Difficulty[]).map(d => (
                        <button
                          key={d}
                          onClick={() => initGame(d)}
                          className="flex-1 py-3 sm:py-4 bg-yellow-400 text-black rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:scale-105 transition-all active:scale-95 shadow-xl shadow-yellow-400/20"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:gap-4">
                {gameState.status === 'PREVIEW' && (
                  <div className="w-full bg-yellow-400 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center justify-between border sm:border-2 border-white shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">👀</span>
                      <span className="font-fredoka font-black text-black text-[12px] sm:text-base uppercase tracking-tight">Memorize the Bananas!</span>
                    </div>
                    <div className="bg-black text-yellow-400 px-3 py-0.5 sm:py-1 rounded-full font-black text-base sm:text-lg">
                      {previewTimer}s
                    </div>
                  </div>
                )}

                <div className="bg-white/[0.02] p-2 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-2xl flex items-center justify-center min-h-[350px] sm:min-h-[550px] relative overflow-hidden">
                  {/* 웹에서도 카드가 큼직하게 보이도록 max-w를 상향 조정하고 EASY/NORMAL 너비를 통일하여 카드 크기 일치시킴 */}
                  <div className="mx-auto grid w-full max-w-[760px] grid-cols-4 justify-items-center gap-2 sm:gap-4">
                    {gameState.cards.map((card, idx) => (
                      <Card
                        key={card.id}
                        card={card}
                        onClick={() => handleCardClick(idx)}
                        disabled={isProcessing || gameState.status === 'PREVIEW'}
                        isPreviewing={gameState.status === 'PREVIEW'}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      {gameState.status === 'WON' && (
        <ResultModal
          moves={gameState.moves}
          time={timer}
          playerName={playerName}
          saveStatus={saveStatus}
          onPlayAgain={() => void initGame(gameState.difficulty)}
          onShowLeaderboard={() => setIsLeaderboardOpen(true)}
          onBackToMenu={backToMenu}
        />
      )}

      {isLeaderboardOpen && (
        <LeaderboardModal
          entries={leaderboard}
          activeTab={leaderboardTab}
          onTabChange={setLeaderboardTab}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
