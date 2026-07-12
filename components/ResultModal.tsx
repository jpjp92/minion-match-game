'use client';

interface ResultModalProps {
  moves: number;
  time: number;
  playerName: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onPlayAgain: () => void;
  onShowLeaderboard: () => void;
  onBackToMenu: () => void;
}

const ResultModal = ({
  moves,
  time,
  playerName,
  saveStatus,
  onPlayAgain,
  onShowLeaderboard,
  onBackToMenu,
}: ResultModalProps) => {
  const isSaving = saveStatus === 'saving';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#152844]/70 p-4 backdrop-blur-md animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white p-7 text-center text-[#152844] shadow-2xl sm:p-10 animate-scaleIn">
        <div className="absolute left-0 top-0 h-20 w-20 rounded-tl-[2rem] border-l-4 border-t-4 border-yellow-400/40" />
        <div className="absolute bottom-0 right-0 h-20 w-20 rounded-br-[2rem] border-b-4 border-r-4 border-blue-500/30" />

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-yellow-400/40 bg-yellow-100 text-4xl shadow-inner">🎉</div>
        <h2 id="result-title" className="font-fredoka text-3xl font-black sm:text-4xl">Mission Complete!</h2>
        <p className="mt-2 text-sm font-bold text-stone-400">Great job, {playerName}!</p>

        <div className="my-7 flex justify-center gap-8">
          <div className="flex min-w-20 flex-col"><span className="text-xs font-black uppercase tracking-wider text-stone-400">Moves</span><strong className="text-3xl font-black text-blue-600">{moves}</strong></div>
          <div className="w-px bg-stone-200" />
          <div className="flex min-w-20 flex-col"><span className="text-xs font-black uppercase tracking-wider text-stone-400">Time</span><strong className="text-3xl font-black text-blue-600">{time}s</strong></div>
        </div>

        <p className={`mb-4 min-h-5 text-xs font-bold ${saveStatus === 'error' ? 'text-orange-500' : 'text-stone-400'}`}>
          {isSaving ? 'Saving your record...' : saveStatus === 'saved' ? 'Record saved to Hall of Fame' : saveStatus === 'error' ? 'Cloud save failed. Record kept locally.' : ''}
        </p>

        <div className="flex flex-col gap-3">
          <button type="button" onClick={onPlayAgain} disabled={isSaving} className="w-full rounded-xl bg-[#152844] py-3.5 font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">Play Again</button>
          <button type="button" onClick={onShowLeaderboard} disabled={isSaving} className="w-full rounded-xl bg-yellow-400 py-3.5 font-black text-[#152844] shadow-md transition-all hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">🏆 Hall of Fame</button>
          <button type="button" onClick={onBackToMenu} disabled={isSaving} className="w-full rounded-xl border border-stone-200 bg-transparent py-3.5 font-black text-stone-500 transition-all hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60">Back to Menu</button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
