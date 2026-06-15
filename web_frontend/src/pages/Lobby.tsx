// Lobby page

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '../components/common';
import { PlayerList } from '../components/lobby/PlayerList';
import { RoomCode } from '../components/lobby/RoomCode';
import { GameApi } from '../api/GameApi';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types';
import { GAME_STATE_POLL_INTERVAL } from '../utils/constants';
import { usePolling } from '../hooks';
import { Icon } from '../components/common/Icon';
import { AlertTriangle } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer, playerToken } = useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomState = useCallback(async () => {
    if (!roomId) return;

    try {
      const state = await GameApi.getRoomState(roomId);
      setRoomState(state);

      if (state.phase === GamePhase.PLAYER_INPUT || state.phase === GamePhase.GENERATING_STORY) {
        navigate(`/game/${roomId}`);
      } else if (state.phase === GamePhase.GAME_OVER) {
        navigate(`/gameover/${roomId}`);
      }

      setError(null);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Failed to load room');
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, setRoomState, navigate]);

  // Poll for updates
  usePolling(fetchRoomState, GAME_STATE_POLL_INTERVAL, !!roomId);

  useEffect(() => {
    fetchRoomState();
  }, [fetchRoomState]);

  const handleStartGame = async () => {
    if (!roomId) return;

    try {
      await GameApi.startGame(roomId, playerToken);
      // State will be updated by polling, which will trigger navigation
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Failed to start game');
      } else {
        setError('An unknown error occurred.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !roomState) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto text-center bg-accent-black border-4 border-accent-white">
          <Icon icon={AlertTriangle} strokeWidth={1} size={72} className="mx-auto mb-4 text-primary" />
          <h2 className="font-display text-3xl font-black text-accent-white uppercase mb-4">Error</h2>
          <p className="text-accent-white font-bold mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  if (!roomState) {
    return null;
  }

  const isHost = currentPlayer === roomState.players[0];
  const canStartGame = isHost && roomState.players.length >= 2;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-accent-black border-4 border-accent-white">
          <h1 className="font-display text-4xl font-black text-accent-white mb-8 uppercase tracking-tight text-center">Game Lobby</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-600 border-4 border-accent-white rounded-lg">
              <p className="text-accent-white font-bold uppercase text-center">{error}</p>
            </div>
          )}

          <RoomCode code={roomId} />

          <PlayerList players={roomState.players} host={roomState.players[0]} currentPlayer={currentPlayer} />

          {/* Waiting message */}
          {!canStartGame && (
            <div className="mb-6 p-4 bg-primary bg-opacity-10 border-2 border-primary rounded-lg">
              <p className="text-accent-white font-bold text-center">
                Waiting for at least one more player to join...
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            {isHost ? (
              <Button
                fullWidth
                onClick={handleStartGame}
                disabled={!canStartGame}
                size="lg"
              >
                {canStartGame ? 'Start Game' : 'Need at least 2 players to start'}
              </Button>
            ) : (
              <p className="text-accent-white font-bold text-lg uppercase tracking-wide">
                Waiting for host to start the game...
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
