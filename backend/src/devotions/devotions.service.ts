import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { BOOK_ORDER, formatReference, normalizePassage, parsePassage } from '../bible/bible.util';
import { dateInTz } from '../common/date.util';
import { User } from '../users/user.entity';
import { CreateDevotionDto, SubmitDto, UpdateDevotionDto } from './dto/devotion.dto';
import { Devotion } from './devotion.entity';
import { Question } from './question.entity';
import { StoredAnswer, Submission } from './submission.entity';

const MIN_OPEN_CHARS = 20;

@Injectable()
export class DevotionsService {
  constructor(
    @InjectRepository(Devotion) private devotions: Repository<Devotion>,
    @InjectRepository(Submission) private submissions: Repository<Submission>,
    @InjectRepository(User) private users: Repository<User>,
    private ds: DataSource,
  ) {}

  // ---------- reading ----------

  /**
   * Every devotion up to today, each with a per-user status:
   *   done    answered on its day (points counted)
   *   late    a day you missed, answered afterwards (recorded, 0 points)
   *   missed  a day you missed, not answered yet
   *   open    today's, not answered yet
   *   archive from before you joined (answerable for practice, never "missed")
   * Filters: status = open | done | missed (missed includes late), book, q.
   */
  async list(userId: string, query: { status?: string; book?: string; q?: string } = {}) {
    const ctx = await this.context(userId);
    const rows = await this.devotions.find({
      where: { publishDate: LessThanOrEqual(ctx.today) },
      order: { publishDate: 'DESC' },
      take: 400,
    });
    const subs = await this.submissionMap(userId, rows.map((r) => r.id));
    const all = rows.map((d) => this.summary(d, subs.get(d.id), ctx));

    const counts = {
      all: all.length,
      open: all.filter((d) => d.status === 'open').length,
      done: all.filter((d) => d.status === 'done').length,
      missed: all.filter((d) => d.status === 'missed' || d.status === 'late').length,
    };
    const byBook = new Map<string, number>();
    for (const d of all) if (d.book) byBook.set(d.book, (byBook.get(d.book) ?? 0) + 1);
    const books = [...byBook]
      .map(([book, count]) => ({ book, count }))
      .sort((a, b) => (BOOK_ORDER.get(a.book) ?? 999) - (BOOK_ORDER.get(b.book) ?? 999));

    let items = all;
    if (query.status) {
      if (!['open', 'done', 'missed'].includes(query.status)) throw new BadRequestException('Unknown status');
      items = items.filter((d) =>
        query.status === 'missed' ? d.status === 'missed' || d.status === 'late' : d.status === query.status,
      );
    }
    if (query.book) {
      const book = parsePassage(query.book)?.book;
      if (!book) throw new BadRequestException('Unknown Bible book');
      items = items.filter((d) => d.book === book);
    }
    const q = (query.q ?? '').trim().toLowerCase();
    if (q) items = items.filter((d) => `${d.title} ${d.passageRef}`.toLowerCase().includes(q));

    return { items, counts, books };
  }

  async today(userId: string) {
    const ctx = await this.context(userId);
    const d = await this.devotions.findOne({ where: { publishDate: ctx.today } });
    if (!d) return { devotion: null };
    const subs = await this.submissionMap(userId, [d.id]);
    return { devotion: this.summary(d, subs.get(d.id), ctx) };
  }

  async get(id: string, userId: string) {
    const ctx = await this.context(userId);
    const d = await this.devotions.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { position: 'ASC' } },
    });
    if (!d || d.publishDate > ctx.today) throw new NotFoundException('Devotion not found');

    const sub = await this.submissions.findOne({ where: { devotionId: id, userId } });
    return {
      ...this.summary(d, sub ?? undefined, ctx),
      verseRef: d.verseRef,
      body: d.body,
      questions: d.questions.map((q) => ({
        id: q.id,
        position: q.position,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        points: q.points,
      })),
      submission: sub ? this.toResult(sub, d.questions) : null,
    };
  }

  // ---------- answering ----------

  async submit(id: string, userId: string, dto: SubmitDto) {
    const d = await this.devotions.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { position: 'ASC' } },
    });
    const today = dateInTz();
    if (!d || d.publishDate > today) throw new NotFoundException('Devotion not found');
    if (await this.submissions.exist({ where: { devotionId: id, userId } })) {
      throw new ConflictException('You already answered this devotion');
    }

    const stored: StoredAnswer[] = d.questions.map((q) => {
      const raw = (dto.answers.find((a) => a.questionId === q.id)?.answer ?? '').trim();
      if (!raw) throw new BadRequestException(`Please answer question ${q.position}`);
      return this.grade(q, raw);
    });
    // Answering after the devotion's day is allowed and graded, but earns nothing.
    const late = d.publishDate < today;
    if (late) for (const a of stored) a.pointsEarned = 0;
    const total = stored.reduce((sum, a) => sum + a.pointsEarned, 0);

    try {
      const sub = await this.ds.transaction(async (m) => {
        const saved = await m.save(
          m.create(Submission, { userId, devotionId: id, answers: stored, pointsEarned: total, late }),
        );
        if (total > 0) await m.increment(User, { id: userId }, 'points', total);
        return saved;
      });
      return this.toResult(sub, d.questions);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') throw new ConflictException('You already answered this devotion');
      throw e;
    }
  }

  private grade(q: Question, raw: string): StoredAnswer {
    if (q.type === 'open') {
      if (raw.length < MIN_OPEN_CHARS) {
        throw new BadRequestException(
          `Question ${q.position} needs at least ${MIN_OPEN_CHARS} characters`,
        );
      }
      // Reflection answers earn full points for a genuine attempt.
      return { questionId: q.id, answer: raw, isCorrect: null, pointsEarned: q.points };
    }
    if (q.type === 'multiple_choice' && !q.options?.includes(raw)) {
      throw new BadRequestException(`Invalid choice for question ${q.position}`);
    }
    if (q.type === 'true_false' && raw !== 'true' && raw !== 'false') {
      throw new BadRequestException(`Invalid answer for question ${q.position}`);
    }
    const isCorrect = raw === q.correctAnswer;
    return { questionId: q.id, answer: raw, isCorrect, pointsEarned: isCorrect ? q.points : 0 };
  }

  // ---------- admin ----------

  /** Every devotion (including future ones) with full questions and correct answers. */
  adminList() {
    return this.devotions.find({
      relations: { questions: true },
      order: { publishDate: 'DESC', questions: { position: 'ASC' } },
    });
  }

  async adminGet(id: string) {
    const d = await this.devotions.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { position: 'ASC' } },
    });
    if (!d) throw new NotFoundException('Devotion not found');
    return d;
  }

  async create(dto: CreateDevotionDto) {
    dto.questions.forEach((q, i) => {
      const n = i + 1;
      if (q.type === 'multiple_choice') {
        if (!q.options || !q.correctAnswer || !q.options.includes(q.correctAnswer)) {
          throw new BadRequestException(
            `Question ${n}: multiple choice needs options and a correctAnswer that is one of them`,
          );
        }
      } else if (q.type === 'true_false') {
        if (q.correctAnswer !== 'true' && q.correctAnswer !== 'false') {
          throw new BadRequestException(`Question ${n}: correctAnswer must be "true" or "false"`);
        }
      }
    });

    const { questions, passage, keyVerse, ...rest } = dto;
    const devotion = this.devotions.create({
      ...rest,
      questions: questions.map((q, i) => ({
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        position: i + 1,
        options: q.type === 'multiple_choice' ? q.options! : null,
        correctAnswer: q.type === 'open' ? null : q.correctAnswer!,
      })),
    });
    this.applyPassages(devotion, passage, keyVerse);
    try {
      return await this.devotions.save(devotion);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A devotion already exists for that date');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDevotionDto) {
    const d = await this.devotions.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Devotion not found');
    const { passage, keyVerse, ...rest } = dto;
    Object.assign(d, rest);
    if (passage || keyVerse !== undefined) this.applyPassages(d, passage, keyVerse);
    try {
      return await this.devotions.save(d);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A devotion already exists for that date');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const res = await this.devotions.delete(id);
    if (!res.affected) throw new NotFoundException('Devotion not found');
    return { deleted: true };
  }

  // ---------- helpers ----------

  /** Validates the picked passage/key verse and stores both the structured fields and the display text. */
  private applyPassages(
    d: Devotion,
    passage?: CreateDevotionDto['passage'],
    keyVerse?: CreateDevotionDto['keyVerse'],
  ) {
    if (passage) {
      const p = normalizePassage(passage, { requireChapter: true, label: 'reading' });
      Object.assign(d, { book: p.book, chapter: p.chapter, verseStart: p.verseStart, verseEnd: p.verseEnd });
      d.passageRef = formatReference(p);
    }
    if (keyVerse !== undefined) {
      if (keyVerse === null) {
        d.keyVerse = null;
        d.verseRef = null;
      } else {
        const k = normalizePassage(keyVerse, { requireVerse: true, label: 'key verse' });
        d.keyVerse = { book: k.book, chapter: k.chapter!, verseStart: k.verseStart!, verseEnd: k.verseEnd };
        d.verseRef = formatReference(k);
      }
    }
  }

  /** "Today" and the user's join day, both in the app timezone. */
  private async context(userId: string) {
    const today = dateInTz();
    const user = await this.users.findOne({ where: { id: userId } });
    return { today, joinDay: user ? dateInTz(user.createdAt) : today };
  }

  private statusFor(
    d: Devotion,
    sub: Pick<Submission, 'late'> | undefined,
    ctx: { today: string; joinDay: string },
  ): 'done' | 'late' | 'missed' | 'open' | 'archive' {
    const eligible = d.publishDate >= ctx.joinDay; // days before you joined are never "missed"
    if (sub) return !sub.late ? 'done' : eligible ? 'late' : 'archive';
    if (d.publishDate === ctx.today) return 'open';
    return eligible ? 'missed' : 'archive';
  }

  private summary(d: Devotion, sub: Pick<Submission, 'late'> | undefined, ctx: { today: string; joinDay: string }) {
    return {
      id: d.id,
      title: d.title,
      publishDate: d.publishDate,
      passageRef: d.passageRef,
      book: d.book,
      reflectionQuote: d.reflectionQuote,
      reflectionAuthor: d.reflectionAuthor,
      completed: !!sub,
      late: !!sub?.late,
      status: this.statusFor(d, sub, ctx),
    };
  }

  private async submissionMap(userId: string, ids: string[]) {
    if (!ids.length) return new Map<string, Pick<Submission, 'late'>>();
    const subs = await this.submissions.find({
      where: { userId, devotionId: In(ids) },
      select: { id: true, devotionId: true, late: true },
    });
    return new Map(subs.map((s) => [s.devotionId, { late: s.late }]));
  }

  /** Reveals correct answers — only ever called for a user's own submission. */
  private toResult(sub: Submission, questions: Question[]) {
    return {
      pointsEarned: sub.pointsEarned,
      late: sub.late,
      totalPossible: questions.reduce((s, q) => s + q.points, 0),
      answers: sub.answers.map((a) => {
        const q = questions.find((x) => x.id === a.questionId);
        return { ...a, correctAnswer: q?.type === 'open' ? null : q?.correctAnswer ?? null };
      }),
    };
  }
}
