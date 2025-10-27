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
    <div className={`text-center p-4 rounded-lg border-4 ${
      isUrgent
        ? 'border-red-500 bg-red-500 bg-opacity-20 animate-pulse'
        : 'border-primary bg-primary bg-opacity-20'
    }`}>
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-6 h-6 text-accent-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`font-black text-2xl uppercase tracking-wide ${
          isUrgent ? 'text-red-400' : 'text-accent-white'
        }`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <p className="text-accent-white font-bold text-sm uppercase tracking-wide mt-2">
        {hasTimedOut ? 'Time\'s Up!' : 'Time Remaining'}
      </p>
    </div>
  );
};
