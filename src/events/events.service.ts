import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { pickRandomColor } from '../common/color-palette';
import { DEFAULT_REMINDER_MINUTES } from '../common/reminder-options';
import { FamilyService } from '../family/family.service';
import { MAX_EVENTS_RANGE_DAYS } from './dto/events-range-query.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventEntity } from './event.entity';

const MS_PER_DAY = 86_400_000;

export type EventResponse = EventEntity & {
  ownerUserId: string;
  ownerName: string | null;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
    private readonly familyService: FamilyService,
  ) {}

  async findAll(
    viewerId: string,
    from?: string,
    to?: string,
    forUserId?: string,
    scope?: 'family',
  ): Promise<EventResponse[]> {
    if (scope === 'family') {
      return this.findAllFamilyScope(viewerId, from, to);
    }

    const targetUserId = forUserId ?? viewerId;
    await this.familyService.assertCanViewUser(viewerId, targetUserId);
    const includeHidden = targetUserId === viewerId;

    const events = await this.queryEvents(targetUserId, from, to, includeHidden);
    return this.enrichEvents(events, viewerId);
  }

  async findOne(viewerId: string, id: string) {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Дело не найдено');
    }

    await this.familyService.assertCanViewUser(viewerId, event.userId);
    if (event.hiddenFromFamily && event.userId !== viewerId) {
      throw new NotFoundException('Дело не найдено');
    }

    return event;
  }

  async create(viewerId: string, dto: CreateEventDto) {
    await this.validateHiddenFlag(viewerId, dto.hiddenFromFamily);

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
      hiddenFromFamily: dto.hiddenFromFamily ?? false,
      userId: viewerId,
    });
    const saved = await this.eventsRepo.save(event);
    const enriched = await this.enrichEvents([saved], viewerId);
    return enriched[0];
  }

  async update(viewerId: string, id: string, dto: UpdateEventDto) {
    const event = await this.findOwned(viewerId, id);

    if (dto.hiddenFromFamily !== undefined) {
      await this.validateHiddenFlag(viewerId, dto.hiddenFromFamily);
      event.hiddenFromFamily = dto.hiddenFromFamily;
    }

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

    const saved = await this.eventsRepo.save(event);
    const enriched = await this.enrichEvents([saved], viewerId);
    return enriched[0];
  }

  async remove(viewerId: string, id: string) {
    const event = await this.findOwned(viewerId, id);
    await this.eventsRepo.remove(event);
    return { success: true };
  }

  private async findOwned(viewerId: string, id: string) {
    const event = await this.eventsRepo.findOne({ where: { id, userId: viewerId } });
    if (!event) {
      throw new NotFoundException('Дело не найдено');
    }
    return event;
  }

  private async validateHiddenFlag(userId: string, hidden?: boolean) {
    if (!hidden) return;
    const inFamily = await this.familyService.isInFamily(userId);
    if (!inFamily) {
      throw new ForbiddenException(
        'Скрытые дела доступны только участникам семьи',
      );
    }
  }

  private async findAllFamilyScope(
    viewerId: string,
    from?: string,
    to?: string,
  ): Promise<EventResponse[]> {
    const memberIds = await this.familyService.getMemberIdsForViewer(viewerId);
    if (memberIds.length <= 1) {
      throw new BadRequestException('Семейный режим доступен только в семье');
    }

    const qb = this.eventsRepo.createQueryBuilder('e');
    qb.where('e.userId IN (:...memberIds)', { memberIds });
    qb.andWhere('(e.hiddenFromFamily = false OR e.userId = :viewerId)', {
      viewerId,
    });

    this.applyDateRange(qb, from, to);

    qb.orderBy('e.start', 'ASC');
    const events = await qb.getMany();
    return this.enrichEvents(events, viewerId);
  }

  private async queryEvents(
    userId: string,
    from?: string,
    to?: string,
    includeHidden = true,
  ) {
    if (from || to) {
      const qb = this.eventsRepo.createQueryBuilder('e');
      qb.where('e.userId = :userId', { userId });
      if (!includeHidden) {
        qb.andWhere('e.hiddenFromFamily = false');
      }
      this.applyDateRange(qb, from, to);
      qb.orderBy('e.start', 'ASC');
      return qb.getMany();
    }

    const where: Record<string, unknown> = { userId };
    if (!includeHidden) {
      where.hiddenFromFamily = false;
    }

    return this.eventsRepo.find({
      where,
      order: { start: 'ASC' },
    });
  }

  private applyDateRange(
    qb: ReturnType<Repository<EventEntity>['createQueryBuilder']>,
    from?: string,
    to?: string,
  ) {
    if (!from && !to) return;

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

    qb.andWhere('e.start BETWEEN :from AND :to', { from: fromDate, to: toDate });
  }

  private async enrichEvents(
    events: EventEntity[],
    viewerId: string,
  ): Promise<EventResponse[]> {
    const userIds = [...new Set(events.map((e) => e.userId))];
    const namesMap = await this.familyService.getMemberNamesMap(userIds);

    return events.map((event) => ({
      ...event,
      ownerUserId: event.userId,
      ownerName:
        event.userId === viewerId
          ? null
          : (namesMap.get(event.userId)?.name ??
            namesMap.get(event.userId)?.email ??
            null),
    }));
  }

  private assertPositiveDuration(start: Date, end: Date, allDay: boolean) {
    if (allDay) return;
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(
        'Конец дела должен быть позже начала',
      );
    }
  }
}
