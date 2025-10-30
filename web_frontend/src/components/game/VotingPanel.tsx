// Voting panel component

import React, { useState } from 'react';
import { Button } from '../common';
import type { PlayerInput } from '../../types';
import { Icon } from '../common/Icon';
import { Check, CheckCircle2, CircleHelp } from 'lucide-react';

interface VotingPanelProps {
  inputs: PlayerInput[];
  currentPlayer: string | null;
  onVote: (chosenPlayer: string) => Promise<void>;
  hasVoted: boolean;
}

export const VotingPanel: React.FC<VotingPanelProps> = ({
  inputs,
  currentPlayer,
  onVote,
  hasVoted,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    if (!selectedPlayer) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onVote(selectedPlayer);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to cast vote');
      } else {
        setError('An unknown error occurred.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {hasVoted ? (
        <div className="bg-primary bg-opacity-20 border-4 border-primary rounded-lg p-8 text-center">
          <div className="flex items-center justify-center space-x-3 text-primary mb-3">
            <Icon icon={CheckCircle2} size={32} className="text-primary" />
            <span className="font-black uppercase text-2xl tracking-wide">Vote Submitted!</span>
          </div>
          <p className="text-accent-white font-bold text-lg uppercase tracking-wide">
            Waiting for others to vote...
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-4 mb-6">
            {inputs
              .filter((input) => input.player_name !== currentPlayer)
              .map((input, index) => (
                <button
                  key={input.player_name}
                  onClick={() => setSelectedPlayer(input.player_name)}
                  className={`w-full text-left p-6 rounded-lg border-4 transition-all transform hover:scale-[1.02] ${
                    selectedPlayer === input.player_name
                      ? 'border-primary bg-primary bg-opacity-20 shadow-lg'
                      : 'border-accent-white border-opacity-30 bg-accent-white bg-opacity-5 hover:border-primary hover:border-opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-black text-primary uppercase tracking-wide">
                      Option {index + 1}
                    </span>
                    {selectedPlayer === input.player_name && (
                      <Icon icon={Check} size={24} className="text-primary" strokeWidth={3} />
                    )}
                  </div>
                  <p className="text-accent-white font-semibold text-base leading-relaxed whitespace-pre-wrap">
                    {input.text}
                  </p>
                </button>
              ))}

            {inputs.filter((i) => i.player_name !== currentPlayer).length === 0 && (
              <div className="text-center py-12 bg-accent-white bg-opacity-10 rounded-lg">
                <Icon icon={CircleHelp} size={72} className="mx-auto mb-4 text-primary" />
                <p className="text-accent-white font-bold text-lg uppercase tracking-wide">
                  No options to vote for
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-600 border-2 border-accent-white rounded-lg">
              <p className="text-accent-white font-bold uppercase text-center">{error}</p>
            </div>
          )}

          <Button
            fullWidth
            onClick={handleVote}
            loading={isSubmitting}
            disabled={!selectedPlayer}
            size="lg"
          >
            Cast Your Vote
          </Button>
        </div>
      )}
    </div>
  );
};
