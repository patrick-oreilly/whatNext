import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Card } from '../common';
import { Icon } from '../common/Icon';
import { GameApi } from '../../api/GameApi';
import { useGameStore } from '../../store/gameStore';
import { validatePlayerInput } from '../../utils/validation';
import { MIN_INPUT_LENGTH, MAX_INPUT_LENGTH } from '../../utils/constants';
import { CheckCircle2, AlarmClock } from 'lucide-react';
import { StatusDisplay } from './StatusDisplay';
import { StoryMarkdown } from './StoryMarkdown';
import { markdownComponents } from './markdownComponents';

const INPUT_TIMEOUT_SECONDS = 120;

export const PlayerInputPhase: React.FC = () => {
  const { roomState, currentPlayer } = useGameStore();

  const [input, setInput] = useState('');
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [localHasSubmitted, setLocalHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(INPUT_TIMEOUT_SECONDS);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const timeoutFiredRef = useRef(false);

  const roomId = roomState?.room_id;
  const startTime = roomState?.input_phase_start_time ?? null;

  const currentInput = useMemo(
    () => roomState?.player_inputs.find(i => i.player_name === currentPlayer),
    [roomState?.player_inputs, currentPlayer]
  );
  const hasSubmitted = !!currentInput || localHasSubmitted;

  // Decision data - using structured backend response
  const currentDecisionData = useMemo(() => {
    if (!roomState?.story_history?.length) {
      return { decision: null, status: null };
    }
    const last = roomState.story_history[roomState.story_history.length - 1];
    return {
      decision: last.content.decision,
      status: last.content.status,
    };
  }, [roomState?.story_history]);

  const DECISION_FALLBACK = 'How do you respond?';
  const STATUS_FALLBACK = 'Age ?, Turn ?, Status unknown';
  const resolvedDecisionPrompt = currentDecisionData.decision?.trim() || DECISION_FALLBACK;
  const resolvedStatus = currentDecisionData.status?.trim() || STATUS_FALLBACK;
  const isStatusFallback = !currentDecisionData.status;

  useEffect(() => {
    if (!roomState) return;
    const lastSegment = roomState.story_history[roomState.story_history.length - 1];
    if (!currentDecisionData.decision) {
      console.warn('[DecisionMissing]', {
        roomId,
        turn: roomState.turn,
        content: lastSegment?.content ?? '',
      });
    }
    if (!currentDecisionData.status) {
      console.warn('[StatusMissing]', {
        roomId,
        turn: roomState.turn,
        content: lastSegment?.content ?? '',
      });
    }
  }, [roomId, roomState, currentDecisionData.decision, currentDecisionData.status]);

  const handleInputTimeout = useCallback(async () => {
    if (timeoutFiredRef.current || !roomId) return;
    timeoutFiredRef.current = true;

    console.log('⏰ [PlayerInputPhase] Input timeout triggered!');

    try {
      await GameApi.triggerInputTimeout(roomId);
      console.log('✅ [PlayerInputPhase] Backend timeout handler completed');
    } catch (e) {
      console.error('❌ [PlayerInputPhase] Failed to trigger timeout:', e);
      setError('An error occurred while handling the timeout.');
    }
  }, [roomId]);

  // Timer effect
  useEffect(() => {
    if (!startTime) return;

    const calculateTimeRemaining = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      return Math.max(0, INPUT_TIMEOUT_SECONDS - elapsed);
    };

    const remaining = calculateTimeRemaining();
    setTimeRemaining(remaining);

    if (remaining === 0 && !timeoutFiredRef.current) {
      setHasTimedOut(true);
      handleInputTimeout();
      return;
    }

    const interval = setInterval(() => {
      const r = calculateTimeRemaining();
      setTimeRemaining(r);

      if (r === 0 && !timeoutFiredRef.current) {
        setHasTimedOut(true);
        handleInputTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, handleInputTimeout]);

  // Reset input when phase changes (player re-enters)
  useEffect(() => {
    if (!hasSubmitted) {
      setInput('');
      setSubmittedText(null);
      setLocalHasSubmitted(false);
      setError(null);
      setTimeRemaining(INPUT_TIMEOUT_SECONDS);
      setHasTimedOut(false);
      timeoutFiredRef.current = false;
    }
  }, [hasSubmitted]);

  const handleSubmit = async () => {
    const validationError = validatePlayerInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!roomId || !currentPlayer) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await GameApi.submitInput({
        room_id: roomId,
        player_name: currentPlayer,
        input_text: input.trim(),
      });
      setSubmittedText(input.trim());
      setInput('');
      setLocalHasSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = MAX_INPUT_LENGTH - input.length;
  const charCountColor = remainingChars < 50 ? 'text-primary' : 'text-accent-white text-opacity-60';
  const currentValidationError = validatePlayerInput(input);

  const displayText = hasSubmitted ? (submittedText || currentInput?.text) : input;
  const submissionCount = roomState?.player_inputs.length ?? 0;
  const totalPlayers = roomState?.players.length ?? 0;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const isUrgent = timeRemaining <= 30;

  return (
    <div className="space-y-6">
      <Card className="bg-accent-black border-4 border-accent-white">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
            What Next?
          </h2>
          <div className="h-1 w-full bg-primary rounded mb-6"></div>

          {(roomState?.story_history ?? []).length > 0 && (
            <div className="bg-accent-white bg-opacity-10 p-6 rounded-lg mb-6 prose prose-invert prose-lg max-w-none">
              <StoryMarkdown>
                {roomState!.story_history[roomState!.story_history.length - 1].content.paragraph}
              </StoryMarkdown>
            </div>
          )}

          <StatusDisplay status={resolvedStatus} isFallback={isStatusFallback} />

          <div className="text-center mb-8 prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              components={{
                ...markdownComponents,
                p: ({ ...props }) => <p className="text-2xl font-black text-accent-white uppercase tracking-wide" {...props} />,
              }}
            >
              {resolvedDecisionPrompt}
            </ReactMarkdown>
          </div>

          {roomState?.timed_out_players && roomState.timed_out_players.length > 0 && (
            <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 p-4 rounded-lg mb-6">
              <p className="text-accent-white font-bold text-center">
                Timer: {roomState.timed_out_players.join(', ')} did not submit in time
              </p>
            </div>
          )}
        </div>

        <div>
          {hasSubmitted ? (
            <div>
              <div className="bg-primary bg-opacity-20 border-4 border-primary rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-3 text-primary mb-4">
                  <Icon icon={CheckCircle2} size={28} className="text-primary" />
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
              {startTime && (
                <div className="mb-3 flex justify-center">
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
                      {hasTimedOut ? "Time's Up" : 'remaining'}
                    </span>
                  </div>
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
                disabled={!!currentValidationError || isSubmitting || hasTimedOut}
                className="mt-6"
                size="lg"
              >
                Submit Your Idea
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
