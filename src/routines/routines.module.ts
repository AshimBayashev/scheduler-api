import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyModule } from '../family/family.module';
import { Routine } from './routine.entity';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Routine]), FamilyModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
