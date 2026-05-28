import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('telegram_link_tokens')
export class TelegramLinkToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
