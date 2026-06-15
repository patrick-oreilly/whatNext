// Voting timer component for voting phase

import React, { useEffect, useState, useRef } from 'react';
import { Icon } from '../common/Icon';
import { Timer } from 'lucide-react';

interface VotingTimerProps {
  startTime: string | null;  // ISO timestamp (used only for phase-change detection)
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
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Reset when a new voting phase starts (detected by startTime change)
  useEffect(() => {
    timeoutTriggeredRef.current = false;
    setHasTimedOut(false);
    setTimeRemaining(timeoutSeconds);
    mountTimeRef.current = Date.now();
  }, [startTime, timeoutSeconds]);

  // Timer effect — uses local mount time, not backend timestamp
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const elapsed = (Date.now() - mountTimeRef.current) / 1000;
      return Math.max(0, timeoutSeconds - elapsed);
    };

    const updateTime = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && !timeoutTriggeredRef.current) {
        timeoutTriggeredRef.current = true;
        setHasTimedOut(true);
        onTimeoutRef.current();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [timeoutSeconds]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const isUrgent = timeRemaining <= 20;

  return (
    <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded ${
      isUrgent
        ? 'bg-red-500 bg-opacity-10 animate-pulse'
        : 'bg-purple-500 bg-opacity-10'
    }`}>
      <Icon
        icon={Timer}
        size={18}
        className={isUrgent ? 'text-red-400' : 'text-purple-400'}
      />
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
