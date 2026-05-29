import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { pickRandomColor } from '../common/color-palette';
import { DEFAULT_REMINDER_MINUTES } from '../common/reminder-options';
import { MAX_EVENTS_RANGE_DAYS } from './dto/events-range-query.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventEntity } from './event.entity';

const MS_PER_DAY = 86_400_000;

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
  ) {}

  findAll(userId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { userId };

    if (from || to) {
      if (!from || !to) {
        throw new BadRequestException('Укажите оба параметра from и to');
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('Некорректный формат дат');
      }

      if (toDate <= fromDate) {
        throw new BadRequestException('Параметр to должен быть позже from');
      }

      const rangeDays = (toDate.getTime() - fromDate.getTime()) / MS_PER_DAY;
      if (rangeDays > MAX_EVENTS_RANGE_DAYS) {
        throw new BadRequestException(
          `Диапазон не может превышать ${MAX_EVENTS_RANGE_DAYS} дней`,
        );
      }

      where.start = Between(fromDate, toDate);
    }

    return this.eventsRepo.find({
      where,
      order: { start: 'ASC' },
    });
  }

  async findOne(userId: string, id: string) {
    const event = await this.eventsRepo.findOne({ where: { id, userId } });
    if (!event) {
      throw new NotFoundException('Дело не найдено');
    }
    return event;
  }

  create(userId: string, dto: CreateEventDto) {
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    const allDay = dto.allDay ?? false;
    this.assertPositiveDuration(start, end, allDay);

    const event = this.eventsRepo.create({
      title: dto.title,
      description: dto.description?.trim() || null,
      start,
      end,
      allDay,
      color: dto.color ?? pickRandomColor(),
      reminderMinutesBefore:
        dto.reminderMinutesBefore !== undefined
          ? dto.reminderMinutesBefore
          : DEFAULT_REMINDER_MINUTES,
      userId,
    });
    return this.eventsRepo.save(event);
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findOne(userId, id);

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) {
      event.description = dto.description?.trim() || null;
    }
    if (dto.start !== undefined) event.start = new Date(dto.start);
    if (dto.end !== undefined) event.end = new Date(dto.end);
    if (dto.allDay !== undefined) event.allDay = dto.allDay;
    if (dto.color !== undefined) event.color = dto.color;
    if (dto.reminderMinutesBefore !== undefined) {
      event.reminderMinutesBefore = dto.reminderMinutesBefore;
    }

    this.assertPositiveDuration(event.start, event.end, event.allDay);

    return this.eventsRepo.save(event);
  }

  private assertPositiveDuration(start: Date, end: Date, allDay: boolean) {
    if (allDay) return;
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(
        'Конец дела должен быть позже начала',
      );
    }
  }

  async remove(userId: string, id: string) {
    const event = await this.findOne(userId, id);
    await this.eventsRepo.remove(event);
    return { success: true };
  }
}
