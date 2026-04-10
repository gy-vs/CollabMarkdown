import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  content: string;
}

function MarkdownPreview({ content }: Props) {
  return (
    <div className="preview-wrapper">
      <div className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true }]]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default MarkdownPreview;
