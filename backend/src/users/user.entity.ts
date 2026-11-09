import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 60 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  googleId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'user' })
  role: 'user' | 'admin';

  @Column({ type: 'varchar', length: 16, default: '😎' })
  avatarEmoji: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;
}
