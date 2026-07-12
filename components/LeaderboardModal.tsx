'use client';

import { Difficulty, LeaderboardEntry } from '../types.ts';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  activeTab: Difficulty;
  onTabChange: (difficulty: Difficulty) => void;
  onClose: () => void;
}

const LeaderboardModal = ({ entries, activeTab, onTabChange, onClose }: LeaderboardModalProps) => {
  const visibleEntries = entries.filter(entry => entry.difficulty === activeTab).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white text-gray-800 shadow-2xl animate-scaleIn">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 id="leaderboard-title" className="font-fredoka flex items-center gap-3 text-xl font-bold text-blue-600 sm:text-2xl">🏆 HALL OF FAME</h2>
          <button type="button" onClick={onClose} aria-label="Close leaderboard" className="p-1 text-gray-400 transition-colors hover:text-gray-600">
            <span aria-hidden="true" className="text-3xl leading-none">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-2 py-4 sm:p-8">
          <div className="relative mx-auto mb-6 flex w-full max-w-sm rounded-[1.25rem] border border-gray-100 bg-gray-50 p-1 shadow-sm">
            {[Difficulty.EASY, Difficulty.NORMAL].map(difficulty => (
              <button key={difficulty} type="button" onClick={() => onTabChange(difficulty)} className={`flex-1 rounded-[0.9rem] py-2.5 font-fredoka text-xs font-bold tracking-widest transition-all ${activeTab === difficulty ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-200/50'}`}>
                {difficulty} MODE
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full min-w-[320px] border-collapse text-left">
              <thead>
                <tr className="bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white">
                  <th className="px-3 py-4 text-center">Rank</th><th className="px-3 py-4">Player</th><th className="px-3 py-4 text-center">Moves</th><th className="px-3 py-4 text-center">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleEntries.length > 0 ? visibleEntries.map((entry, index) => (
                  <tr key={entry.id} className={`${index < 3 ? 'bg-yellow-50/50' : 'bg-white'} text-sm transition-colors hover:bg-gray-50`}>
                    <td className="px-3 py-4 text-center font-bold text-blue-600">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                    <td className="max-w-[120px] truncate px-3 py-4 font-bold text-gray-700">{entry.name}</td>
                    <td className="px-3 py-4 text-center font-black text-blue-700">{entry.moves}</td>
                    <td className="px-3 py-4 text-center text-xs font-semibold text-gray-500">{entry.time}s</td>
                  </tr>
                )) : <tr><td colSpan={4} className="py-16 text-center font-bold uppercase text-gray-400">No {activeTab} records. 🍌</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
