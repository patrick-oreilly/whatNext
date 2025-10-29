// Player input component for story continuation

import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { InputTimer } from './InputTimer';
import { validatePlayerInput } from '../../utils/validation';
import { MIN_INPUT_LENGTH, MAX_INPUT_LENGTH } from '../../utils/constants';

interface PlayerInputProps {
  onSubmit: (text: string) => Promise<void>;
  hasSubmitted: boolean;
  submissionCount: number;
  totalPlayers: number;
  timerStartTime?: string | null;
  onTimeout?: (currentInput: string) => void;
}

export const PlayerInput: React.FC<PlayerInputProps> = ({
  onSubmit,
  hasSubmitted,
  submissionCount,
  totalPlayers,
  timerStartTime,
  onTimeout,
}) => {
  const [input, setInput] = useState('');
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset input when player re-enters input phase
  useEffect(() => {
    if (!hasSubmitted) {
      setInput('');
      setSubmittedText(null);
      setError(null);
    }
  }, [hasSubmitted]);

  const handleSubmit = async () => {
    const validationError = validatePlayerInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(input.trim());
      setSubmittedText(input.trim()); // Save what was submitted
      setInput('');                    // Clear draft
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeout = () => {
    console.log('⏰ [PlayerInput] handleTimeout called');
    console.log('⏰ [PlayerInput] Draft input:', input);
    console.log('⏰ [PlayerInput] Draft length:', input.length);
    console.log('⏰ [PlayerInput] This draft will NOT be submitted (policy: manual submit only)');

    if (onTimeout) {
      console.log('⏰ [PlayerInput] Calling parent onTimeout handler (draft will be discarded)');
      onTimeout(input);
      // Don't set submittedText - player didn't actually submit
      setInput('');
      setError('Time\'s up! Your draft was not submitted. Only manual submission (button click) counts.');
    } else {
      console.warn('⚠️ [PlayerInput] No onTimeout handler provided!');
    }
  };

  const remainingChars = MAX_INPUT_LENGTH - input.length;
  const charCountColor = remainingChars < 50 ? 'text-primary' : 'text-accent-white text-opacity-60';
  const currentValidationError = validatePlayerInput(input);

  const displayText = hasSubmitted ? submittedText : input;

  return (
    <div>
      {hasSubmitted ? (
        <div>
          <div className="bg-primary bg-opacity-20 border-4 border-primary rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3 text-primary mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-black uppercase text-lg tracking-wide">Submitted!</span>
            </div>
            <p className="text-accent-white font-semibold text-base leading-relaxed whitespace-pre-wrap">
              {displayText || '(empty)'}
            </p>
          </div>

          <div className="bg-accent-white bg-opacity-10 p-4 rounded-lg text-center">
            <p className="text-accent-white font-bold text-lg uppercase tracking-wide">
              Waiting for others... ({submissionCount}/{totalPlayers} submitted)
            </p>
          </div>
        </div>
      ) : (
        <div>
          {/* Timer */}
          {timerStartTime && onTimeout && (
            <div className="mb-3 flex justify-center">
              <InputTimer
                startTime={timerStartTime}
                timeoutSeconds={120}
                onTimeout={handleTimeout}
              />
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what happens next in the story..."
            className="w-full h-40 p-4 bg-accent-white bg-opacity-10 border-4 border-accent-white rounded-lg text-accent-white font-semibold text-base placeholder-accent-white placeholder-opacity-40 focus:ring-4 focus:ring-primary focus:border-primary resize-none"
            maxLength={MAX_INPUT_LENGTH}
          />

          <div className="flex justify-between items-center mt-3 text-sm">
            <span className={`font-bold uppercase tracking-wide ${charCountColor}`}>
              {remainingChars} characters remaining
            </span>
            <span className="text-accent-white text-opacity-60 font-bold uppercase tracking-wide">
              Min: {MIN_INPUT_LENGTH} characters
            </span>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-600 border-2 border-accent-white rounded-lg">
              <p className="text-accent-white font-bold uppercase text-center">{error}</p>
            </div>
          )}

          <Button
            fullWidth
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!!currentValidationError || isSubmitting}
            className="mt-6"
            size="lg"
          >
            Submit Your Idea
          </Button>
        </div>
      )}
    </div>
  );
};