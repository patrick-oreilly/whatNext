// Main Game page - 3-Screen Flow

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button, Card, Spinner } from '../components/common';
import { PlayerStatus } from '../components/game/PlayerStatus';
import { GeneratingStoryPhase } from '../components/game/GeneratingStoryPhase';
import { StoryMarkdown } from '../components/game/StoryMarkdown';
import { markdownComponents } from '../components/game/markdownComponents.tsx';
import { PlayerInputPhase } from '../components/game/PlayerInputPhase';
import { VotingPanel } from '../components/game/VotingPanel';
import { StatusDisplay } from '../components/game/StatusDisplay';
import { VotingTimer } from '../components/game/VotingTimer';
import { Icon } from '../components/common/Icon';
import { GameApi } from '../api/GameApi';
import { useGameStore } from '../store/gameStore';
import { usePolling, useBackgroundMusic } from '../hooks';
import { GamePhase, StoryLineType, type VotingResultsResponse } from '../types';
import { GAME_STATE_POLL_INTERVAL } from '../utils/constants';
import { Dice5, Trophy } from 'lucide-react';

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
  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState<VotingResultsResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [votingTimeoutSeconds, setVotingTimeoutSeconds] = useState<number>(60);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);

  // 4. Derived values (safe — after early returns)

  // 5. fetchVotingResults
  const fetchVotingResults = useCallback(async () => {
    if (!roomId) return;
    try {
      const results = await GameApi.getVotingResults(roomId);
      setVotingResults(results);
      setShowResults(true);
    } catch (e) {
      console.error('Failed to fetch voting results:', e);
    }
  }, [roomId]);

  // 6. fetchRoomState
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

      if (state.phase === GamePhase.VOTING && roomState?.phase !== GamePhase.VOTING) {
        console.log('⏱️ [Game] Setting up VOTING phase timer');
        console.log('⏱️ [Game] voting_phase_start_time from backend:', state.voting_phase_start_time);
        console.log('⏱️ [Game] voting_timeout_seconds from backend:', state.voting_timeout_seconds);
        setTimerStartTime(state.voting_phase_start_time ?? null);
        setVotingTimeoutSeconds(state.voting_timeout_seconds ?? 60);
        setHasVoted(false);
        setVotingResults(null);
        setShowResults(false);
      }

      if (state.phase === GamePhase.VOTING && state.player_inputs.length) {
        const eligible = state.players.filter(p => !(state.timed_out_players ?? []).includes(p));
        const voters = new Set<string>();
        state.player_inputs.forEach(i => {
          if (eligible.includes(i.player_name)) {
            i.voters.forEach(v => voters.add(v));
          }
        });

        if (voters.size === eligible.length && !votingResults) {
          await fetchVotingResults();
        }
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
    roomState?.phase,
    roomState?.turn,
    votingResults,
    fetchVotingResults,
  ]);

  // 7. Polling
  const shouldPoll =
    !!roomId &&
    roomState?.phase !== GamePhase.LOBBY &&
    roomState?.phase !== GamePhase.GAME_OVER;
  usePolling(fetchRoomState, GAME_STATE_POLL_INTERVAL, shouldPoll);

  // 8. Initial load
  useEffect(() => {
    fetchRoomState();
  }, [fetchRoomState]);

  // 9. Debug: Track phase changes
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
  const handleVote = async (chosenPlayer: string) => {
    if (!roomId || !currentPlayer) return;
    await GameApi.castVote({
      room_id: roomId,
      voter: currentPlayer,
      chosen_player: chosenPlayer,
    });
    setHasVoted(true);
    await fetchRoomState();
  };

  const handleAdvanceTurn = async () => {
    if (!roomId) return;
    try {
      setShowResults(false);
      setVotingResults(null);
      await GameApi.advanceTurn(roomId);
      await fetchRoomState();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to advance turn');
    }
  };

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

  const handleVotingTimeout = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ [Game] Voting timeout triggered!');
    console.log('⏰ [Game] Room ID:', roomId);
    console.log('═══════════════════════════════════════════════════════');

    if (!roomId) {
      console.error('❌ [Game] Missing roomId, aborting voting timeout handler');
      return;
    }

    try {
      // Check current phase before calling timeout
      console.log('🔄 [Game] Checking current phase before voting timeout call...');
      const updatedRoom = await GameApi.getRoomState(roomId);
      console.log('📊 [Game] Current phase:', updatedRoom.phase);

      // Only call timeout handler if still in VOTING phase
      if (updatedRoom.phase === GamePhase.VOTING) {
        console.log('📞 [Game] Phase is VOTING, calling voting timeout handler...');
        await GameApi.triggerVotingTimeout(roomId);
        console.log('✅ [Game] Voting timeout handled - calculating winner with current votes');

        // Fetch voting results after timeout
        console.log('🔄 [Game] Fetching voting results...');
        await fetchVotingResults();
        console.log('✅ [Game] Voting results fetched');

        // Refresh room state
        console.log('🔄 [Game] Fetching updated room state...');
        await fetchRoomState();
        console.log('✅ [Game] State refreshed');
      } else {
        console.log('⏩ [Game] Phase already advanced to', updatedRoom.phase);
        console.log('⏩ [Game] Voting already completed, no action needed');
        await fetchRoomState();
      }
    } catch (e) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ [Game] VOTING TIMEOUT HANDLING ERROR!');
      console.error('❌ [Game] Error:', e);
      console.error('═══════════════════════════════════════════════════════');
      setError('An error occurred while handling voting timeout.');
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
              <div className="space-y-6">
                <Card className="bg-accent-black border-4 border-accent-white">
                  <div className="mb-6">
                    {(roomState.timed_out_players ?? []).length > 0 && (
                      <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 p-4 rounded-lg mb-6">
                        <p className="text-accent-white font-bold text-center">
                          Timer: {roomState.timed_out_players!.join(', ')} did not submit in time
                        </p>
                      </div>
                    )}

                    <h2 className="font-display text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
                      {showResults ? 'Voting Results' : 'Vote For The Best Option'}
                    </h2>
                    <div className="h-1 w-full bg-primary rounded mb-6"></div>

                    {!showResults && (
                      <>
                        <StatusDisplay status={resolvedStatus} isFallback={isStatusFallback} />
                        <div className="bg-primary bg-opacity-20 border-2 border-primary p-6 rounded-lg mb-6 prose prose-invert prose-lg max-w-none">
                          <ReactMarkdown
                            components={{
                              ...markdownComponents,
                              p: ({ ...props }) => <p className="text-accent-white font-black text-lg text-center uppercase tracking-wide" {...props} />,
                            }}
                          >
                            {`"${resolvedDecisionPrompt}"`}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>

                  {showResults && votingResults ? (
                    <div className="space-y-6">
                      <div className="bg-gradient-intense p-8 rounded-lg text-center border-4 border-accent-white">
                        <Icon icon={Trophy} size={80} className="mx-auto mb-4 text-accent-white" />

                        {/* Tie Indicator */}
                        {votingResults.was_tie && votingResults.tied_players && votingResults.tied_players.length > 1 && (() => {
                          const maxVotes = Math.max(...Object.values(votingResults.vote_counts));
                          return (
                            <div className="mb-4 bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg p-3">
                              <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wide">
                                <Icon icon={Dice5} size={20} className="text-yellow-400" />
                                <span>
                                  Tie! {votingResults.tied_players.join(', ')} all received {maxVotes}{' '}
                                  {maxVotes === 1 ? 'vote' : 'votes'}
                                </span>
                              </div>
                              <p className="text-accent-white font-semibold text-xs mt-1">
                                Winner selected randomly
                              </p>
                            </div>
                          );
                        })()}

                        <h3 className="text-4xl font-black text-accent-white uppercase mb-2">
                          {votingResults.winning_player} Wins!
                        </h3>
                        <p className="text-accent-white font-bold text-lg mb-4">
                          "{votingResults.winning_input}"
                        </p>
                      </div>

                      <div className="bg-accent-white bg-opacity-10 p-6 rounded-lg">
                        <h4 className="text-xl font-black text-accent-white uppercase mb-4 text-center">
                          Vote Breakdown
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(votingResults.vote_counts).map(([player, voteCount]) => {
                            const votes = Number(voteCount) || 0;
                            return (
                              <div
                                key={player}
                                className="flex justify-between items-center bg-accent-white bg-opacity-10 p-3 rounded"
                              >
                                <span className="font-bold text-accent-white">{player}</span>
                                <span className="text-primary font-black text-xl">
                                  {votes} {votes === 1 ? 'vote' : 'votes'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-center">
                        <Button size="lg" onClick={handleAdvanceTurn} className="animate-pulse-glow">
                          Continue Story
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <VotingTimer
                          startTime={timerStartTime}
                          timeoutSeconds={votingTimeoutSeconds}
                          onTimeout={handleVotingTimeout}
                        />
                      </div>
                      <VotingPanel
                        inputs={roomState.player_inputs}
                        currentPlayer={currentPlayer}
                        onVote={handleVote}
                        hasVoted={hasVoted}
                      />
                    </div>
                  )}
                </Card>
              </div>
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
