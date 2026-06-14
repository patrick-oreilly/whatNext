import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, Button, Spinner } from '../common';
import { StoryDisplay } from './StoryDisplay';
import { Icon } from '../common/Icon';
import { GameApi } from '../../api/GameApi';
import { useGameStore } from '../../store/gameStore';
import { Flag } from 'lucide-react';
import { markdownComponents } from './markdownComponents.tsx';

interface GeneratingStoryPhaseProps {
  roomId: string;
  onContinue: () => void;
  onEndGame: () => void;
}

export const GeneratingStoryPhase: React.FC<GeneratingStoryPhaseProps> = ({
  roomId,
  onContinue,
  onEndGame,
}) => {
  const { roomState } = useGameStore();
  const endRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastStreamedTurn, setLastStreamedTurn] = useState<number | null>(null);
  const [showEndingPage, setShowEndingPage] = useState(false);

  const startStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    setIsStreaming(true);
    setStreamedText('');

    cleanupRef.current = GameApi.createStoryStream(roomId, {
      onChunk: (text) => {
        setStreamedText((prev) => prev + text);
      },
      onComplete: () => {
        setIsStreaming(false);
        cleanupRef.current = null;
      },
      onError: () => {
        setIsStreaming(false);
        cleanupRef.current = null;
      },
    });
  }, [roomId]);

  useEffect(() => {
    if (
      roomState?.phase === 'generating_story' &&
      !isStreaming &&
      roomState.turn !== lastStreamedTurn
    ) {
      startStream();
      setLastStreamedTurn(roomState.turn);
    }
  }, [roomState?.phase, roomState?.turn, isStreaming, lastStreamedTurn, startStream]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedText, roomState?.story_history]);

  useEffect(() => {
    if (roomState?.story_has_ended) {
      setShowEndingPage(true);
      return;
    }

    if (roomState?.story_history?.length) {
      const lastSegment = roomState.story_history[roomState.story_history.length - 1];
      if (lastSegment.content.has_story_ended) {
        setShowEndingPage(true);
      }
    }
  }, [isStreaming, streamedText, roomState?.story_has_ended, roomState?.story_history]);

  return (
    <div className="space-y-6">
      <Card className="bg-accent-black border-4 border-accent-white">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-primary uppercase tracking-tight mb-2">
            The Story So Far...
          </h2>
          <div className="h-1 w-20 bg-primary rounded"></div>
        </div>

        <StoryDisplay
          segments={roomState?.story_history ?? []}
          streamingText={streamedText}
          isStreaming={isStreaming}
        />

        {showEndingPage && (
          <div className="mt-8 space-y-6">
            <div className="bg-gradient-intense p-8 rounded-lg text-center border-4 border-primary">
              <Icon icon={Flag} size={72} className="mx-auto mb-4 text-primary" />
              <h3 className="text-4xl font-black text-accent-white uppercase mb-6">
                Thanks For Playing!
              </h3>
              <div className="bg-accent-black bg-opacity-50 p-6 rounded-lg mb-6">
                <div className="prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown components={markdownComponents}>
                    {(() => {
                      if (roomState?.story_history?.length) {
                        const lastSegment = roomState.story_history[roomState.story_history.length - 1];
                        return lastSegment.content.ending_summary || 'The story has come to an end.';
                      }
                      return 'The story has come to an end.';
                    })()}
                  </ReactMarkdown>
                </div>
              </div>
              <Button size="lg" onClick={onEndGame} className="animate-pulse-glow">
                View Final Results
              </Button>
            </div>
          </div>
        )}

        {!isStreaming && !showEndingPage && streamedText && (
          <div className="mt-8 text-center">
            <Button size="lg" onClick={onContinue} className="animate-pulse-glow">
              Continue
            </Button>
          </div>
        )}

        {isStreaming && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-3 text-primary font-black uppercase">
              <Spinner />
              <span>AI is creating the story...</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
