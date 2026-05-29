import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pickRandomColor } from '../common/color-palette';
import { DEFAULT_REMINDER_MINUTES } from '../common/reminder-options';
import { FamilyService } from '../family/family.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { Routine } from './routine.entity';

export type RoutineResponse = Routine & {
  ownerUserId: string;
  ownerName: string | null;
};

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routine)
    private readonly routinesRepo: Repository<Routine>,
    private readonly familyService: FamilyService,
  ) {}

  async findAll(
    viewerId: string,
    forUserId?: string,
    scope?: 'family',
  ): Promise<RoutineResponse[]> {
    if (scope === 'family') {
      return this.findAllFamilyScope(viewerId);
    }

    const targetUserId = forUserId ?? viewerId;
    await this.familyService.assertCanViewUser(viewerId, targetUserId);
    const includeHidden = targetUserId === viewerId;

    const routines = await this.queryRoutines(targetUserId, includeHidden);
    return this.enrichRoutines(routines, viewerId);
  }

  async findOne(viewerId: string, id: string) {
    const routine = await this.routinesRepo.findOne({ where: { id, active: true } });
    if (!routine) {
      throw new NotFoundException('Рутина не найдена');
    }

    await this.familyService.assertCanViewUser(viewerId, routine.userId);
    if (routine.hiddenFromFamily && routine.userId !== viewerId) {
      throw new NotFoundException('Рутина не найдена');
    }

    return routine;
  }

  async create(viewerId: string, dto: CreateRoutineDto) {
    await this.validateHiddenFlag(viewerId, dto.hiddenFromFamily);

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
      hiddenFromFamily: dto.hiddenFromFamily ?? false,
      userId: viewerId,
    });
    const saved = await this.routinesRepo.save(routine);
    const enriched = await this.enrichRoutines([saved], viewerId);
    return enriched[0];
  }

  async update(viewerId: string, id: string, dto: UpdateRoutineDto) {
    const routine = await this.findOwned(viewerId, id);

    if (dto.hiddenFromFamily !== undefined) {
      await this.validateHiddenFlag(viewerId, dto.hiddenFromFamily);
      routine.hiddenFromFamily = dto.hiddenFromFamily;
    }

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

    const saved = await this.routinesRepo.save(routine);
    const enriched = await this.enrichRoutines([saved], viewerId);
    return enriched[0];
  }

  async remove(viewerId: string, id: string) {
    const routine = await this.findOwned(viewerId, id);
    routine.active = false;
    await this.routinesRepo.save(routine);
    return { success: true };
  }

  private async findOwned(viewerId: string, id: string) {
    const routine = await this.routinesRepo.findOne({
      where: { id, userId: viewerId, active: true },
    });
    if (!routine) {
      throw new NotFoundException('Рутина не найдена');
    }
    return routine;
  }

  private async validateHiddenFlag(userId: string, hidden?: boolean) {
    if (!hidden) return;
    const inFamily = await this.familyService.isInFamily(userId);
    if (!inFamily) {
      throw new ForbiddenException(
        'Скрытые рутины доступны только участникам семьи',
      );
    }
  }

  private async findAllFamilyScope(viewerId: string): Promise<RoutineResponse[]> {
    const memberIds = await this.familyService.getMemberIdsForViewer(viewerId);
    if (memberIds.length <= 1) {
      throw new BadRequestException('Семейный режим доступен только в семье');
    }

    const qb = this.routinesRepo.createQueryBuilder('r');
    qb.where('r.userId IN (:...memberIds)', { memberIds });
    qb.andWhere('r.active = true');
    qb.andWhere('(r.hiddenFromFamily = false OR r.userId = :viewerId)', {
      viewerId,
    });
    qb.orderBy('r.startTime', 'ASC');

    const routines = await qb.getMany();
    return this.enrichRoutines(routines, viewerId);
  }

  private queryRoutines(userId: string, includeHidden: boolean) {
    const qb = this.routinesRepo.createQueryBuilder('r');
    qb.where('r.userId = :userId', { userId });
    qb.andWhere('r.active = true');
    if (!includeHidden) {
      qb.andWhere('r.hiddenFromFamily = false');
    }
    qb.orderBy('r.startTime', 'ASC');
    return qb.getMany();
  }

  private async enrichRoutines(
    routines: Routine[],
    viewerId: string,
  ): Promise<RoutineResponse[]> {
    const userIds = [...new Set(routines.map((r) => r.userId))];
    const namesMap = await this.familyService.getMemberNamesMap(userIds);

    return routines.map((routine) => ({
      ...routine,
      ownerUserId: routine.userId,
      ownerName:
        routine.userId === viewerId
          ? null
          : (namesMap.get(routine.userId)?.name ??
            namesMap.get(routine.userId)?.email ??
            null),
    }));
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
}
