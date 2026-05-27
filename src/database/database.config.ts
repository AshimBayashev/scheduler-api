import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EventEntity } from '../events/event.entity';
import { Routine } from '../routines/routine.entity';
import { User } from '../users/user.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'scheduler',
    password: process.env.DB_PASSWORD ?? 'scheduler',
    database: process.env.DB_NAME ?? 'scheduler',
    entities: [User, EventEntity, Routine],
    synchronize: false,
    migrations: ['dist/database/migrations/*.js'],
  }),
);
