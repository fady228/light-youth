import {
  Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { Passage } from './passage.entity';
import { Tag } from './tag.entity';

export type ItemType = 'article' | 'video' | 'sermon';
export const ITEM_TYPES: ItemType[] = ['article', 'video', 'sermon'];

// Powers search: MATCH(title, summary, content) AGAINST (...) — column order must match this index.
@Index(['title', 'summary', 'content'], { fulltext: true })
@Entity('learning_items')
export class LearningItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16, default: 'article' })
  type: ItemType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  /** Searchable description shown on the card and detail page. Required for every type. */
  @Column({ type: 'text' })
  summary: string;

  /** Article body; for videos/sermons optional notes or a transcript (also searchable). */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** type = video */
  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string | null;

  /** type = sermon: stored file name "<uuid>.pdf" and the original name for display. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fileOriginal: string | null;

  @Column({ type: 'varchar', length: 16, default: '📖' })
  emoji: string;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'boolean', default: true })
  published: boolean;

  @OneToMany(() => Passage, (p) => p.item, { cascade: true })
  passages: Passage[];

  @ManyToMany(() => Tag, (t) => t.items)
  @JoinTable({
    name: 'learning_tags',
    joinColumn: { name: 'itemId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;
}
