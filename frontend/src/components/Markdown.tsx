import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { normalizeContent } from '../learning';

/**
 * Renders author text as Markdown: **bold**, *italic*, # headings, - or * lists, 1. lists, > quotes, links.
 * Single line breaks are kept (pasted text keeps its shape). Raw HTML is never rendered and images are dropped,
 * so content can't inject scripts or load tracking pixels.
 */
export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={className ? `prose ${className}` : "prose"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{c}</a>
          ),
          img: () => null,
        }}
      >
        {normalizeContent(children)}
      </ReactMarkdown>
    </div>
  );
}
