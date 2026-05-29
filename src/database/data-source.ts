import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { EventEntity } from '../events/event.entity';
import { FamilyInvitation } from '../family/family-invitation.entity';
import { FamilyMember } from '../family/family-member.entity';
import { Family } from '../family/family.entity';
import { PushSubscription, SentReminder } from '../notifications/push-subscription.entity';
import { TelegramLinkToken } from '../notifications/telegram-link.entity';
import { Routine } from '../routines/routine.entity';
import { User } from '../users/user.entity';

config();

const isCompiled = __filename.endsWith('.js');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'scheduler',
  password: process.env.DB_PASSWORD ?? 'scheduler',
  database: process.env.DB_NAME ?? 'scheduler',
  entities: [User, EventEntity, Routine, PushSubscription, SentReminder, TelegramLinkToken, Family, FamilyMember, FamilyInvitation],
  migrations: isCompiled
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  synchronize: false,
});
