// Status display component for AI-generated status information

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface StatusDisplayProps {
  status: string | null;
  isFallback?: boolean;
}

/**
 * Displays game status information (e.g., "Age 15, Score 100")
 * Appears between story text and decision prompt in smaller, muted text
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, isFallback = false }) => {
  if (!status) return null;

  // Format status: replace commas with bullets for cleaner separation
  const formattedStatus = status.replace(/,\s+/g, ' • ');

  return (
    <div className="bg-accent-white bg-opacity-5 border border-accent-white border-opacity-20 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-accent-white text-opacity-60 uppercase tracking-wider font-bold">
          Status:
        </span>
        <div className="text-sm text-accent-white text-opacity-80 font-semibold prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ ...props }) => <span className="text-sm text-accent-white text-opacity-80 font-semibold" {...props} />,
              strong: ({ ...props }) => <strong className="text-primary font-black" {...props} />,
              em: ({ ...props }) => <em className="text-primary-400 font-bold" {...props} />,
            }}
          >
            {formattedStatus}
          </ReactMarkdown>
        </div>
        {isFallback && (
          <span className="text-xs text-yellow-300 text-opacity-80 font-semibold uppercase tracking-wide">
            (placeholder)
          </span>
        )}
      </div>
    </div>
  );
};
