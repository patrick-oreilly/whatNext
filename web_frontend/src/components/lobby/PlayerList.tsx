// Player list component for lobby

import React from 'react';
import { Icon } from '../common/Icon';
import { Users } from 'lucide-react';

interface PlayerListProps {
  players: string[];
  currentPlayer: string | null;
  maxPlayers?: number;
  host?: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentPlayer,
  maxPlayers = 10,
  host,
}) => {
  const emptySlots = maxPlayers - players.length;
  const allSlots = [
    ...players.map(player => ({ type: 'player' as const, player })),
    ...Array.from({ length: emptySlots }, () => ({ type: 'empty' as const }))
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 mt-6">
        <Icon icon={Users} size={24} className="text-primary" />
        <h2 className="text-xl font-black text-primary uppercase tracking-tight">
          Players ({players.length}/{maxPlayers})
        </h2>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {allSlots.map((slot, index) => {
          if (slot.type === 'player') {
            const player = slot.player;
            const isCurrentPlayer = player === currentPlayer;
            const isHost = player === host;

            return (
              <div key={`player-${player}`} className="flex flex-col items-center">
                {/* Player Circle */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl border-4 ${
                  isCurrentPlayer
                    ? 'bg-primary text-accent-white border-primary shadow-lg shadow-primary/50'
                    : 'bg-accent-white text-accent-black border-accent-white'
                }`}>
                  {player.charAt(0).toUpperCase()}
                </div>

                {/* Player Name */}
                <div className="mt-2 text-center">
                  <div className={`font-bold text-sm ${isCurrentPlayer ? 'text-primary' : 'text-accent-white'}`}>
                    {player}
                  </div>
                  {isHost && (
                    <div className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary text-accent-black font-black rounded uppercase">
                      HOST
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Empty slot
          return (
            <div key={`empty-${index}`} className="flex flex-col items-center">
              {/* Empty Circle */}
              <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-dashed border-primary border-opacity-30 bg-accent-white bg-opacity-5">
                <Icon icon={Users} size={40} className="text-primary opacity-30" />
              </div>

              {/* Waiting Text */}
              <div className="mt-2 text-center">
                <div className="font-semibold text-sm text-primary opacity-50">
                  Waiting...
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
