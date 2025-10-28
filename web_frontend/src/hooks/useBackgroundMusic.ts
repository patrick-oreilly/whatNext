import { useEffect, useRef } from 'react';

interface UseBackgroundMusicOptions {
  audioPath: string;
  enabled: boolean;
  volume?: number;
  loop?: boolean;
}

/**
 * Custom hook to handle background music playback
 * @param audioPath - Path to the audio file (relative to public folder)
 * @param enabled - Whether the music should be playing
 * @param volume - Volume level (0.0 to 1.0), defaults to 0.5
 * @param loop - Whether to loop the audio, defaults to true
 */
export const useBackgroundMusic = ({
  audioPath,
  enabled,
  volume = 0.5,
  loop = true,
}: UseBackgroundMusicOptions) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.loop = loop;
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    if (enabled) {
      // Play the audio
      audio.play().catch((error) => {
        console.error('Failed to play background music:', error);
      });
    } else {
      // Pause the audio
      audio.pause();
    }

    // Cleanup function
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audioPath, enabled, volume, loop]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update loop when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = loop;
    }
  }, [loop]);

  return {
    audio: audioRef.current,
  };
};
