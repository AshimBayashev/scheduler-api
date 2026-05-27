import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Routine } from './routine.entity';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Routine])],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
