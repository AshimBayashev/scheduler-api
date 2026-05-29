import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventEntity } from '../events/event.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  timezone: string | null;

  @Column({ type: 'varchar', nullable: true })
  telegramChatId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => EventEntity, (event) => event.user)
  events: EventEntity[];
}
