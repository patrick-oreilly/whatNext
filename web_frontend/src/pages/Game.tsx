// Main Game page - 3-Screen Flow

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button, Card, Spinner } from '../components/common';
import { PlayerStatus } from '../components/game/PlayerStatus';
import { GeneratingStoryPhase } from '../components/game/GeneratingStoryPhase';
import { StoryMarkdown } from '../components/game/StoryMarkdown';
import { markdownComponents } from '../components/game/markdownComponents';
import { PlayerInputPhase } from '../components/game/PlayerInputPhase';
import { VotingPhase } from '../components/game/VotingPhase';
import { StatusDisplay } from '../components/game/StatusDisplay';
import { GameApi } from '../api/GameApi';
import { useGameStore } from '../store/gameStore';
import { usePolling, useBackgroundMusic } from '../hooks';
import { GamePhase, StoryLineType } from '../types';
import { GAME_STATE_POLL_INTERVAL } from '../utils/constants';

export const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer } = useGameStore();

  /* -----------------------------------------------------------------------
     ALL HOOKS — TOP LEVEL, BEFORE ANY RETURN
     ----------------------------------------------------------------------- */

  // 1. Decision data - using structured backend response
  const currentDecisionData = useMemo(() => {
    if (!roomState?.story_history?.length) {
      return { decision: null, status: null };
    }
    const last = roomState.story_history[roomState.story_history.length - 1];
    // Backend now sends structured data with decision and status fields
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

  // 2. Background music
  useBackgroundMusic({
    audioPath: '/sunflower-west.mp3',
    enabled:
      roomState?.storyline === StoryLineType.SUNFLOWER_WEST &&
      roomState?.phase !== GamePhase.LOBBY &&
      roomState?.phase !== GamePhase.GAME_OVER,
    volume: 0.3,
    loop: true,
  });

  // 3. State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4. fetchRoomState
  const fetchRoomState = useCallback(async () => {
    if (!roomId) return;

    try {
      console.log('🔄 [fetchRoomState] Fetching room state from API...');
      const state = await GameApi.getRoomState(roomId);
      console.log('📥 [fetchRoomState] Received state from API:', {
        phase: state.phase,
        turn: state.turn,
        player_inputs: state.player_inputs.length,
        timed_out_players: state.timed_out_players
      });

      console.log('💾 [fetchRoomState] Updating React state with setRoomState...');
      setRoomState(state);
      console.log('✅ [fetchRoomState] React state updated');

      if (state.phase === GamePhase.GAME_OVER) {
        navigate(`/gameover/${roomId}`);
        return;
      }
      if (state.phase === GamePhase.LOBBY) {
        navigate(`/lobby/${roomId}`);
        return;
      }

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [
    roomId,
    setRoomState,
    navigate,
  ]);

  // 5. Polling
  const shouldPoll =
    !!roomId &&
    roomState?.phase !== GamePhase.LOBBY &&
    roomState?.phase !== GamePhase.GAME_OVER;
  usePolling(fetchRoomState, GAME_STATE_POLL_INTERVAL, shouldPoll);

  // 6. Initial load
  useEffect(() => {
    fetchRoomState();
  }, [fetchRoomState]);

  // 7. Debug: Track phase changes
  useEffect(() => {
    if (roomState) {
      console.log('🎭 [Game] COMPONENT STATE UPDATED - Current phase:', roomState.phase);
      console.log('🎭 [Game] Turn:', roomState.turn);
      console.log('🎭 [Game] Player inputs:', roomState.player_inputs.length);
    }
  }, [roomState]);

  useEffect(() => {
    if (!roomState || roomState.phase !== GamePhase.PLAYER_INPUT) {
      return;
    }
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
  }, [
    roomId,
    roomState,
    currentDecisionData.decision,
    currentDecisionData.status,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !roomState) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto text-center bg-accent-black border-4 border-accent-white">
          <div className="text-primary text-6xl mb-4">Warning</div>
          <h2 className="font-display text-3xl font-black text-accent-white uppercase mb-4">
            Error
          </h2>
          <p className="text-accent-white font-bold mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  if (!roomState || !currentPlayer) return null;

  /* -----------------------------------------------------------------------
     Handlers (after hooks)
     ----------------------------------------------------------------------- */
  const handleContinue = async () => {
    if (!roomId) return;
    try {
      await fetchRoomState();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to continue');
    }
  };

  const handleEndGame = async () => {
    if (!roomId) return;
    try {
      console.log('🏁 Story has ended, calling endGame API to transition to GAME_OVER');
      await GameApi.endGame(roomId);
      navigate(`/gameover/${roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end game');
    }
  };

  /* -----------------------------------------------------------------------
     Render
     ----------------------------------------------------------------------- */
  return (
    <div className="min-h-screen py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 bg-accent-black border-4 border-accent-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-black text-accent-white uppercase tracking-tight">
                What Next?
              </h1>
              <p className="text-primary font-bold text-lg mt-1">
                Turn {roomState.turn} of {roomState.max_turns}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-accent-white uppercase tracking-wide">
                Room: {roomId}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-600 border-4 border-accent-white rounded-lg">
            <p className="text-accent-white font-bold uppercase text-center">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main column */}
          <div className="lg:col-span-3">
            {/* GENERATING_STORY */}
            {roomState.phase === GamePhase.GENERATING_STORY && (
              <GeneratingStoryPhase
                roomId={roomId!}
                onContinue={handleContinue}
                onEndGame={handleEndGame}
              />
            )}

            {/* PLAYER_INPUT */}
            {roomState.phase === GamePhase.PLAYER_INPUT && (
              <div className="space-y-6">
                <Card className="bg-accent-black border-4 border-accent-white">
                  <div className="mb-6">
                    <h2 className="font-display text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
                      What Next?
                    </h2>
                    <div className="h-1 w-full bg-primary rounded mb-6"></div>

                    {roomState.story_history.length > 0 && (
                      <div className="bg-accent-white bg-opacity-10 p-6 rounded-lg mb-6 prose prose-invert prose-lg max-w-none">
                        <StoryMarkdown>
                          {roomState.story_history[roomState.story_history.length - 1].content.paragraph}
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

                    {roomState.timed_out_players && roomState.timed_out_players.length > 0 && (
                      <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 p-4 rounded-lg mb-6">
                        <p className="text-accent-white font-bold text-center">
                          Timer: {roomState.timed_out_players.join(', ')} did not submit in time
                        </p>
                      </div>
                    )}
                  </div>

                  <PlayerInputPhase />
                </Card>
              </div>
            )}

            {/* VOTING */}
            {roomState.phase === GamePhase.VOTING && (
              <VotingPhase />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <PlayerStatus
                players={roomState.players}
                scores={roomState.scores}
                currentPlayer={currentPlayer}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
