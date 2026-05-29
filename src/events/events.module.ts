import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyModule } from '../family/family.module';
import { EventEntity } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity]), FamilyModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
