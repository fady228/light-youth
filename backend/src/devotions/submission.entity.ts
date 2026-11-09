import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Devotion } from './devotion.entity';

export interface StoredAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean | null; // null for open questions
  pointsEarned: number;
}

@Entity('submissions')
@Unique(['userId', 'devotionId'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 36 })
  devotionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Devotion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devotionId' })
  devotion: Devotion;

  @Column({ type: 'simple-json' })
  answers: StoredAnswer[];

  @Column({ type: 'int' })
  pointsEarned: number;

  /** Answered after the devotion's day: recorded and graded, but worth no points and not part of the streak. */
  @Column({ type: 'boolean', default: false })
  late: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
