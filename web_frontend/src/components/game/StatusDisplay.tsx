// Status display component for AI-generated status information

import React from 'react';
import { formatStatus } from '../../utils/storyHelpers';

interface StatusDisplayProps {
  status: string | null;
}

/**
 * Displays game status information (e.g., "Age 15, Score 100")
 * Appears between story text and decision prompt in smaller, muted text
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  if (!status) return null;

  return (
    <div className="bg-accent-white bg-opacity-5 border border-accent-white border-opacity-20 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-accent-white text-opacity-60 uppercase tracking-wider font-bold">
          Status:
        </span>
        <span className="text-sm text-accent-white text-opacity-80 font-semibold">
          {formatStatus(status)}
        </span>
      </div>
    </div>
  );
};
