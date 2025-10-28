// Input timer component for player input phase

import React, { useEffect, useState } from 'react';

interface InputTimerProps {
  startTime: string | null;  // ISO timestamp
  timeoutSeconds: number;
  onTimeout: () => void;
}

export const InputTimer: React.FC<InputTimerProps> = ({
  startTime,
  timeoutSeconds,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutSeconds);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!startTime) return;

    const calculateTimeRemaining = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      return remaining;
    };

    // Update timer every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && !hasTimedOut) {
        setHasTimedOut(true);
        onTimeout();
      }
    }, 1000);

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    return () => clearInterval(interval);
  }, [startTime, timeoutSeconds, hasTimedOut, onTimeout]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const isUrgent = timeRemaining <= 30;

  return (
    <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded ${
      isUrgent
        ? 'bg-red-500 bg-opacity-10 animate-pulse'
        : 'bg-accent-white bg-opacity-5'
    }`}>
      <svg className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-accent-white opacity-60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`font-bold text-sm ${
        isUrgent ? 'text-red-400' : 'text-accent-white opacity-60'
      }`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className={`text-xs font-semibold uppercase tracking-wide ${
        isUrgent ? 'text-red-400' : 'text-accent-white opacity-50'
      }`}>
        {hasTimedOut ? 'Time\'s Up' : 'remaining'}
      </span>
    </div>
  );
};
