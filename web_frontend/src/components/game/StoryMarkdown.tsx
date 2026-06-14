import React from 'react';
import ReactMarkdown from 'react-markdown';
import { markdownComponents } from './markdownComponents.tsx';

interface StoryMarkdownProps {
  children: string;
}

export const StoryMarkdown: React.FC<StoryMarkdownProps> = ({ children }) => (
  <ReactMarkdown components={markdownComponents}>
    {children}
  </ReactMarkdown>
);
