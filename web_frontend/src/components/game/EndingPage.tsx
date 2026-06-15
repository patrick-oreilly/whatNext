import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '../common';
import { Icon } from '../common/Icon';
import { GameApi } from '../../api/GameApi';
import { useGameStore } from '../../store/gameStore';
import { Flag } from 'lucide-react';
import { markdownComponents } from './markdownComponents';

export const EndingPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, currentPlayer, playerToken } = useGameStore();

  // Only the host finalizes the game (disposes the AI session); every other
  // player just navigates to the results, since the room is already GAME_OVER.
  const isHost = !!currentPlayer && roomState?.players?.[0] === currentPlayer;

  const handleEndGame = async () => {
    if (!roomId) return;
    try {
      if (isHost) {
        await GameApi.endGame(roomId, playerToken);
      }
      navigate(`/gameover/${roomId}`);
    } catch (e) {
      console.error('Failed to end game:', e);
    }
  };

  const endingSummary = (() => {
    if (roomState?.story_history?.length) {
      const lastSegment = roomState.story_history[roomState.story_history.length - 1];
      return lastSegment.content.ending_summary || 'The story has come to an end.';
    }
    return 'The story has come to an end.';
  })();

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-gradient-intense p-8 rounded-lg text-center border-4 border-primary">
        <Icon icon={Flag} size={72} className="mx-auto mb-4 text-primary" />
        <h3 className="text-4xl font-black text-accent-white uppercase mb-6">
          Thanks For Playing!
        </h3>
        <div className="bg-accent-black bg-opacity-50 p-6 rounded-lg mb-6">
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {endingSummary}
            </ReactMarkdown>
          </div>
        </div>
        <Button size="lg" onClick={handleEndGame} className="animate-pulse-glow">
          View Final Results
        </Button>
      </div>
    </div>
  );
};
