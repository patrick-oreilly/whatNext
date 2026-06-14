// Story display component with streaming support

import React, { useEffect, useRef } from 'react';
import type { StorySegment } from '../../types';
import { StoryMarkdown } from './StoryMarkdown';
import { Icon } from '../common/Icon';
import { BookOpen } from 'lucide-react';

interface StoryDisplayProps {
  segments: StorySegment[];
  streamingText?: string;
  isStreaming?: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({
  segments,
  streamingText = '',
  isStreaming = false,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, streamingText]);

  return (
    <div className="max-h-[600px] overflow-y-auto bg-accent-white bg-opacity-10 rounded-lg p-6">
      <div className="space-y-8">
        {segments.map((segment, index) => (
          <div key={index} className="border-l-4 border-primary pl-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-primary uppercase tracking-wide">
                Turn {segment.turn}
              </span>
              {segment.winning_player && (
                <span className="text-xs bg-primary text-accent-black font-bold px-3 py-1 rounded-full uppercase">
                  Winner: {segment.winning_player}
                </span>
              )}
            </div>
            <div className="prose prose-invert prose-lg max-w-none">
              <StoryMarkdown>
                {segment.content.paragraph}
              </StoryMarkdown>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="border-l-4 border-primary pl-6">
            <div className="mb-3">
              <span className="text-sm font-black text-primary uppercase tracking-wide">
                Turn {segments.length + 1}
              </span>
            </div>
            <div className="prose prose-invert prose-lg max-w-none">
              <StoryMarkdown>
                {streamingText}
              </StoryMarkdown>
              <span className="inline-block w-2 h-6 bg-primary animate-pulse ml-1 rounded" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {!isStreaming && segments.length === 0 && (
        <div className="text-center text-accent-white py-12">
          <Icon icon={BookOpen} size={72} className="mx-auto mb-4 text-primary" />
          <p className="font-bold text-lg uppercase">Waiting for the story to begin...</p>
        </div>
      )}
    </div>
  );
};
