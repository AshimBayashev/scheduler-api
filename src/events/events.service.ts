import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventEntity } from './event.entity';

const EVENT_COLORS = [
  '#6264A7',
  '#0078D4',
  '#107C10',
  '#D83B01',
  '#8764B8',
  '#038387',
];

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
  ) {}

  findAll(userId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { userId };

    if (from && to) {
      where.start = Between(new Date(from), new Date(to));
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
    const event = this.eventsRepo.create({
      title: dto.title,
      description: dto.description?.trim() || null,
      start: new Date(dto.start),
      end: new Date(dto.end),
      allDay: dto.allDay ?? false,
      color:
        dto.color ??
        EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
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

    return this.eventsRepo.save(event);
  }

  async remove(userId: string, id: string) {
    const event = await this.findOne(userId, id);
    await this.eventsRepo.remove(event);
    return { success: true };
  }
}
