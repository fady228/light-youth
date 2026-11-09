/**
 * Seeds starter content (devotions, blogs, rewards) and an admin account.
 * Safe to run more than once: each table is only seeded when empty.
 *   npm run seed
 * Scripture text: World English Bible (public domain).
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { formatReference, PassageFields } from './bible/bible.util';
import { addDays, dateInTz } from './common/date.util';
import { Devotion } from './devotions/devotion.entity';
import { LearningItem } from './learning/learning-item.entity';
import { Passage } from './learning/passage.entity';
import { normalizeTag } from './learning/search.util';
import { Tag } from './learning/tag.entity';
import { Reward } from './users/reward.entity';
import { User } from './users/user.entity';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const today = dateInTz();

  // ---- admin ----
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const users = ds.getRepository(User);
  if (!(await users.exist({ where: { email } }))) {
    await users.save(
      users.create({
        email,
        displayName: 'Admin',
        role: 'admin',
        avatarEmoji: '🛠️',
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10),
      }),
    );
    console.log(`Created admin ${email}`);
  }

  // ---- rewards ----
  const rewards = ds.getRepository(Reward);
  if ((await rewards.count()) === 0) {
    await rewards.save([
      { name: 'Sticker pack & candy', pointsRequired: 100 },
      { name: 'Light Youth t-shirt', pointsRequired: 250 },
      { name: 'Pizza night with the group', pointsRequired: 500 },
    ]);
    console.log('Seeded rewards');
  }

  // ---- devotions ----
  const devotions = ds.getRepository(Devotion);
  const reading = (p: PassageFields, kv: PassageFields & { chapter: number; verseStart: number }) => ({
    book: p.book, chapter: p.chapter ?? null, verseStart: null, verseEnd: null, passageRef: formatReference(p),
    keyVerse: { book: kv.book, chapter: kv.chapter, verseStart: kv.verseStart, verseEnd: kv.verseEnd ?? null },
    verseRef: formatReference(kv),
  });
  if ((await devotions.count()) === 0) {
    await devotions.save([
      devotions.create({
        publishDate: today,
        title: 'Walking in the Light',
        ...reading({ book: '1 John', chapter: 1 }, { book: '1 John', chapter: 1, verseStart: 7 }),
        body:
          'But if we walk in the light as he is in the light, we have fellowship with one another, and the blood of Jesus Christ his Son cleanses us from all sin. ' +
          'This week, reflect on what it means to live honestly before God and each other. Where is God inviting you to step out of hiding and into the light?',
        reflectionQuote: 'God is too good to be unkind and too wise to be mistaken.',
        reflectionAuthor: 'Charles H. Spurgeon',
        questions: [
          {
            position: 1,
            type: 'multiple_choice',
            prompt: "What is the main idea of today's verse?",
            options: [
              'God is with us and cares for us',
              "We must earn God's love",
              'Only adults can follow God',
              "Prayer doesn't matter",
            ],
            correctAnswer: 'God is with us and cares for us',
            points: 5,
          },
          {
            position: 2,
            type: 'true_false',
            prompt: "True or false: God's Word can guide our everyday choices.",
            options: null,
            correctAnswer: 'true',
            points: 5,
          },
          {
            position: 3,
            type: 'true_false',
            prompt: 'True or false: We have to be perfect before we can pray.',
            options: null,
            correctAnswer: 'false',
            points: 5,
          },
          {
            position: 4,
            type: 'open',
            prompt: "How can you live out today's verse at school or at home this week?",
            options: null,
            correctAnswer: null,
            points: 10,
          },
        ],
      }),
      devotions.create({
        publishDate: addDays(today, -1),
        title: 'Do Not Be Anxious',
        ...reading({ book: 'Philippians', chapter: 4 }, { book: 'Philippians', chapter: 4, verseStart: 6 }),
        body:
          'Be anxious for nothing, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. ' +
          'Worry shrinks when we hand it over. What is weighing on you today that you can give to God?',
        questions: [
          {
            position: 1,
            type: 'multiple_choice',
            prompt: 'What does Paul say to do instead of worrying?',
            options: ['Work harder', 'Pray with thanksgiving', 'Ignore the problem', 'Wait it out'],
            correctAnswer: 'Pray with thanksgiving',
            points: 5,
          },
          {
            position: 2,
            type: 'true_false',
            prompt: 'True or false: We can bring any request to God.',
            options: null,
            correctAnswer: 'true',
            points: 5,
          },
          {
            position: 3,
            type: 'open',
            prompt: 'What is one worry you can hand over to God today?',
            options: null,
            correctAnswer: null,
            points: 10,
          },
        ],
      }),
      devotions.create({
        publishDate: addDays(today, -2),
        title: 'Love One Another',
        ...reading({ book: 'John', chapter: 13 }, { book: 'John', chapter: 13, verseStart: 34 }),
        body:
          'A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another. ' +
          'Jesus set the standard for love. Who around you could use a little of it this week?',
        questions: [
          {
            position: 1,
            type: 'multiple_choice',
            prompt: 'How does Jesus say we should love one another?',
            options: ['Only when it is easy', 'Just as he has loved us', 'Only our friends', 'From a distance'],
            correctAnswer: 'Just as he has loved us',
            points: 5,
          },
          {
            position: 2,
            type: 'true_false',
            prompt: 'True or false: Loving others is optional for followers of Jesus.',
            options: null,
            correctAnswer: 'false',
            points: 5,
          },
          {
            position: 3,
            type: 'open',
            prompt: 'Name one practical way you can show love to someone this week.',
            options: null,
            correctAnswer: null,
            points: 10,
          },
        ],
      }),
    ]);
    console.log('Seeded devotions');
  }

  // ---- learning (articles; add videos and sermon PDFs from the admin page) ----
  const items = ds.getRepository(LearningItem);
  const tagRepo = ds.getRepository(Tag);
  const tag = async (raw: string) => {
    const { name, slug } = normalizeTag(raw);
    return (await tagRepo.findOne({ where: { slug } })) ?? tagRepo.save(tagRepo.create({ name, slug }));
  };
  const passages = (list: (PassageFields & { chapter?: number })[]) =>
    list.map((p, position) =>
      Object.assign(new Passage(), {
        book: p.book, chapter: p.chapter ?? null, verseStart: p.verseStart ?? null, verseEnd: p.verseEnd ?? null,
        reference: formatReference(p), position,
      }),
    );

  if ((await items.count()) === 0) {
    await items.save([
      items.create({
        type: 'article',
        title: "5 Ways to Pray When You Don't Know What to Say",
        summary: 'Stuck on what to pray? Here are easy ideas to get you talking with God.', // generated from the text when saved via the admin
        emoji: '🙏',
        featured: true,
        tags: [await tag('prayer'), await tag('faith basics')],
        passages: passages([{ book: 'Matthew', chapter: 6, verseStart: 9, verseEnd: 13 }, { book: 'Psalms', chapter: 62, verseStart: 8 }]),
        content:
          "Prayer isn't a performance. God isn't grading your words, he just wants to hear from you.\n\n" +
          '1. Talk like you would to a friend. Tell God about your day, the good parts and the awkward ones.\n\n' +
          '2. Pray a Psalm. Read one out loud and make it your own words.\n\n' +
          '3. Use a simple pattern: thank, sorry, please. Thank God for something, say sorry for something, and ask for something.\n\n' +
          '4. Write it down. A prayer journal helps when your mind wanders.\n\n' +
          "5. Sit quietly for one minute and listen. You don't have to fill every silence.",
      }),
      items.create({
        type: 'article',
        title: 'Being Brave Like David',
        summary: 'David was just a kid when he faced Goliath. What made him so brave?',
        emoji: '🪨',
        featured: true,
        tags: [await tag('courage'), await tag('bible stories')],
        passages: passages([{ book: '1 Samuel', chapter: 17 }]),
        content:
          'Everyone else looked at Goliath and saw a giant too big to fight. David looked at the same giant and saw someone who was too small to stand against God.\n\n' +
          "David's bravery didn't come from a sling or a good aim. It came from knowing God had helped him before, with the lion and the bear, and trusting he would help again.\n\n" +
          "What's your Goliath this summer? A hard class, a friendship, a fear? Remember what God has already done, and take the next small step.",
      }),
      items.create({
        type: 'article',
        title: 'Why Read the Bible Every Day?',
        summary: "Daily reading is like daily food for your soul. Here's why it matters.",
        emoji: '📖',
        featured: false,
        tags: [await tag('bible'), await tag('habits')],
        passages: passages([{ book: 'Psalms', chapter: 119, verseStart: 105 }]),
        content:
          "You wouldn't eat once a month and expect to feel strong. Reading the Bible daily works the same way: small, regular bites keep you growing.\n\n" +
          'Daily reading helps you know God better, gives you wisdom for everyday choices, and reminds you who you are when everything else is loud.\n\n' +
          'Start small. Five minutes, one chapter, one question: what does this tell me about God? Come back tomorrow and do it again.',
      }),
    ]);
    console.log('Seeded learning items');
  }

  await app.close();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
