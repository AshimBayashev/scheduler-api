import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('push_subscriptions')
@Unique(['endpoint'])
@Index(['userId'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text' })
  p256dh: string;

  @Column({ type: 'text' })
  auth: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('sent_reminders')
@Unique(['userId', 'sourceType', 'sourceId', 'fireAt'])
@Index(['fireAt'])
export class SentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  sourceType: 'event' | 'routine';

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'timestamptz' })
  fireAt: Date;

  @CreateDateColumn()
  sentAt: Date;
}
