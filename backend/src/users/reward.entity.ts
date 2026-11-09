import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Milestones shown on the home page ("60 pts to Sticker pack & candy"). */
@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'int' })
  pointsRequired: number;
}
