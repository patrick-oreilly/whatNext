// Lobby/Waiting room page

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '../components/common';
import { PlayerList } from '../components/lobby/PlayerList';
import { RoomCode } from '../components/lobby/RoomCode';
import { roomsApi } from '../api/rooms';
import { useGameStore } from '../store/gameStore';
import { usePolling } from '../hooks';
import { MIN_PLAYERS, MAX_PLAYERS, LOBBY_POLL_INTERVAL } from '../utils/constants';
import { GamePhase, STORYLINE_LABELS } from '../types';

export const Lobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch room state
  const fetchRoomState = async () => {
    if (!roomId) return;

    try {
      const state = await roomsApi.getRoomState(roomId);
      setRoomState(state);
      setError(null);

      // If game has started, navigate to game page
      if (state.phase !== GamePhase.LOBBY) {
        navigate(`/game/${roomId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load room');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates
  usePolling(fetchRoomState, LOBBY_POLL_INTERVAL, !!roomId);

  // Initial load
  useEffect(() => {
    fetchRoomState();
  }, [roomId]);

  const handleStartGame = async () => {
    if (!roomId) return;

    setIsStarting(true);
    try {
      await roomsApi.startGame(roomId);
      // The polling will detect the phase change and navigate
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
      setIsStarting(false);
    }
  };

  const handleLeave = () => {
    navigate('/');
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
          <div className="text-primary text-6xl mb-4">⚠️</div>
          <h2 className="font-display text-3xl font-black text-accent-white uppercase mb-4">Error</h2>
          <p className="text-accent-white font-bold mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  if (!roomState || !roomId) {
    return null;
  }

  const isHost = roomState.players[0] === currentPlayer;
  const canStart = roomState.players.length >= MIN_PLAYERS;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-5xl font-black text-accent-white uppercase tracking-tight mb-2">
              Game Lobby
            </h1>
            <div className="h-2 w-32 bg-primary rounded mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Room Info */}
            <div className="space-y-6">
              <RoomCode code={roomId} />

              <Card className="bg-accent-black border-4 border-accent-white">
                <h2 className="text-2xl font-black text-accent-white uppercase tracking-tight mb-6">
                  Game Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-accent-white bg-opacity-10 rounded-lg">
                    <span className="text-accent-white font-bold uppercase tracking-wide">Storyline:</span>
                    <span className="text-primary font-black">{STORYLINE_LABELS[roomState.storyline]}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent-white bg-opacity-10 rounded-lg">
                    <span className="text-accent-white font-bold uppercase tracking-wide">Turns:</span>
                    <span className="text-primary font-black">{roomState.max_turns}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent-white bg-opacity-10 rounded-lg">
                    <span className="text-accent-white font-bold uppercase tracking-wide">Players:</span>
                    <span className="text-primary font-black">{roomState.players.length}/{MAX_PLAYERS}</span>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="p-4 bg-red-600 border-4 border-accent-white rounded-lg">
                  <p className="text-accent-white font-bold uppercase text-center">{error}</p>
                </div>
              )}
            </div>

            {/* Right Column - Players */}
            <div>
              <Card className="bg-accent-black border-4 border-accent-white">
                <h2 className="text-2xl font-black text-accent-white uppercase tracking-tight mb-6">
                  Players ({roomState.players.length}/{MAX_PLAYERS})
                </h2>
                <PlayerList
                  players={roomState.players}
                  currentPlayer={currentPlayer}
                />
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <Button
              variant="outline"
              onClick={handleLeave}
              disabled={isStarting}
              size="lg"
            >
              Leave Room
            </Button>

            {isHost && (
              <Button
                fullWidth
                onClick={handleStartGame}
                loading={isStarting}
                disabled={!canStart}
                size="lg"
              >
                {!canStart
                  ? `Waiting for ${MIN_PLAYERS - roomState.players.length} more player${MIN_PLAYERS - roomState.players.length === 1 ? '' : 's'}...`
                  : 'Start Game'}
              </Button>
            )}

            {!isHost && (
              <div className="flex-1 flex items-center justify-center bg-accent-white bg-opacity-10 border-4 border-accent-white rounded-lg p-4">
                <p className="text-accent-white font-black uppercase tracking-wide text-lg">
                  Waiting for host to start the game...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
