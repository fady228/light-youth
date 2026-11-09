import { ItemType } from './api';

export const TYPE_META: Record<ItemType, { label: string; plural: string; icon: string }> = {
  article: { label: 'Article', plural: 'Articles', icon: '📖' },
  video: { label: 'Video', plural: 'Videos', icon: '🎬' },
  sermon: { label: 'Sermon PDF', plural: 'Sermons', icon: '📄' },
};

/** Where sermon PDFs live. Same origin in dev (Vite proxies /files); the API's origin in production. */
export function fileHref(path: string) {
  const api = import.meta.env.VITE_API_URL as string | undefined;
  return api && /^https?:\/\//.test(api) ? new URL(path, api).href : path;
}

export type Embed = { kind: 'iframe' | 'video' | 'link'; src: string };

/** Turns a pasted video link into something we can play on the page. Unknown links just open in a new tab. */
export function embedFor(url: string): Embed {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let id: string | null | undefined;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host.endsWith('youtube.com')) {
      id = u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    }
    if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = u.pathname.match(/(\d{6,})/);
      if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}` };
    }
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: 'video', src: url };
  } catch {
    /* fall through */
  }
  return { kind: 'link', src: url };
}

const BULLET = '[•▪◦‣]';

/**
 * Cleans up text pasted from chats/docs so it renders like the original:
 * "•" bullets (at the start of a line, or run together on one line) become real list items.
 * Everything else is left as the author wrote it (it's rendered as Markdown).
 */
export function normalizeContent(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const bullets = block.match(new RegExp(`(^|\\s)${BULLET}\\s+`, 'g'))?.length ?? 0;
      const startsWithBullet = new RegExp(`^\\s*${BULLET}\\s`).test(block);
      if (bullets >= 2 || startsWithBullet) {
        return block.replace(new RegExp(`\\s*${BULLET}\\s+`, 'g'), '\n* ').trim();
      }
      return block;
    })
    .join('\n\n');
}

export interface PassageFields {
  book: string;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
}

/** "John 3:16-21", "Psalm 23", "Obadiah" — same format the server stores. */
export function formatRef(p: PassageFields): string {
  let s = p.book === 'Psalms' && p.chapter ? 'Psalm' : p.book;
  if (p.chapter) {
    s += ` ${p.chapter}`;
    if (p.verseStart) {
      s += `:${p.verseStart}`;
      if (p.verseEnd && p.verseEnd !== p.verseStart) s += `-${p.verseEnd}`;
    }
  }
  return s;
}
