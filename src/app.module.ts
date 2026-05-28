import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/database.config';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RoutinesModule } from './routines/routines.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    RoutinesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
