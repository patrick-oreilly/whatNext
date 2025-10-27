// Scoreboard component

import React from 'react';
import { getPlayerColor } from '../../utils/formatters';

interface ScoreboardProps {
  scores: Record<string, number>;
  currentPlayer: string | null;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ scores, currentPlayer }) => {
  const sortedPlayers = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold mb-3">Scoreboard</h3>
      <div className="space-y-2">
        {sortedPlayers.map(([player, score], index) => (
          <div
            key={player}
            className={`flex items-center justify-between p-2 rounded-lg ${
              player === currentPlayer ? 'bg-primary-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full ${getPlayerColor(index)} flex items-center justify-center text-white text-xs font-semibold`}>
                {index + 1}
              </div>
              <span className="font-medium text-sm">
                {player}
                {player === currentPlayer && <span className="text-xs text-gray-500 ml-1">(You)</span>}
              </span>
            </div>
            <span className="font-bold text-primary-600">{score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
