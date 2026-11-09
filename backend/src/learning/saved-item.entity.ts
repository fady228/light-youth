import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { LearningItem } from './learning-item.entity';

@Entity('saved_items')
export class SavedItem {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 36 })
  itemId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => LearningItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: LearningItem;

  @CreateDateColumn()
  createdAt: Date;
}
