import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { usePolling, useBackgroundMusic } from '../hooks';
import { GameApi } from '../api/GameApi';
import { GamePhase, StoryLineType } from '../types';
import { GeneratingStoryPhase } from '../components/game/GeneratingStoryPhase';
import { PlayerInputPhase } from '../components/game/PlayerInputPhase';
import { VotingPhase } from '../components/game/VotingPhase';
import { EndingPage } from '../components/game/EndingPage';
import { GameLayout } from '../components/game/GameLayout';
import { Spinner } from '../components/common';
import { GAME_STATE_POLL_INTERVAL } from '../utils/constants';

export const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, setRoomState, currentPlayer } = useGameStore();

  useBackgroundMusic({
    audioPath: '/sunflower-west.mp3',
    enabled: roomState?.storyline === StoryLineType.SUNFLOWER_WEST && 
             roomState?.phase !== GamePhase.LOBBY && 
             roomState?.phase !== GamePhase.GAME_OVER,
    volume: 0.3, loop: true,
  });

  const fetchState = useCallback(async () => {
    if (!roomId) return;
    const state = await GameApi.getRoomState(roomId);
    setRoomState(state);
    if (state.phase === GamePhase.GAME_OVER) navigate(`/gameover/${roomId}`);
    if (state.phase === GamePhase.LOBBY) navigate(`/lobby/${roomId}`);
  }, [roomId, navigate, setRoomState]);

  usePolling(fetchState, GAME_STATE_POLL_INTERVAL, !!roomId && roomState?.phase !== GamePhase.GAME_OVER && roomState?.phase !== GamePhase.LOBBY);

  useEffect(() => { fetchState(); }, [fetchState]);

  if (!roomState || !currentPlayer || !roomId) return <Spinner size="lg" />;

  const isEnding = roomState.story_has_ended || 
    (roomState.story_history?.length > 0 && roomState.story_history[roomState.story_history.length - 1].content.has_story_ended);

  const getPhaseComponent = () => {
    if (isEnding) return <EndingPage />;
    switch (roomState.phase) {
      case GamePhase.GENERATING_STORY: return <GeneratingStoryPhase roomId={roomId} onContinue={fetchState} />;
      case GamePhase.PLAYER_INPUT: return <PlayerInputPhase />;
      case GamePhase.VOTING: return <VotingPhase />;
      default: return null;
    }
  };

  return <GameLayout roomId={roomId}>{getPhaseComponent()}</GameLayout>;
};
