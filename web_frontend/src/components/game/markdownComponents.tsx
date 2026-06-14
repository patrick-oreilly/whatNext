export const markdownComponents = {
  p: ({ ...props }) => (
    <p className="mb-4 text-accent-white font-semibold text-lg leading-relaxed" {...props} />
  ),
  strong: ({ ...props }) => <strong className="text-primary font-black" {...props} />,
  em: ({ ...props }) => <em className="text-primary-400 font-bold" {...props} />,
  h1: ({ ...props }) => <h1 className="text-3xl font-black text-primary mb-4 uppercase" {...props} />,
  h2: ({ ...props }) => <h2 className="text-2xl font-black text-primary mb-3 uppercase" {...props} />,
  h3: ({ ...props }) => <h3 className="text-xl font-black text-primary mb-2 uppercase" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-accent-white" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-accent-white" {...props} />,
  li: ({ ...props }) => <li className="text-accent-white font-semibold" {...props} />,
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-accent-white font-semibold" {...props} />
  ),
};
