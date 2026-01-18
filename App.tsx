
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameState, Card as CardType, LeaderboardEntry } from './types.ts';
import { createBoard, fetchAvailableImages, preloadImages } from './utils/gameUtils.ts';
import Card from './components/Card.tsx';

const App: React.FC = () => {
  const [imagePool, setImagePool] = useState<string[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [previewTimer, setPreviewTimer] = useState(5);
  
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    flippedIndices: [],
    moves: 0,
    matches: 0,
    status: 'IDLE',
    difficulty: Difficulty.EASY,
    bestScore: Number(localStorage.getItem(`bestScore_${Difficulty.EASY}`)) || 0,
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const previewIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      setIsLoadingPool(true);
      const images = await fetchAvailableImages();
      setImagePool(images);
      setIsLoadingPool(false);
    };
    loadAssets();
    const saved = localStorage.getItem('minion_leaderboard');
    if (saved) setLeaderboard(JSON.parse(saved));
  }, []);

  const startActualGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
  }, []);

  const initGame = useCallback(async (difficulty: Difficulty = gameState.difficulty) => {
    if (imagePool.length === 0) return;

    setIsGameLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);

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
      bestScore: Number(localStorage.getItem(`bestScore_${difficulty}`)) || 0
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
  }, [gameState.difficulty, imagePool, startActualGame]);

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
          setTimeout(() => {
            setGameState(current => {
              const matchedCards = [...current.cards];
              matchedCards[firstIdx].isMatched = true;
              matchedCards[secondIdx].isMatched = true;
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
          }, 310); 
        } else {
          setTimeout(() => {
            setGameState(current => {
              const resetCards = [...current.cards];
              resetCards[firstIdx].isFlipped = false;
              resetCards[secondIdx].isFlipped = false;
              setIsProcessing(false);
              return { ...current, cards: resetCards, flippedIndices: [] };
            });
          }, 800);
        }
        return { ...prev, cards: updatedCards, flippedIndices: newFlipped, moves: nextMoves };
      }
      return { ...prev, cards: updatedCards, flippedIndices: newFlipped };
    });
  }, [isProcessing, gameState.status]);

  const updateBestScore = (score: number, difficulty: Difficulty): number => {
    const key = `bestScore_${difficulty}`;
    const currentBest = Number(localStorage.getItem(key)) || 0;
    if (score < currentBest || currentBest === 0) {
      localStorage.setItem(key, score.toString());
      return score;
    }
    return currentBest;
  };

  useEffect(() => {
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, []);

  const saveToLeaderboard = () => {
    if (!playerName.trim()) return;
    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: playerName.trim(),
      moves: gameState.moves,
      time: timer,
      difficulty: gameState.difficulty,
      date: new Date().toLocaleDateString()
    };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => a.moves !== b.moves ? a.moves - b.moves : a.time - b.time)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem('minion_leaderboard', JSON.stringify(updated));
    setGameState(prev => ({ ...prev, status: 'IDLE' }));
    setIsLeaderboardOpen(true);
    setPlayerName('');
  };

  if (isLoadingPool) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050a0f] text-white">
        <div className="text-6xl animate-bounce mb-4">🍌</div>
        <p className="font-fredoka text-xl font-bold text-yellow-400 animate-pulse">Checking Assets...</p>
      </div>
    );
  }

  const actualTotalPairs = gameState.cards.length / 2;

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#050a0f] text-white selection:bg-yellow-400 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent_70%)]"></div>
      </div>

      <main className="relative z-10 w-full max-w-5xl px-3 sm:px-4 py-2 sm:py-8 flex flex-col gap-3 sm:gap-6">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-2xl">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-4xl font-fredoka font-bold text-yellow-400 leading-none tracking-tight">MINION MATCH</h1>
            <p className="text-blue-300 font-black uppercase text-[7px] sm:text-[10px] tracking-widest mt-0.5 sm:mt-1">
              {gameState.status === 'PREVIEW' ? 'Memorize Mode' : 'Classic Edition'}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-black/40 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-white/10 w-full sm:w-auto">
            {[
              { label: 'Moves', value: gameState.moves, color: 'text-white' },
              { 
                label: gameState.status === 'PREVIEW' ? 'Wait' : 'Time', 
                value: gameState.status === 'PREVIEW' ? `${previewTimer}s` : `${Math.floor(timer/60)}:${(timer%60).toString().padStart(2,'0')}`, 
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

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_260px] gap-4 sm:gap-6">
          <section className="order-2 lg:order-1 relative">
            {gameState.status === 'IDLE' || isGameLoading ? (
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
                     <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-sm">
                        {(['EASY', 'MEDIUM'] as Difficulty[]).map(d => (
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
                  {/* 웹에서도 카드가 큼직하게 보이도록 max-w를 상향 조정하고 EASY/MEDIUM 너비를 통일하여 카드 크기 일치시킴 */}
                  <div className={`grid grid-cols-4 gap-2 sm:gap-4 w-full mx-auto justify-items-center max-w-full sm:max-w-[600px]`}>
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

          <aside className="order-1 lg:order-2 flex flex-col gap-3 sm:gap-5">
             <div className="bg-white/5 backdrop-blur-3xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 shadow-2xl space-y-3 sm:space-y-5">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   <h3 className="font-fredoka text-sm sm:text-base font-bold text-blue-400 uppercase tracking-tight">Mission Panel</h3>
                </div>

                <div className="flex flex-col gap-2 sm:gap-3">
                   <button onClick={() => initGame(gameState.difficulty)} className="py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg shadow-blue-600/20">Restart Mission</button>
                   <button onClick={() => setIsLeaderboardOpen(true)} className="py-2.5 sm:py-3 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg shadow-yellow-400/10">🏆 Leaderboard</button>
                   <button onClick={() => setGameState(prev => ({ ...prev, status: 'IDLE' }))} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl font-bold text-gray-400 text-[9px] sm:text-[10px] transition-all">Back to Menu</button>
                </div>

                <div className="pt-3 sm:pt-5 border-t border-white/10">
                   <p className="text-[7px] sm:text-[8px] text-gray-500 uppercase font-black mb-2 sm:mb-3 text-center tracking-widest">Difficulty</p>
                   <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-lg sm:rounded-xl">
                     {([Difficulty.EASY, Difficulty.MEDIUM] as Difficulty[]).map(d => (
                       <button key={d} onClick={() => initGame(d)} className={`py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-black rounded-md sm:rounded-lg transition-all ${gameState.difficulty === d ? 'bg-yellow-400 text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>{d}</button>
                     ))}
                   </div>
                </div>
             </div>
          </aside>
        </div>
      </main>

      {/* WIN MODAL */}
      {gameState.status === 'WON' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-yellow-400 p-1 rounded-[2.5rem] shadow-2xl max-w-[340px] w-full animate-scaleIn">
            <div className="bg-[#050a0f] rounded-[2.35rem] p-8 flex flex-col items-center text-center space-y-6">
              <span className="text-6xl animate-bounce">🏆</span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-fredoka font-bold text-yellow-400 uppercase tracking-tight">Banana Success!</h2>
                <p className="text-gray-400 text-sm mt-2">Moves: <span className="text-white font-bold">{gameState.moves}</span> | Time: <span className="text-white font-bold">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</span></p>
              </div>
              <div className="w-full space-y-3">
                <input 
                  type="text" 
                  placeholder="Enter Agent Name..." 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') saveToLeaderboard(); }}
                  maxLength={12} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors text-center font-bold text-sm" 
                  autoFocus
                />
                <button onClick={saveToLeaderboard} disabled={!playerName.trim()} className="w-full py-4 bg-yellow-400 text-black font-black text-base rounded-xl active:scale-95 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50 uppercase">SAVE RECORD</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD MODAL */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
               <h2 className="text-xl sm:text-2xl font-fredoka font-bold text-blue-600 flex items-center gap-3">🏆 HALL OF FAME</h2>
               <button onClick={() => setIsLeaderboardOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white text-gray-800">
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[320px]">
                    <thead>
                      <tr className="bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest">
                        <th className="px-4 py-4 text-center">RANK</th>
                        <th className="px-4 py-4">PLAYER</th>
                        <th className="px-4 py-4 text-center">MOVES</th>
                        <th className="px-4 py-4 text-center">MODE</th>
                        <th className="px-4 py-4 text-center">TIME</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaderboard.length > 0 ? leaderboard.map((entry, index) => (
                        <tr key={entry.id} className={`${index < 3 ? 'bg-yellow-50/50' : 'bg-white'} hover:bg-gray-50 transition-colors text-sm sm:text-base`}>
                          <td className="px-4 py-4 text-center font-bold text-blue-600">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </td>
                          <td className="px-4 py-4 font-bold text-gray-700 truncate max-w-[100px]">{entry.name}</td>
                          <td className="px-4 py-4 text-center font-black text-blue-700">{entry.moves}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${entry.difficulty === Difficulty.MEDIUM ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                              {entry.difficulty.charAt(0)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 text-xs font-semibold">{entry.time}s</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-16 text-center text-gray-400 font-bold text-base">No records yet. 🍌</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-100">
              <button onClick={() => setIsLeaderboardOpen(false)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl active:scale-[0.98] transition-all text-sm uppercase shadow-xl shadow-blue-600/20">Back to Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
