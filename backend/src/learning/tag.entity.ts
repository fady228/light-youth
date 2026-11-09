import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LearningItem } from './learning-item.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Lowercase, hyphenated; used in URLs and for de-duplication. */
  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  /** Display name as first typed, e.g. "Faith Basics". */
  @Column({ type: 'varchar', length: 40 })
  name: string;

  @ManyToMany(() => LearningItem, (i) => i.tags)
  items: LearningItem[];
}
