// Main layout component

import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Analytics } from "@vercel/analytics/react"


interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-primary">
      <Header />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
      <Analytics />
    </div>
  );
};
