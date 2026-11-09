import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LearningItem } from './learning-item.entity';

/** A Bible passage an item relates to, e.g. book "John", reference "John 3:16-21". Filter is by book. */
@Entity('learning_passages')
export class Passage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  itemId: string;

  @ManyToOne(() => LearningItem, (i) => i.passages, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'itemId' })
  item: LearningItem;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  book: string;

  @Column({ type: 'varchar', length: 80 })
  reference: string;

  @Column({ type: 'int', nullable: true })
  chapter: number | null;

  @Column({ type: 'int', nullable: true })
  verseStart: number | null;

  @Column({ type: 'int', nullable: true })
  verseEnd: number | null;

  @Column({ type: 'int', default: 0 })
  position: number;
}
