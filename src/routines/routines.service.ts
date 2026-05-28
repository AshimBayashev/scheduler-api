import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pickRandomColor } from '../common/color-palette';
import { DEFAULT_REMINDER_MINUTES } from '../common/reminder-options';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { Routine } from './routine.entity';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routine)
    private readonly routinesRepo: Repository<Routine>,
  ) {}

  findAll(userId: string) {
    return this.routinesRepo.find({
      where: { userId, active: true },
      order: { startTime: 'ASC' },
    });
  }

  async findOne(userId: string, id: string) {
    const routine = await this.routinesRepo.findOne({ where: { id, userId } });
    if (!routine) {
      throw new NotFoundException('Рутина не найдена');
    }
    return routine;
  }

  create(userId: string, dto: CreateRoutineDto) {
    const days = [...new Set(dto.daysOfWeek)].sort((a, b) => a - b);
    const durationMinutes = dto.durationMinutes ?? 30;
    this.assertDurationMinutes(durationMinutes);

    const routine = this.routinesRepo.create({
      title: dto.title,
      description: dto.description?.trim() || null,
      startTime: dto.startTime,
      durationMinutes,
      daysOfWeek: days,
      color: dto.color ?? pickRandomColor(),
      reminderMinutesBefore:
        dto.reminderMinutesBefore !== undefined
          ? dto.reminderMinutesBefore
          : DEFAULT_REMINDER_MINUTES,
      userId,
    });
    return this.routinesRepo.save(routine);
  }

  async update(userId: string, id: string, dto: UpdateRoutineDto) {
    const routine = await this.findOne(userId, id);

    if (dto.title !== undefined) routine.title = dto.title;
    if (dto.description !== undefined) {
      routine.description = dto.description?.trim() || null;
    }
    if (dto.startTime !== undefined) routine.startTime = dto.startTime;
    if (dto.durationMinutes !== undefined) {
      this.assertDurationMinutes(dto.durationMinutes);
      routine.durationMinutes = dto.durationMinutes;
    }
    if (dto.daysOfWeek !== undefined) {
      routine.daysOfWeek = [...new Set(dto.daysOfWeek)].sort((a, b) => a - b);
    }
    if (dto.color !== undefined) routine.color = dto.color;
    if (dto.reminderMinutesBefore !== undefined) {
      routine.reminderMinutesBefore = dto.reminderMinutesBefore;
    }

    return this.routinesRepo.save(routine);
  }

  private assertDurationMinutes(durationMinutes: number) {
    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'Длительность должна быть больше 0 минут',
      );
    }
    if (durationMinutes < 5 || durationMinutes > 720) {
      throw new BadRequestException(
        'Длительность должна быть от 5 до 720 минут',
      );
    }
  }

  async remove(userId: string, id: string) {
    const routine = await this.findOne(userId, id);
    routine.active = false;
    await this.routinesRepo.save(routine);
    return { success: true };
  }
}
