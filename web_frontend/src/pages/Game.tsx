// Main Game page - 3-Screen Flow

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '../components/common';
import { PlayerStatus } from '../components/game/PlayerStatus';
import { StoryDisplay } from '../components/game/StoryDisplay';
import { PlayerInput } from '../components/game/PlayerInput';
import { VotingPanel } from '../components/game/VotingPanel';
import { StatusDisplay } from '../components/game/StatusDisplay';
import { InputTimer } from '../components/game/InputTimer';
import { roomsApi } from '../api/rooms';
import { gameplayApi } from '../api/gameplay';
import { useGameStore } from '../store/gameStore';
import { useSSE, usePolling, useBackgroundMusic } from '../hooks';
import { GamePhase, StoryLineType } from '../types';
import { GAME_STATE_POLL_INTERVAL } from '../utils/constants';
import { extractDecisionPrompt, extractStatus, cleanStoryText } from '../utils/storyHelpers';

export const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer } = useGameStore();
  const { streamedText, isStreaming, startStream } = useSSE();

  // Play background music for Sunflower West storyline
  useBackgroundMusic({
    audioPath: '/sunflower-west.mp3',
    enabled: roomState?.storyline === StoryLineType.SUNFLOWER_WEST &&
             roomState?.phase !== GamePhase.LOBBY &&
             roomState?.phase !== GamePhase.GAME_OVER,
    volume: 0.3,
    loop: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmittedInput, setHasSubmittedInput] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastStreamedTurn, setLastStreamedTurn] = useState<number | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
  const [timedOutPlayers, setTimedOutPlayers] = useState<string[]>([]);

  // Extract decision prompt and status from the last story segment
  const currentDecisionData = useMemo(() => {
    if (roomState?.story_history && roomState.story_history.length > 0) {
      const lastSegment = roomState.story_history[roomState.story_history.length - 1];
      return {
        decision: extractDecisionPrompt(lastSegment.content),
        status: extractStatus(lastSegment.content)
      };
    }
    return { decision: null, status: null };
  }, [roomState?.story_history]);

  // Fetch room state
  const fetchRoomState = async () => {
    if (!roomId) return;

    try {
      const state = await roomsApi.getRoomState(roomId);
      setRoomState(state);

      // Update timer information
      if (state.phase === GamePhase.PLAYER_INPUT) {
        setTimerStartTime(state.input_phase_start_time || null);
        setTimedOutPlayers(state.timed_out_players || []);
      }

      // Check if phase changed
      if (state.phase === GamePhase.GAME_OVER) {
        navigate(`/gameover/${roomId}`);
      } else if (state.phase === GamePhase.LOBBY) {
        navigate(`/lobby/${roomId}`);
      }

      // Reset submission/vote flags on phase change
      if (state.phase === GamePhase.PLAYER_INPUT && roomState?.phase !== GamePhase.PLAYER_INPUT) {
        setHasSubmittedInput(false);
      }
      if (state.phase === GamePhase.VOTING && roomState?.phase !== GamePhase.VOTING) {
        setHasVoted(false);
        setVotingResults(null);
        setShowResults(false);
      }

      // Reset streaming turn tracker when advancing to next turn
      if (state.turn !== roomState?.turn) {
        setLastStreamedTurn(null);
      }

      // Check if all players have voted
      if (state.phase === GamePhase.VOTING && state.player_inputs.length > 0) {
        // Get unique voters across all inputs
        const uniqueVoters = new Set<string>();
        state.player_inputs.forEach(input => {
          input.voters.forEach(voter => uniqueVoters.add(voter));
        });

        // Calculate eligible voters (exclude timed-out players who cannot vote)
        const eligibleVoters = state.players.filter(
          player => !(state.timed_out_players || []).includes(player)
        );

        const totalVotes = state.player_inputs.reduce((sum, input) => sum + input.votes, 0);
        const allVoted = uniqueVoters.size === eligibleVoters.length;

        console.log('Vote check:', {
          phase: state.phase,
          totalVotes,
          uniqueVotersCount: uniqueVoters.size,
          uniqueVoters: Array.from(uniqueVoters),
          playerCount: state.players.length,
          players: state.players,
          eligibleVoterCount: eligibleVoters.length,
          eligibleVoters: eligibleVoters,
          timedOutPlayers: state.timed_out_players,
          allVoted,
          hasResults: !!votingResults,
          playerInputs: state.player_inputs.map(i => ({ player: i.player_name, votes: i.votes, voters: i.voters }))
        });

        if (allVoted && !votingResults) {
          console.log('✅ All eligible players have voted! Fetching voting results...');
          // Fetch voting results
          fetchVotingResults();
        }
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates
  usePolling(fetchRoomState, GAME_STATE_POLL_INTERVAL, !!roomId);

  // Initial load
  useEffect(() => {
    fetchRoomState();
  }, [roomId]);

  // Start streaming when phase is GENERATING_STORY
  useEffect(() => {
    if (
      roomState?.phase === GamePhase.GENERATING_STORY &&
      !isStreaming &&
      roomId &&
      roomState.turn !== lastStreamedTurn
    ) {
      console.log(`Starting stream for room ${roomId}, turn ${roomState.turn}`);
      startStream(roomId);
      setLastStreamedTurn(roomState.turn);
    }
  }, [roomState?.phase, roomState?.turn, roomId, isStreaming, lastStreamedTurn, startStream]);

  const handleSubmitInput = async (text: string) => {
    if (!roomId || !currentPlayer) return;

    await gameplayApi.submitInput({
      room_id: roomId,
      player_name: currentPlayer,
      input_text: text,
    });

    setHasSubmittedInput(true);
    await fetchRoomState();
  };

  const handleVote = async (chosenPlayer: string) => {
    if (!roomId || !currentPlayer) return;

    await gameplayApi.castVote({
      room_id: roomId,
      voter: currentPlayer,
      chosen_player: chosenPlayer,
    });

    setHasVoted(true);
    await fetchRoomState();
  };

  const fetchVotingResults = async () => {
    if (!roomId) return;

    try {
      const results = await gameplayApi.getVotingResults(roomId);
      setVotingResults(results);
      setShowResults(true);
    } catch (err: any) {
      console.error('Failed to fetch voting results:', err);
    }
  };

  const handleAdvanceTurn = async () => {
    if (!roomId) return;

    try {
      setShowResults(false);
      setVotingResults(null);
      await gameplayApi.advanceTurn(roomId);
      await fetchRoomState();
    } catch (err: any) {
      setError(err.message || 'Failed to advance turn');
    }
  };

  const handleContinue = async () => {
    if (!roomId) return;

    try {
      // Move to next phase (player input)
      await fetchRoomState();
    } catch (err: any) {
      setError(err.message || 'Failed to continue');
    }
  };

  const handleInputTimeout = async () => {
    if (!roomId) return;

    try {
      await gameplayApi.triggerInputTimeout(roomId);
      await fetchRoomState();
    } catch (err: any) {
      console.error('Failed to handle timeout:', err);
    }
  };

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
          <div className="text-primary text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-black text-accent-white uppercase mb-4">Error</h2>
          <p className="text-accent-white font-bold mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  if (!roomState || !currentPlayer) {
    return null;
  }

  const currentInput = roomState.player_inputs.find((i) => i.player_name === currentPlayer);

  return (
    <div className="min-h-screen py-6">
      <div className="container mx-auto px-4">
        {/* Game Header */}
        <div className="mb-6 bg-accent-black border-4 border-accent-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-accent-white uppercase tracking-tight">
                What's Next
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
          {/* Main Content Area - 3 columns */}
          <div className="lg:col-span-3">

            {/* SCREEN 1: NARRATIVE SETUP (Generating Story Phase) */}
            {roomState.phase === GamePhase.GENERATING_STORY && (
              <div className="space-y-6">
                <Card className="bg-accent-black border-4 border-accent-white">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-primary uppercase tracking-tight mb-2">
                      The Story So Far...
                    </h2>
                    <div className="h-1 w-20 bg-primary rounded"></div>
                  </div>

                  <StoryDisplay
                    segments={roomState.story_history}
                    streamingText={streamedText}
                    isStreaming={isStreaming}
                  />

                  {!isStreaming && streamedText && (
                    <div className="mt-8 text-center">
                      <Button
                        size="lg"
                        onClick={handleContinue}
                        className="animate-pulse-glow"
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {isStreaming && (
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center space-x-3 text-primary font-black uppercase">
                        <Spinner />
                        <span>AI is creating the story...</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* SCREEN 2: DECISION INPUT PHASE (Player Input Phase) */}
            {roomState.phase === GamePhase.PLAYER_INPUT && (
              <div className="space-y-6">
                <Card className="bg-accent-black border-4 border-accent-white">
                  <div className="mb-6">
                    {/* Timer Display */}
                    {timerStartTime && (
                      <div className="mb-6">
                        <InputTimer
                          startTime={timerStartTime}
                          timeoutSeconds={120}
                          onTimeout={handleInputTimeout}
                        />
                      </div>
                    )}

                    <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
                      What Next?
                    </h2>
                    <div className="h-1 w-full bg-primary rounded mb-6"></div>

                    {/* Show the last story segment as context */}
                    {roomState.story_history.length > 0 && (
                      <div className="bg-accent-white bg-opacity-10 p-6 rounded-lg mb-6">
                        <p className="text-accent-white font-semibold text-lg leading-relaxed">
                          {cleanStoryText(roomState.story_history[roomState.story_history.length - 1].content)}
                        </p>
                      </div>
                    )}

                    {/* Status display (if present) */}
                    <StatusDisplay status={currentDecisionData.status} />

                    <div className="text-center mb-8">
                      <p className="text-2xl font-black text-accent-white uppercase tracking-wide">
                        {currentDecisionData.decision || "What will the character do next?"}
                      </p>
                    </div>
                  </div>

                  <PlayerInput
                    onSubmit={handleSubmitInput}
                    hasSubmitted={hasSubmittedInput || !!currentInput}
                    submissionCount={roomState.player_inputs.length}
                    totalPlayers={roomState.players.length}
                  />
                </Card>
              </div>
            )}

            {/* SCREEN 3: VOTING PHASE */}
            {roomState.phase === GamePhase.VOTING && (
              <div className="space-y-6">
                <Card className="bg-accent-black border-4 border-accent-white">
                  <div className="mb-6">
                    {/* Show timed out players */}
                    {timedOutPlayers.length > 0 && (
                      <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 p-4 rounded-lg mb-6">
                        <p className="text-accent-white font-bold text-center">
                          ⏰ {timedOutPlayers.join(', ')} did not submit in time
                        </p>
                      </div>
                    )}

                    <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
                      {showResults ? 'Voting Results' : 'Vote For The Best Option'}
                    </h2>
                    <div className="h-1 w-full bg-primary rounded mb-6"></div>

                    {/* Decision Reminder */}
                    {!showResults && (
                      <>
                        {/* Status display (if present) */}
                        <StatusDisplay status={currentDecisionData.status} />

                        <div className="bg-primary bg-opacity-20 border-2 border-primary p-6 rounded-lg mb-6">
                          <p className="text-accent-white font-black text-lg text-center uppercase tracking-wide">
                            "{currentDecisionData.decision || "What will the character do next?"}"
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {showResults && votingResults ? (
                    <div className="space-y-6">
                      {/* Winner Announcement */}
                      <div className="bg-gradient-intense p-8 rounded-lg text-center border-4 border-accent-white">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-4xl font-black text-accent-white uppercase mb-2">
                          {votingResults.winning_player} Wins!
                        </h3>
                        <p className="text-accent-white font-bold text-lg mb-4">
                          "{votingResults.winning_input}"
                        </p>
                      </div>

                      {/* Vote Counts */}
                      <div className="bg-accent-white bg-opacity-10 p-6 rounded-lg">
                        <h4 className="text-xl font-black text-accent-white uppercase mb-4 text-center">
                          Vote Breakdown
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(votingResults.vote_counts).map(([player, votes]: [string, any]) => (
                            <div key={player} className="flex justify-between items-center bg-accent-white bg-opacity-10 p-3 rounded">
                              <span className="font-bold text-accent-white">{player}</span>
                              <span className="text-primary font-black text-xl">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Continue Button */}
                      <div className="text-center">
                        <Button
                          size="lg"
                          onClick={handleAdvanceTurn}
                          className="animate-pulse-glow"
                        >
                          Continue Story
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <VotingPanel
                      inputs={roomState.player_inputs}
                      currentPlayer={currentPlayer}
                      onVote={handleVote}
                      hasVoted={hasVoted}
                    />
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar - Player Status (Persistent) - 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
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
