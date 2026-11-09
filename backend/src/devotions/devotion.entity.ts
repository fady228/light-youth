import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('devotions')
export class Devotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  /** One devotion per day. Visible to users from this date onwards (YYYY-MM-DD). */
  @Column({ type: 'date', unique: true })
  publishDate: string;

  /** The reading, picked from the Bible dropdowns. `book` is what youth filter and search by. */
  @Index()
  @Column({ type: 'varchar', length: 30, nullable: true })
  book: string | null;

  @Column({ type: 'int', nullable: true })
  chapter: number | null;

  @Column({ type: 'int', nullable: true })
  verseStart: number | null;

  @Column({ type: 'int', nullable: true })
  verseEnd: number | null;

  /** Display text generated from the fields above, e.g. "1 John 1" or "Psalm 23:1-6". */
  @Column({ type: 'varchar', length: 100 })
  passageRef: string;

  /** Optional highlighted verse (any book), e.g. { book: "1 John", chapter: 1, verseStart: 7 }. */
  @Column({ type: 'simple-json', nullable: true })
  keyVerse: { book: string; chapter: number; verseStart: number; verseEnd: number | null } | null;

  /** Display text for the key verse, e.g. "1 John 1:7". */
  @Column({ type: 'varchar', length: 100, nullable: true })
  verseRef: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reflectionQuote: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reflectionAuthor: string | null;

  @OneToMany(() => Question, (q) => q.devotion, { cascade: true })
  questions: Question[];

  @CreateDateColumn()
  createdAt: Date;
}
