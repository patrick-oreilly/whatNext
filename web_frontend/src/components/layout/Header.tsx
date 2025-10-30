// Header component

import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Home as HomeIcon } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="absolute top-5 left-5 z-10">
      <Link
        to="/"
        className="text-accent-white hover:text-primary transition-colors"
        aria-label="Home"
      >
        <Icon icon={HomeIcon} strokeWidth={1} size={32} className="text-accent-white hover:text-primary transition-colors" />
      </Link>
    </div>
  );
};
