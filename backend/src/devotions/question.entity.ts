import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Devotion } from './devotion.entity';

export type QuestionType = 'multiple_choice' | 'true_false' | 'open';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  devotionId: string;

  @ManyToOne(() => Devotion, (d) => d.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devotionId' })
  devotion: Devotion;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 20 })
  type: QuestionType;

  @Column({ type: 'varchar', length: 500 })
  prompt: string;

  /** Multiple choice only. */
  @Column({ type: 'simple-json', nullable: true })
  options: string[] | null;

  /** MC: the correct option text. True/false: "true" | "false". Open: null. Never sent to clients before submitting. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  correctAnswer: string | null;

  @Column({ type: 'int', default: 5 })
  points: number;
}
