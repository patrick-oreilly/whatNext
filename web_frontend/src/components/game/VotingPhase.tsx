import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Trophy, Dice5 } from 'lucide-react';

import { Card, Button } from '../common';
import { VotingTimer } from './VotingTimer';
import { VotingPanel } from './VotingPanel';
import { StatusDisplay } from './StatusDisplay';
import { Icon } from '../common/Icon';
import { markdownComponents } from './markdownComponents';

import { GameApi } from '../../api/GameApi';
import { useGameStore } from '../../store/gameStore';
import { GamePhase, type VotingResultsResponse } from '../../types';

export const VotingPhase: React.FC = () => {
  const { roomState, currentPlayer, playerToken } = useGameStore();
  const roomId = roomState?.room_id;

  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState<VotingResultsResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Decision data
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

  const timerStartTime = roomState?.voting_phase_start_time ?? null;
  const votingTimeoutSeconds = roomState?.voting_timeout_seconds ?? 60;

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

  // Check if all eligible players have voted
  useEffect(() => {
    if (roomState && roomState.phase === GamePhase.VOTING && roomState.player_inputs.length) {
      const eligible = roomState.players.filter(p => !(roomState.timed_out_players ?? []).includes(p));
      const voters = new Set<string>();
      roomState.player_inputs.forEach(i => {
        if (eligible.includes(i.player_name)) {
          i.voters.forEach(v => voters.add(v));
        }
      });

      if (voters.size === eligible.length && !votingResults) {
        fetchVotingResults();
      }
    }
  }, [roomState, votingResults, fetchVotingResults]);

  const handleVote = async (chosenPlayer: string) => {
    if (!roomId || !currentPlayer) return;
    try {
      await GameApi.castVote({
        room_id: roomId,
        voter: currentPlayer,
        chosen_player: chosenPlayer,
        player_token: playerToken ?? undefined,
      });
      setHasVoted(true);
      // NOTE: Polling in Game.tsx will eventually pick up the updated roomState
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cast vote');
    }
  };

  const handleVotingTimeout = async () => {
    if (!roomId) return;
    try {
      // Check current phase before calling timeout
      const updatedRoom = await GameApi.getRoomState(roomId);
      if (updatedRoom.phase === GamePhase.VOTING) {
        await GameApi.triggerVotingTimeout(roomId);
        await fetchVotingResults();
      }
    } catch {
      setError('An error occurred while handling voting timeout.');
    }
  };

  const handleAdvanceTurn = async () => {
    if (!roomId) return;
    try {
      setShowResults(false);
      setVotingResults(null);
      await GameApi.advanceTurn(roomId);
      // Polling in Game.tsx picks up the new state
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to advance turn');
    }
  };

  if (!roomState || !currentPlayer) return null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-600 border-4 border-accent-white rounded-lg">
          <p className="text-accent-white font-bold uppercase text-center">{error}</p>
        </div>
      )}

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
  );
};
