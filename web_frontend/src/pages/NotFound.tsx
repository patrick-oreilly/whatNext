// 404 Not Found page

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto text-center">
        <div className="text-9xl font-black text-accent-white mb-6 text-glow">404</div>
        <h1 className="text-4xl font-black text-accent-black mb-4 uppercase tracking-tight">Page Not Found</h1>
        <p className="text-accent-white font-bold mb-10 text-lg">
          Oops! This page doesn't exist. It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/')} size="lg">
            Go Home
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
