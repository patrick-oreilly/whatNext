// Game Over page

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button, Card, Spinner } from '../components/common';
import { roomsApi } from '../api/rooms';
import { useGameStore } from '../store/gameStore';

export const GameOver: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer, reset } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinalState = useCallback(async () => {
    if (!roomId) return;

    try {
      const state = await roomsApi.getRoomState(roomId);
      setRoomState(state);
    } catch (err) {
      console.error('Failed to load final state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, setRoomState]);

  useEffect(() => {
    fetchFinalState();
  }, [fetchFinalState]);

  const handlePlayAgain = () => {
    reset();
    navigate('/');
  };

  const handleDownloadStory = () => {
    if (!roomState) return;

    const storyText = roomState.story_history
      .map((segment) => `Turn ${segment.turn}:\n\n${segment.content}\n\n`)
      .join('---\n\n');

    const blob = new Blob([storyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-${roomId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!roomState) {
    return null;
  }

  const sortedPlayers = Object.entries(roomState.scores).sort((a, b) => b[1] - a[1]);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Winner Announcement */}
          <Card className="text-center mb-8 bg-gradient-intense border-4 border-accent-white">
            <div className="text-8xl mb-6">🏆</div>
            <h1 className="font-display text-6xl font-black text-accent-white uppercase tracking-tight mb-4">
              Game Over!
            </h1>
            <p className="text-3xl text-accent-white font-black uppercase tracking-wide mb-2">
              {winner[0]} Wins!
            </p>
            <p className="text-xl text-accent-white font-bold">
              {winner[1]} {winner[1] === 1 ? 'point' : 'points'}
            </p>
            {winner[0] === currentPlayer && (
              <div className="mt-6 text-2xl text-accent-white font-black uppercase animate-pulse">
                Congratulations! 🎉
              </div>
            )}
          </Card>

          {/* Final Scores */}
          <Card className="mb-8 bg-accent-black border-4 border-accent-white">
            <h2 className="font-display text-3xl font-black text-accent-white uppercase tracking-tight mb-6">
              Final Scores
            </h2>
            <div className="space-y-3">
              {sortedPlayers.map(([player, score], index) => (
                <div
                  key={player}
                  className={`flex items-center justify-between p-5 rounded-lg border-4 ${
                    index === 0
                      ? 'bg-gradient-intense border-primary shadow-lg'
                      : 'border-accent-white border-opacity-30 bg-accent-white bg-opacity-5'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl ${
                      index === 0 ? 'bg-accent-white text-accent-black' : 'bg-primary text-accent-black'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-black text-xl text-accent-white">
                        {player}
                        {player === currentPlayer && <span className="text-sm ml-2">(YOU)</span>}
                      </div>
                      {index === 0 && (
                        <div className="text-sm text-accent-white font-black uppercase tracking-wide">
                          👑 Champion!
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-4xl font-black text-accent-white">{score}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Full Story */}
          <Card className="bg-accent-black border-4 border-accent-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-3xl font-black text-accent-white uppercase tracking-tight">
                Your Story
              </h2>
              <Button variant="outline" size="sm" onClick={handleDownloadStory}>
                Download Story
              </Button>
            </div>
            <div className="max-h-[600px] overflow-y-auto bg-accent-white bg-opacity-10 rounded-lg p-6">
              <div className="space-y-8">
                {roomState.story_history.map((segment, index) => (
                  <div key={index} className="border-l-4 border-primary pl-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-black text-primary uppercase tracking-wide">
                        Turn {segment.turn}
                      </span>
                      {segment.winning_player && (
                        <span className="text-xs bg-primary text-accent-black font-black px-3 py-1 rounded-full uppercase">
                          Winner: {segment.winning_player}
                        </span>
                      )}
                    </div>
                    <div className="prose prose-invert prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ ...props}) => <p className="mb-4 text-accent-white font-semibold text-lg leading-relaxed" {...props} />,
                          strong: ({ ...props}) => <strong className="text-primary font-black" {...props} />,
                          em: ({ ...props}) => <em className="text-primary-400 font-bold" {...props} />,
                          h1: ({ ...props}) => <h1 className="text-3xl font-black text-primary mb-4 uppercase" {...props} />,
                          h2: ({ ...props}) => <h2 className="text-2xl font-black text-primary mb-3 uppercase" {...props} />,
                          h3: ({ ...props}) => <h3 className="text-xl font-black text-primary mb-2 uppercase" {...props} />,
                          ul: ({ ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-accent-white" {...props} />,
                          ol: ({ ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-accent-white" {...props} />,
                          li: ({ ...props}) => <li className="text-accent-white font-semibold" {...props} />,
                          blockquote: ({ ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-accent-white font-semibold" {...props} />,
                        }}
                      >
                        {segment.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-8">
            <Button fullWidth onClick={handlePlayAgain} size="lg">
              Play Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
