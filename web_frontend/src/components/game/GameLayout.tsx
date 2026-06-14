import React from 'react';
import { PlayerStatus } from './PlayerStatus';
import { useGameStore } from '../../store/gameStore';

interface GameLayoutProps {
  roomId: string;
  children: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ roomId, children }) => {
  const { roomState, currentPlayer } = useGameStore();

  if (!roomState || !currentPlayer) return null;

  return (
    <div className="min-h-screen py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 bg-accent-black border-4 border-accent-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-black text-accent-white uppercase tracking-tight">
                What Next?
              </h1>
              <p className="text-primary font-bold text-lg mt-1">
                Turn {roomState.turn} of {roomState.max_turns}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-accent-white uppercase tracking-wide">
                Room: {roomId}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main column */}
          <div className="lg:col-span-3">
            {children}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <PlayerStatus
                players={roomState.players}
                scores={roomState.scores}
                currentPlayer={currentPlayer}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
