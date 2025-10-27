// Server-Sent Events hook

import { useState, useCallback, useRef, useEffect } from 'react';
import { createStoryStream } from '../api/stream';

export const useSSE = () => {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startStream = useCallback((roomId: string) => {
    // Clean up any existing stream
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    setIsStreaming(true);
    setStreamedText('');
    setError(null);

    cleanupRef.current = createStoryStream(roomId, {
      onChunk: (text) => {
        setStreamedText((prev) => prev + text);
      },
      onComplete: () => {
        setIsStreaming(false);
        cleanupRef.current = null;
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
        cleanupRef.current = null;
      },
    });
  }, []);

  const stopStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    streamedText,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
};
