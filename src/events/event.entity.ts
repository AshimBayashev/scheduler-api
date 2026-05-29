import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz' })
  start: Date;

  @Column({ type: 'timestamptz' })
  end: Date;

  @Column({ default: false })
  allDay: boolean;

  @Column({ default: '#6264A7' })
  color: string;

  /** null = напоминание выключено */
  @Column({ type: 'integer', nullable: true, default: 15 })
  reminderMinutesBefore: number | null;

  @Column({ default: false })
  hiddenFromFamily: boolean;

  @ManyToOne(() => User, (user) => user.events, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
