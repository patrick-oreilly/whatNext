// Home/Landing page

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/common';
import { APP_NAME } from '../utils/constants';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="font-display text-6xl md:text-8xl font-black text-accent-white mb-6 uppercase tracking-wide text-glow">
          {APP_NAME}
        </h1>
        <p className="text-2xl md:text-3xl text-accent-white font-bold mb-10 uppercase tracking-wide">
          Create Epic Stories with friends
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-lg mx-auto">
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate('/create')}
            className="animate-pulse-glow"
          >
            Create Room
          </Button>
          <Button
            size="lg"
            variant="outline"
            fullWidth
            onClick={() => navigate('/join')}
            className="animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            Join Room
          </Button>
        </div>
      </div>

      {/* How to Play */}
      <div className="max-w-4xl mx-auto mt-20">
        <h2 className="text-4xl font-black text-center mb-10 text-accent-black uppercase tracking-tight">How to Play</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card hover className="text-center bg-accent-black border-4 border-accent-white">
            <div className="text-5xl mb-4">🎭</div>
            <h3 className="text-xl font-black mb-3 text-accent-white uppercase">1. Choose Story</h3>
            <p className="text-accent-white font-semibold">
              Select from Hoop Dreams, Space, Heist, or Haunted Mansion
            </p>
          </Card>

          <Card hover className="text-center bg-accent-black border-4 border-accent-white">
            <div className="text-5xl mb-4">✍️</div>
            <h3 className="text-xl font-black mb-3 text-accent-white uppercase">2. Write & Vote</h3>
            <p className="text-accent-white font-semibold">
              Submit ideas, vote for your favorite
            </p>
          </Card>

          <Card hover className="text-center bg-accent-black border-4 border-accent-white">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-black mb-3 text-accent-white uppercase">3. AI Magic</h3>
            <p className="text-accent-white font-semibold">
              Watch AI weave winning ideas into epic stories
            </p>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <h2 className="text-4xl font-black mb-8 text-accent-black uppercase tracking-tight">Why You'll Love It</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex items-start space-x-4 bg-accent-black p-6 rounded-lg border-4 border-accent-white">
            <span className="text-4xl">🎮</span>
            <div className="text-left">
              <h4 className="font-black text-accent-white text-lg uppercase mb-2">Multiplayer</h4>
              <p className="text-accent-white font-semibold">2-10 players in real-time</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-accent-black p-6 rounded-lg border-4 border-accent-white">
            <span className="text-4xl">⚡</span>
            <div className="text-left">
              <h4 className="font-black text-accent-white text-lg uppercase mb-2">AI-Powered</h4>
              <p className="text-accent-white font-semibold">Ideas brought to life</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-accent-black p-6 rounded-lg border-4 border-accent-white">
            <span className="text-4xl">🏆</span>
            <div className="text-left">
              <h4 className="font-black text-accent-white text-lg uppercase mb-2">Competitive</h4>
              <p className="text-accent-white font-semibold">Points for creativity</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-accent-black p-6 rounded-lg border-4 border-accent-white">
            <span className="text-4xl">📖</span>
            <div className="text-left">
              <h4 className="font-black text-accent-white text-lg uppercase mb-2">Unique</h4>
              <p className="text-accent-white font-semibold">One-of-a-kind tales</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
