// Player list component for lobby

import React from 'react';

interface PlayerListProps {
  players: string[];
  currentPlayer: string | null;
  maxPlayers?: number;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentPlayer,
  maxPlayers = 4,
}) => {
  const emptySlots = maxPlayers - players.length;

  return (
    <div className="space-y-3">
      {players.map((player, index) => {
        const isCurrentPlayer = player === currentPlayer;
        const isHost = index === 0;

        return (
          <div
            key={player}
            className={`flex items-center space-x-4 p-4 rounded-lg border-4 ${
              isCurrentPlayer
                ? 'border-primary bg-primary bg-opacity-20'
                : 'border-accent-white border-opacity-30 bg-accent-white bg-opacity-5'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
              isCurrentPlayer ? 'bg-primary text-accent-black' : 'bg-accent-white text-accent-black'
            }`}>
              {player.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className={`font-black text-lg ${isCurrentPlayer ? 'text-primary' : 'text-accent-white'}`}>
                {player}
                {isCurrentPlayer && (
                  <span className="ml-2 text-sm">(YOU)</span>
                )}
              </div>
              {isHost && (
                <span className="inline-block mt-1 px-3 py-1 text-xs bg-gradient-intense text-accent-white font-black rounded uppercase">
                  Host
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty slots */}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`empty-${index}`}
          className="flex items-center space-x-4 p-4 rounded-lg border-4 border-dashed border-accent-white border-opacity-20 bg-accent-white bg-opacity-5"
        >
          <div className="w-12 h-12 rounded-full bg-accent-white bg-opacity-20 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-white text-opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-accent-white text-opacity-60 font-bold uppercase tracking-wide">
            Waiting for player...
          </div>
        </div>
      ))}
    </div>
  );
};
