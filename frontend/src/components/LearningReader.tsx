import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ItemType, PassageRef, TagRef } from '../api';
import { embedFor, fileHref, TYPE_META } from '../learning';
import Markdown from './Markdown';

export interface ReaderItem {
  type: ItemType;
  title: string;
  summary: string;
  content: string | null;
  videoUrl: string | null;
  fileUrl: string | null;
  fileOriginal: string | null;
  emoji: string;
  tags: TagRef[];
  passages: PassageRef[];
}

interface Props {
  item: ReaderItem;
  /** Youth: passages/tags link to the filtered Learning page. Admin preview: plain labels. */
  links?: boolean;
  actions?: ReactNode;
}

/** The reading view of a learning item: used by the youth page and by the admin "View" page. */
export default function LearningReader({ item, links = false, actions }: Props) {
  const meta = TYPE_META[item.type];
  const embed = item.type === 'video' && item.videoUrl ? embedFor(item.videoUrl) : null;
  const pdf = item.fileUrl ? fileHref(item.fileUrl) : null;

  return (
    <article className="article">
      <div className="row-between">
        <span className="learn-emoji big-emoji" aria-hidden>{item.emoji}</span>
        {actions}
      </div>
      <p className="eyebrow detail-type">{meta.icon} {meta.label}</p>
      <h1 className="display">{item.title}</h1>

      {(item.passages.length > 0 || item.tags.length > 0) && (
        <p className="tags" aria-label="Passages and tags">
          {item.passages.map((p) =>
            links ? (
              <Link key={p.reference} to={`/learning?passage=${encodeURIComponent(p.book)}`} className="tag tag-link passage">✝ {p.reference}</Link>
            ) : (
              <span key={p.reference} className="tag passage">✝ {p.reference}</span>
            ),
          )}
          {item.tags.map((t) =>
            links ? (
              <Link key={t.slug} to={`/learning?tag=${t.slug}`} className="tag tag-link">#{t.name}</Link>
            ) : (
              <span key={t.slug} className="tag">#{t.name}</span>
            ),
          )}
        </p>
      )}

      {/* Articles show their full text instead; their "summary" is just the auto-generated card preview. */}
      {item.type !== 'article' && <p className="article-lead">{item.summary}</p>}

      {embed?.kind === 'iframe' && (
        <div className="video-frame">
          <iframe
            src={embed.src}
            title={item.title}
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {embed?.kind === 'video' && <video className="video-frame" src={embed.src} controls preload="metadata" />}
      {embed?.kind === 'link' && (
        <a className="btn btn-primary btn-inline" href={embed.src} target="_blank" rel="noopener noreferrer">
          ▶ Watch the video ↗
        </a>
      )}

      {pdf && (
        <>
          <div className="pdf-actions">
            <a className="btn btn-primary" href={pdf} target="_blank" rel="noopener noreferrer">Open PDF ↗</a>
            {item.fileOriginal && <span className="muted">{item.fileOriginal}</span>}
          </div>
          <iframe className="pdf-frame" src={pdf} title={item.fileOriginal || item.title} />
        </>
      )}

      {item.content && <Markdown className="article-body">{item.content}</Markdown>}
    </article>
  );
}
