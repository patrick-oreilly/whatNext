// Story display component with streaming support

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { StorySegment } from '../../types';
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
                {segment.content.paragraph}
              </ReactMarkdown>
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
                {streamingText}
              </ReactMarkdown>
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
