// Room code display component

import React, { useState } from 'react';

interface RoomCodeProps {
  code: string | null | undefined;
}

export const RoomCode: React.FC<RoomCodeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-intense rounded-lg p-8 border-4 border-accent-white">
      <div className="text-sm font-black mb-3 uppercase tracking-wide text-accent-white">Room Code</div>
      <div className="flex items-center justify-between">
        <div className="text-5xl font-black font-mono tracking-widest text-accent-white">{code || ''}</div>
        <button
          onClick={copyToClipboard}
          className="ml-4 px-5 py-3 bg-accent-black hover:bg-gray-900 border-4 border-accent-white rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2"
          title="Copy room code"
          disabled={!code}
        >
          {copied ? (
            <>
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-black uppercase text-accent-white">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-accent-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-black uppercase text-accent-white">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="text-sm mt-3 font-bold uppercase tracking-wide text-accent-white">
        Share this code with friends to join
      </div>
    </div>
  );
};
