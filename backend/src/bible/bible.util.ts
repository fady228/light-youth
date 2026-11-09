import { BadRequestException } from '@nestjs/common';

export interface BookInfo {
  name: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

/** The 66 books in canonical order, with chapter counts. The pickers and filters are built from this. */
const raw: [string, number][] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34], ['Joshua', 24],
  ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25],
  ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10], ['Nehemiah', 13], ['Esther', 10], ['Job', 42],
  ['Psalms', 150], ['Proverbs', 31], ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52],
  ['Lamentations', 5], ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9], ['Obadiah', 1],
  ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14],
  ['Malachi', 4],
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16],
  ['2 Corinthians', 13], ['Galatians', 6], ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4],
  ['1 Thessalonians', 5], ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1],
  ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1], ['3 John', 1],
  ['Jude', 1], ['Revelation', 22],
];
export const BOOK_INFO: BookInfo[] = raw.map(([name, chapters], i) => ({ name, chapters, testament: i < 39 ? 'OT' : 'NT' }));
export const BOOKS: string[] = BOOK_INFO.map((b) => b.name);
const BY_NAME = new Map(BOOK_INFO.map((b) => [b.name, b]));

export const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b, i]));

const EXTRA: Record<string, string[]> = {
  Genesis: ['gen', 'gn'], Exodus: ['exod', 'exo', 'ex'], Leviticus: ['lev', 'lv'], Numbers: ['num', 'nm'],
  Deuteronomy: ['deut', 'dt'], Joshua: ['josh', 'jos'], Judges: ['judg', 'jdg'],
  '1 Samuel': ['1 sam', '1 sm'], '2 Samuel': ['2 sam', '2 sm'], '1 Kings': ['1 kgs', '1 ki'], '2 Kings': ['2 kgs', '2 ki'],
  '1 Chronicles': ['1 chr', '1 chron'], '2 Chronicles': ['2 chr', '2 chron'], Nehemiah: ['neh'], Esther: ['esth', 'est'],
  Psalms: ['psalm', 'ps', 'psa', 'pslm'], Proverbs: ['prov', 'prv', 'pr'], Ecclesiastes: ['eccl', 'eccles', 'ecc'],
  'Song of Solomon': ['song of songs', 'songs', 'song', 'sos'], Isaiah: ['isa'], Jeremiah: ['jer'], Lamentations: ['lam'],
  Ezekiel: ['ezek', 'eze'], Daniel: ['dan'], Hosea: ['hos'], Obadiah: ['obad'], Jonah: ['jon'], Micah: ['mic'],
  Nahum: ['nah'], Habakkuk: ['hab'], Zephaniah: ['zeph', 'zep'], Haggai: ['hag'], Zechariah: ['zech', 'zec'], Malachi: ['mal'],
  Matthew: ['matt', 'mt'], Mark: ['mk', 'mrk'], Luke: ['lk', 'luk'], John: ['jn', 'joh'], Acts: ['act'], Romans: ['rom', 'rm'],
  '1 Corinthians': ['1 cor'], '2 Corinthians': ['2 cor'], Galatians: ['gal'], Ephesians: ['eph'],
  Philippians: ['phil', 'php'], Colossians: ['col'], '1 Thessalonians': ['1 thess', '1 thes'], '2 Thessalonians': ['2 thess', '2 thes'],
  '1 Timothy': ['1 tim'], '2 Timothy': ['2 tim'], Titus: ['tit'], Philemon: ['philem', 'phm'], Hebrews: ['heb'],
  James: ['jas', 'jm'], '1 Peter': ['1 pet', '1 pt'], '2 Peter': ['2 pet', '2 pt'],
  '1 John': ['1 jn'], '2 John': ['2 jn'], '3 John': ['3 jn'], Revelation: ['rev', 'revelations', 'rv'],
};

const ALIASES = new Map<string, string>();
for (const book of BOOKS) {
  ALIASES.set(book.toLowerCase(), book);
  for (const a of EXTRA[book] ?? []) ALIASES.set(a, book);
}

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3' };

export interface PassageFields {
  book: string;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
}

/** "John 3:16-21", "Psalm 23", "1 Samuel 17", or just "Obadiah". */
export function formatReference(p: PassageFields): string {
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

/**
 * Validates a passage chosen in the admin pickers (book must be an exact book name, chapter must exist in
 * that book, verses need a chapter, and "to" can't be before "from"). Returns clean values or throws a 400.
 */
export function normalizePassage(
  p: PassageFields,
  opts: { requireChapter?: boolean; requireVerse?: boolean; label?: string } = {},
) {
  const label = opts.label ?? 'passage';
  const info = BY_NAME.get(p.book);
  if (!info) throw new BadRequestException(`Choose a book of the Bible for the ${label}.`);
  const chapter = p.chapter ?? null;
  const verseStart = p.verseStart ?? null;
  const verseEnd = p.verseEnd ?? null;
  if ((opts.requireChapter || opts.requireVerse) && !chapter) throw new BadRequestException(`Choose a chapter for the ${label}.`);
  if (chapter && chapter > info.chapters) {
    throw new BadRequestException(`${info.name} only has ${info.chapters} chapter${info.chapters === 1 ? '' : 's'}.`);
  }
  if (verseStart && !chapter) throw new BadRequestException(`Choose a chapter before adding verses to the ${label}.`);
  if (opts.requireVerse && !verseStart) throw new BadRequestException(`Add a verse number for the ${label}.`);
  if (verseEnd && !verseStart) throw new BadRequestException(`Add the starting verse for the ${label}.`);
  if (verseStart && verseEnd && verseEnd < verseStart) {
    throw new BadRequestException(`The ending verse can't be before the starting verse in the ${label}.`);
  }
  return { book: info.name, chapter, verseStart, verseEnd: verseEnd && verseEnd !== verseStart ? verseEnd : null };
}

/**
 * Best-effort parse of free text like "jn 3:16", "1Sam 17", "Psalm 23" (used for the ?passage= alias filter
 * and for backfilling data written before the pickers existed). Null if the book isn't recognised.
 */
export function parsePassage(raw: string): (PassageFields & { reference: string }) | null {
  let s = raw.normalize('NFKC').replace(/\./g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(iii|ii|i)\s+(?=[a-z])/i, (m) => `${ROMAN[m.trim().toLowerCase()]} `);
  s = s.replace(/^([1-3])(?=[a-z])/i, '$1 ');
  const words = s.split(' ');
  for (let k = Math.min(4, words.length); k >= 1; k--) {
    const book = ALIASES.get(words.slice(0, k).join(' ').toLowerCase());
    if (!book) continue;
    const rest = words.slice(k).join(' ').trim().replace(/\s*[–—-]\s*/g, '-');
    if (rest && !/^\d[\d:;,\- ]*$/.test(rest)) return null;
    const m = rest.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    const chapter = m ? Number(m[1]) : rest ? Number(rest.match(/\d+/)![0]) : null;
    const verseStart = m?.[2] ? Number(m[2]) : null;
    const verseEnd = m?.[3] ? Number(m[3]) : null;
    const single = !rest.split(':')[0].match(/[-,;]/);
    const label = book === 'Psalms' && rest && single ? 'Psalm' : book;
    return { book, chapter, verseStart, verseEnd, reference: `${label}${rest ? ` ${rest}` : ''}`.slice(0, 80) };
  }
  return null;
}
