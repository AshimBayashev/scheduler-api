import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('routines')
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** HH:mm */
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ default: 30 })
  durationMinutes: number;

  /** ISO weekday: 1=Mon … 7=Sun */
  @Column({ type: 'jsonb' })
  daysOfWeek: number[];

  @Column({ default: '#038387' })
  color: string;

  @Column({ default: true })
  active: boolean;

  /** null = напоминание выключено */
  @Column({ type: 'integer', nullable: true, default: 15 })
  reminderMinutesBefore: number | null;

  @Column({ default: false })
  hiddenFromFamily: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
