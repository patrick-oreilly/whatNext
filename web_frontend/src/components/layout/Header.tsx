// Header component

import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';

export const Header: React.FC = () => {
  return (
    <header className="bg-accent-black shadow-lg border-b-4 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-3xl font-black text-accent-white tracking-tight uppercase">
              {APP_NAME}
            </div>
          </Link>
          <nav className="flex space-x-6">
            <Link
              to="/"
              className="text-accent-white hover:text-primary transition-colors font-bold text-lg uppercase tracking-wide"
            >
              Home
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
