// Join Room page

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/common';
import { roomsApi } from '../api/rooms';
import { useGameStore } from '../store/gameStore';
import { useLocalStorage } from '../hooks';
import { STORAGE_KEYS } from '../utils/constants';
import { validatePlayerName, validateRoomCode } from '../utils/validation';
import { formatRoomCode } from '../utils/formatters';

export const JoinRoom: React.FC = () => {
  const navigate = useNavigate();
  const setCurrentPlayer = useGameStore((state) => state.setCurrentPlayer);
  const [savedPlayerName, setSavedPlayerName] = useLocalStorage(STORAGE_KEYS.PLAYER_NAME, '');

  const [playerName, setPlayerName] = useState(savedPlayerName);
  const [roomCode, setRoomCode] = useState('');
  const [errors, setErrors] = useState<{ playerName?: string; roomCode?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const playerNameError = validatePlayerName(playerName);
    const roomCodeError = validateRoomCode(roomCode);

    if (playerNameError || roomCodeError) {
      setErrors({
        playerName: playerNameError || undefined,
        roomCode: roomCodeError || undefined,
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const formattedCode = formatRoomCode(roomCode.trim());

      // Join room
      await roomsApi.joinRoom({
        room_id: formattedCode,
        player_name: playerName.trim(),
      });

      // Save player name and set in store
      setSavedPlayerName(playerName.trim());
      setCurrentPlayer(playerName.trim());

      // Navigate to lobby
      navigate(`/lobby/${formattedCode}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to join room';

      // Check if it's a room-specific error
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        setErrors({ roomCode: 'Room not found. Please check the code.' });
      } else if (errorMessage.includes('full')) {
        setErrors({ roomCode: 'Room is full. Cannot join.' });
      } else if (errorMessage.includes('started') || errorMessage.includes('game already')) {
        setErrors({ roomCode: 'Game has already started. Cannot join.' });
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('already taken')) {
        setErrors({ playerName: 'This name is already taken in the room.' });
      } else {
        setErrors({ roomCode: errorMessage });
      }

      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card className="bg-accent-black border-4 border-accent-white">
          <h1 className="text-4xl font-black text-accent-white mb-8 uppercase tracking-tight text-center">Join Game</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Name */}
            <Input 
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              error={errors.playerName}
              fullWidth
              required
              maxLength={20}
            />

            {/* Room Code */}
            <Input
              label="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              error={errors.roomCode}
              fullWidth
              required
              maxLength={6}
              className="uppercase font-mono"
              helperText="Ask the host for the room code"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                fullWidth
                loading={isLoading}
              >
                Join Room
              </Button>
            </div>
          </form>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-accent-white font-bold text-base mb-2">Don't have a room code?</p>
          <button
            onClick={() => navigate('/create')}
            className="text-primary hover:text-primary-400 font-black uppercase tracking-wide text-lg underline"
          >
            Create New Game
          </button>
        </div>
      </div>
    </div>
  );
};
