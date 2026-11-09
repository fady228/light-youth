/** Words InnoDB FULLTEXT ignores (or that are too common to be useful). Requiring them would return nothing. */
const STOPWORDS = new Set(
  ('about,are,and,all,any,but,can,for,from,had,has,have,her,his,how,its,not,our,out,that,the,their,them,then,there,these,they,this,was,were,what,when,where,which,who,why,will,with,you,your').split(','),
);

/** Splits a user query into words (unicode-aware, so Arabic etc. work). */
export function searchTerms(q: string) {
  const tokens = (q.match(/[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase());
  const significant = [...new Set(tokens.filter((t) => t.length >= 3 && !STOPWORDS.has(t)))].slice(0, 8);
  return { tokens, significant };
}

/** "Faith Basics " -> { name: "Faith Basics", slug: "faith-basics" }. Empty slug = unusable. */
export function normalizeTag(raw: string) {
  const name = raw.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 30);
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return { name, slug };
}

/**
 * Plain-text blurb from an article's markdown, used for cards and search so admins don't have to write a summary
 * for articles. Strips headings, emphasis, links, list markers and "•" bullets.
 */
export function excerptFrom(markdown: string, max = 240): string {
  const text = markdown
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[*+\-•▪◦‣]|\d+[.)])\s+/gm, '')
    .replace(/[•▪◦‣]\s+/g, ' ')
    .replace(/(\*\*|__|~~|`|\*)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
