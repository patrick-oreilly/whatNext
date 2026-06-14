import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryMarkdown } from './StoryMarkdown';
import { markdownComponents } from './markdownComponents.tsx';

describe('StoryMarkdown', () => {
  it('renders markdown text', () => {
    render(<StoryMarkdown>Hello world</StoryMarkdown>);
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('renders markdown with paragraph styling', () => {
    const { container } = render(<StoryMarkdown>Hello world</StoryMarkdown>);
    const p = container.querySelector('p');
    expect(p).toBeDefined();
    expect(p?.className).toContain('text-accent-white');
    expect(p?.className).toContain('font-semibold');
  });

  it('renders strong text with primary color', () => {
    render(<StoryMarkdown>**bold text**</StoryMarkdown>);
    const strong = document.querySelector('strong');
    expect(strong).toBeDefined();
    expect(strong?.className).toContain('text-primary');
    expect(strong?.className).toContain('font-black');
  });

  it('renders headings with uppercase styling', () => {
    render(<StoryMarkdown># Heading 1</StoryMarkdown>);
    const h1 = document.querySelector('h1');
    expect(h1).toBeDefined();
    expect(h1?.className).toContain('uppercase');
  });

  it('exports markdownComponents with all expected element types', () => {
    expect(markdownComponents).toHaveProperty('p');
    expect(markdownComponents).toHaveProperty('strong');
    expect(markdownComponents).toHaveProperty('em');
    expect(markdownComponents).toHaveProperty('h1');
    expect(markdownComponents).toHaveProperty('h2');
    expect(markdownComponents).toHaveProperty('h3');
    expect(markdownComponents).toHaveProperty('ul');
    expect(markdownComponents).toHaveProperty('ol');
    expect(markdownComponents).toHaveProperty('li');
    expect(markdownComponents).toHaveProperty('blockquote');
  });
});
