/**
 * One-off upgrade for data created before the Bible dropdown pickers existed:
 *  - devotions: fills book / chapter / verses / keyVerse from the old "passageRef" / "verseRef" text
 *  - learning passages: fills chapter / verses from the old "reference" text
 * Safe to run more than once (only touches rows that haven't been filled in). Run: npm run backfill
 * Anything it can't parse is listed at the end so you can fix it by hand in the admin pages.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource, IsNull } from 'typeorm';
import { AppModule } from '../app.module';
import { parsePassage } from '../bible/bible.util';
import { Devotion } from '../devotions/devotion.entity';
import { Passage } from '../learning/passage.entity';

async function main() {
  // Starting the app runs TypeORM's schema sync first, so the new columns exist.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const unparsed: string[] = [];

  const devotions = ds.getRepository(Devotion);
  let d = 0;
  for (const dev of await devotions.find({ where: { book: IsNull() } })) {
    const p = parsePassage(dev.passageRef);
    if (!p) {
      unparsed.push(`devotion "${dev.title}" (${dev.publishDate}): ${dev.passageRef}`);
      continue;
    }
    Object.assign(dev, { book: p.book, chapter: p.chapter ?? null, verseStart: p.verseStart ?? null, verseEnd: p.verseEnd ?? null });
    const kv = dev.verseRef ? parsePassage(dev.verseRef) : null;
    if (kv && kv.chapter && kv.verseStart) {
      dev.keyVerse = { book: kv.book, chapter: kv.chapter, verseStart: kv.verseStart, verseEnd: kv.verseEnd ?? null };
    } else if (dev.verseRef) {
      unparsed.push(`devotion "${dev.title}" key verse: ${dev.verseRef} (kept as text)`);
    }
    await devotions.save(dev);
    d++;
  }

  const passages = ds.getRepository(Passage);
  let n = 0;
  for (const row of await passages.find({ where: { chapter: IsNull(), verseStart: IsNull() } })) {
    const p = parsePassage(row.reference);
    if (!p) {
      unparsed.push(`learning passage: ${row.reference}`);
      continue;
    }
    if (p.chapter == null) continue; // a whole book: nothing to fill in
    Object.assign(row, { chapter: p.chapter, verseStart: p.verseStart ?? null, verseEnd: p.verseEnd ?? null });
    await passages.save(row);
    n++;
  }

  console.log(`Backfilled ${d} devotion(s) and ${n} learning passage(s).`);
  if (unparsed.length) console.log('Could not parse (fix by hand):\n  ' + unparsed.join('\n  '));
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
