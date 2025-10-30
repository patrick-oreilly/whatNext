// Voting timer component for voting phase

import React, { useEffect, useState, useRef } from 'react';

interface VotingTimerProps {
  startTime: string | null;  // ISO timestamp
  timeoutSeconds: number;
  onTimeout: () => void;
}

export const VotingTimer: React.FC<VotingTimerProps> = ({
  startTime,
  timeoutSeconds,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutSeconds);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const onTimeoutRef = useRef(onTimeout);
  const timeoutTriggeredRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    timeoutTriggeredRef.current = false;
    setHasTimedOut(false);
    setTimeRemaining(timeoutSeconds);
  }, [startTime, timeoutSeconds]);

  useEffect(() => {
    console.log('⏱️ [VotingTimer] useEffect triggered');
    console.log('⏱️ [VotingTimer] startTime:', startTime);
    console.log('⏱️ [VotingTimer] timeoutSeconds:', timeoutSeconds);

    if (!startTime) {
      console.warn('⚠️ [VotingTimer] No startTime provided, timer will not run');
      return;
    }

    console.log('✅ [VotingTimer] Starting timer...');

    const calculateTimeRemaining = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      return remaining;
    };

    const updateTime = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && !timeoutTriggeredRef.current) {
        console.log('⏰⏰⏰ [VotingTimer] TIME IS UP! Triggering timeout...');
        timeoutTriggeredRef.current = true;
        setHasTimedOut(true);
        console.log('⏰ [VotingTimer] Calling onTimeout callback...');
        onTimeoutRef.current();
        console.log('⏰ [VotingTimer] onTimeout callback completed');
      }
    };

    updateTime();

    // Update timer every second
    const interval = setInterval(updateTime, 1000);

    return () => {
      console.log('⏱️ [VotingTimer] Cleaning up interval');
      clearInterval(interval);
    };
  }, [startTime, timeoutSeconds]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const isUrgent = timeRemaining <= 20;  // 20 seconds for voting (faster than input)

  return (
    <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded ${
      isUrgent
        ? 'bg-red-500 bg-opacity-10 animate-pulse'
        : 'bg-purple-500 bg-opacity-10'
    }`}>
      <svg className={`w-4 h-4 ${
        isUrgent ? 'text-red-400' : 'text-purple-400'
      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`font-bold text-sm ${
        isUrgent ? 'text-red-400' : 'text-purple-400'
      }`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className={`text-xs font-semibold uppercase tracking-wide ${
        isUrgent ? 'text-red-400' : 'text-purple-300'
      }`}>
        {hasTimedOut ? 'Time\'s Up' : 'voting'}
      </span>
    </div>
  );
};
