// Server-Sent Events (SSE) streaming utilities

import { API_BASE_URL } from '../utils/constants';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Create a connection to stream AI-generated story content
 * @param roomId - The room ID to stream from
 * @param callbacks - Callbacks for handling stream events
 * @returns Cleanup function to close the stream
 */
export const createStoryStream = (
  roomId: string,
  callbacks: StreamCallbacks
): (() => void) => {
  const eventSource = new EventSource(`${API_BASE_URL}/api/story/stream/${roomId}`);

  eventSource.onmessage = (event) => {
    const data = event.data;

    if (data === '[DONE]') {
      callbacks.onComplete();
      eventSource.close();
    } else if (data.startsWith('[ERROR]')) {
      const errorMessage = data.replace('[ERROR]', '').trim();
      callbacks.onError(new Error(errorMessage || 'Stream error occurred'));
      eventSource.close();
    } else {
      callbacks.onChunk(data);
    }
  };

  eventSource.onerror = (event) => {
    console.error('SSE error:', event);
    callbacks.onError(new Error('Stream connection error'));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
};
