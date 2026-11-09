import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { BOOK_ORDER, parsePassage } from '../bible/bible.util';
import { addDays, dateInTz } from '../common/date.util';
import { Submission } from '../devotions/submission.entity';
import { UpdateMeDto } from './dto/update-me.dto';
import { Reward } from './reward.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Reward) private rewards: Repository<Reward>,
    @InjectRepository(Submission) private submissions: Repository<Submission>,
  ) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  /** Includes passwordHash (hidden by default). */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  create(data: Partial<User>) {
    return this.users.save(
      this.users.create({ ...data, email: data.email!.toLowerCase() }),
    );
  }

  async findOrCreateGoogle(p: { sub: string; email: string; name: string }) {
    let user = await this.users.findOne({ where: { googleId: p.sub } });
    if (user) return user;
    user = await this.findByEmail(p.email);
    if (user) {
      user.googleId = p.sub; // link existing email account
      return this.users.save(user);
    }
    return this.create({
      email: p.email,
      displayName: (p.name || p.email.split('@')[0]).slice(0, 40),
      googleId: p.sub,
      passwordHash: null,
    });
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    await this.users.update(id, dto);
    return this.getProfile(id);
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const [ahead, totalUsers, subs, next] = await Promise.all([
      this.users.count({ where: { role: 'user', points: MoreThan(user.points) } }),
      this.users.count({ where: { role: 'user' } }),
      this.submissions.find({ where: { userId, late: false }, select: { createdAt: true } }),
      this.rewards.findOne({
        where: { pointsRequired: MoreThan(user.points) },
        order: { pointsRequired: 'ASC' },
      }),
    ]);

    const days = new Set(subs.map((s) => dateInTz(s.createdAt)));
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarEmoji: user.avatarEmoji,
      role: user.role,
      points: user.points,
      streak: this.computeStreak(days),
      rank: ahead + 1,
      totalUsers,
      nextReward: next
        ? { name: next.name, pointsRequired: next.pointsRequired }
        : null,
    };
  }

  /** Consecutive days with an on-time submission (late answers don't count), ending today (or yesterday, so the streak survives until midnight). */
  private computeStreak(days: Set<string>) {
    const today = dateInTz();
    let cursor = days.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (days.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  /**
   * A user's answered devotions, newest first, with filters (book, text, on-time vs late) and paging,
   * plus facets for the filter UI. The list grows by a row every day, hence the paging.
   */
  async pastAnswers(
    userId: string,
    query: { book?: string; q?: string; status?: string; limit?: string; offset?: string } = {},
  ) {
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const qb = this.submissions
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.devotion', 'd')
      .where('s.userId = :userId', { userId });
    if (query.book) {
      const book = parsePassage(query.book)?.book;
      if (!book) throw new BadRequestException('Unknown Bible book');
      qb.andWhere('d.book = :book', { book });
    }
    const q = (query.q ?? '').trim().slice(0, 100);
    if (q) {
      qb.andWhere('(d.title LIKE :like OR d.passageRef LIKE :like)', { like: `%${q.replace(/[\\%_]/g, '\\$&')}%` });
    }
    if (query.status === 'done') qb.andWhere('s.late = :late', { late: false });
    else if (query.status === 'late') qb.andWhere('s.late = :late', { late: true });
    else if (query.status) throw new BadRequestException('Unknown status');
    qb.orderBy('d.publishDate', 'DESC').skip(offset).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    // Facets over ALL of the user's answers (not just the filtered ones) so the options don't jump around.
    const [bookRows, lateRows] = await Promise.all([
      this.submissions
        .createQueryBuilder('s')
        .innerJoin('s.devotion', 'd')
        .select('d.book', 'book')
        .addSelect('COUNT(*)', 'count')
        .where('s.userId = :userId', { userId })
        .andWhere('d.book IS NOT NULL')
        .groupBy('d.book')
        .getRawMany<{ book: string; count: string }>(),
      this.submissions
        .createQueryBuilder('s')
        .select('s.late', 'late')
        .addSelect('COUNT(*)', 'count')
        .where('s.userId = :userId', { userId })
        .groupBy('s.late')
        .getRawMany<{ late: number | boolean; count: string }>(),
    ]);
    const n = (late: boolean) => Number(lateRows.find((r) => !!Number(r.late) === late)?.count ?? 0);

    return {
      items: rows.map((s) => ({
        id: s.id,
        devotionId: s.devotionId,
        title: s.devotion.title,
        publishDate: s.devotion.publishDate,
        passageRef: s.devotion.passageRef,
        book: s.devotion.book,
        pointsEarned: s.pointsEarned,
        late: s.late,
        createdAt: s.createdAt,
      })),
      total,
      counts: { all: n(true) + n(false), done: n(false), late: n(true) },
      books: bookRows
        .map((r) => ({ book: r.book, count: Number(r.count) }))
        .sort((a, b) => (BOOK_ORDER.get(a.book) ?? 999) - (BOOK_ORDER.get(b.book) ?? 999)),
    };
  }

  async leaderboard(meId: string) {
    const rows = await this.users.find({
      where: { role: 'user' },
      order: { points: 'DESC', createdAt: 'ASC' },
      take: 50,
    });
    return rows.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      displayName: u.displayName,
      avatarEmoji: u.avatarEmoji,
      points: u.points,
      isMe: u.id === meId,
    }));
  }
}
