// Persistent Player Status component - shows all players and scores

import React from 'react';

interface PlayerStatusProps {
  players: string[];
  scores: Record<string, number>;
  currentPlayer: string | null;
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({
  players,
  scores,
  currentPlayer,
}) => {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

  return (
    <div className="bg-accent-black border-4 border-accent-white rounded-lg p-4">
      <h3 className="text-lg font-black text-accent-white uppercase tracking-wide mb-4 text-center">
        Players
      </h3>
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player === currentPlayer;
          const score = scores[player] || 0;

          return (
            <div
              key={player}
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                isCurrentPlayer
                  ? 'border-primary bg-primary bg-opacity-20'
                  : 'border-accent-white border-opacity-30 bg-accent-white bg-opacity-5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                  isCurrentPlayer ? 'bg-primary text-accent-black' : 'bg-accent-white text-accent-black'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className={`font-bold ${isCurrentPlayer ? 'text-primary' : 'text-accent-white'}`}>
                    {player}
                    {isCurrentPlayer && <span className="ml-2 text-xs">(YOU)</span>}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-black text-accent-white">
                {score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
