// Input timer component for player input phase

import React, { useEffect, useState } from 'react';
import { Icon } from '../common/Icon';
import { AlarmClock } from 'lucide-react';

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
    console.log('⏱️ [InputTimer] useEffect triggered');
    console.log('⏱️ [InputTimer] startTime:', startTime);
    console.log('⏱️ [InputTimer] timeoutSeconds:', timeoutSeconds);

    if (!startTime) {
      console.warn('⚠️ [InputTimer] No startTime provided, timer will not run');
      return;
    }

    console.log('✅ [InputTimer] Starting timer...');

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
        console.log('⏰⏰⏰ [InputTimer] TIME IS UP! Triggering timeout...');
        console.log('⏰ [InputTimer] hasTimedOut was:', hasTimedOut);
        setHasTimedOut(true);
        console.log('⏰ [InputTimer] Calling onTimeout callback...');
        onTimeout();
        console.log('⏰ [InputTimer] onTimeout callback completed');
      }
    }, 1000);

    // Initial calculation
    const initialRemaining = calculateTimeRemaining();
    console.log('⏱️ [InputTimer] Initial time remaining:', initialRemaining, 'seconds');
    setTimeRemaining(initialRemaining);

    return () => {
      console.log('⏱️ [InputTimer] Cleaning up interval');
      clearInterval(interval);
    };
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
      <Icon
        icon={AlarmClock}
        size={18}
        className={isUrgent ? 'text-red-400' : 'text-accent-white opacity-60'}
      />
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
