// Create Room page

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/common';
import { roomsApi } from '../api/rooms';
import { useGameStore } from '../store/gameStore';
import { useLocalStorage } from '../hooks';
import { STORAGE_KEYS, DEFAULT_TURNS } from '../utils/constants';
import { validatePlayerName, validateMaxTurns } from '../utils/validation';
import { StoryLineType, STORYLINE_LABELS, STORYLINE_DESCRIPTIONS } from '../types';

export const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const setCurrentPlayer = useGameStore((state) => state.setCurrentPlayer);
  const [savedPlayerName, setSavedPlayerName] = useLocalStorage(STORAGE_KEYS.PLAYER_NAME, '');

  const [playerName, setPlayerName] = useState(savedPlayerName);
  const [storyline, setStoryline] = useState<StoryLineType>(StoryLineType.HOOP_DREAMS);
  const [maxTurns, setMaxTurns] = useState(DEFAULT_TURNS);
  const [errors, setErrors] = useState<{ playerName?: string; maxTurns?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const playerNameError = validatePlayerName(playerName);
    const maxTurnsError = validateMaxTurns(maxTurns);

    if (playerNameError || maxTurnsError) {
      setErrors({
        playerName: playerNameError || undefined,
        maxTurns: maxTurnsError || undefined,
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Create room
      const response = await roomsApi.createRoom({
        storyline,
        max_turns: maxTurns,
      });

      // Join the room
      await roomsApi.joinRoom({
        room_id: response.room_id,
        player_name: playerName.trim(),
      });

      // Save player name and set in store
      setSavedPlayerName(playerName.trim());
      setCurrentPlayer(playerName.trim());

      // Navigate to lobby
      navigate(`/lobby/${response.room_id}`);
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ playerName: error.message || 'Failed to create room' });
      } else {
        setErrors({ playerName: 'An unknown error occurred.' });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-accent-black border-4 border-accent-white">
          <h1 className="font-display text-4xl font-black text-accent-white mb-8 uppercase tracking-tight text-center">Create New Game</h1>

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

            {/* Storyline Selection */}
            <div>
              <label className="block text-base font-black text-accent-white mb-3 uppercase tracking-wide">
                Choose Your Storyline
              </label>
              <div className="grid gap-4">
                {Object.values(StoryLineType).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setStoryline(type)}
                    className={`text-left p-5 rounded-lg border-4 transition-all transform hover:scale-102 ${
                      storyline === type
                        ? 'border-primary bg-accent-white'
                        : 'border-accent-white bg-transparent hover:bg-accent-white hover:bg-opacity-10'
                    }`}
                  >
                    <div className={`font-black text-lg uppercase ${storyline === type ? 'text-accent-black' : 'text-accent-white'}`}>
                      {STORYLINE_LABELS[type]}
                    </div>
                    <div className={`text-sm font-semibold mt-1 ${storyline === type ? 'text-gray-700' : 'text-accent-white'}`}>
                      {STORYLINE_DESCRIPTIONS[type]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Turns */}
            <div>
              <label className="block text-base font-black text-accent-white mb-3 uppercase tracking-wide">
                Number of Turns: {maxTurns}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                className="w-full h-3 bg-accent-white rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm font-bold text-accent-white mt-2 uppercase">
                <span>Quick (5)</span>
                <span>Standard (10)</span>
                <span>Epic (20)</span>
              </div>
              {errors.maxTurns && (
                <p className="mt-2 text-sm font-bold text-red-500 uppercase">{errors.maxTurns}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-8">
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
                Create Room
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
