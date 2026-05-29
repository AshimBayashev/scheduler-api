import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Routine } from './routine.entity';
import { RoutinesService } from './routines.service';
import { mockRepository } from '../test/mock-repository';

describe('RoutinesService', () => {
  let service: RoutinesService;
  const repo = mockRepository<Routine>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinesService,
        { provide: getRepositoryToken(Routine), useValue: repo },
      ],
    }).compile();

    service = module.get(RoutinesService);
  });

  it('findAll returns active routines for user', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1', active: true },
      order: { startTime: 'ASC' },
    });
  });

  it('findOne throws when routine missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'id-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create deduplicates and sorts daysOfWeek', async () => {
    repo.save.mockImplementation(async (r) => ({ ...r, id: 'r1' }) as Routine);

    await service.create('user-1', {
      title: 'Run',
      startTime: '07:30',
      daysOfWeek: [3, 1, 3],
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOfWeek: [1, 3],
        durationMinutes: 30,
        userId: 'user-1',
      }),
    );
  });

  it('create rejects invalid duration', () => {
    expect(() =>
      service.create('user-1', {
        title: 'Run',
        startTime: '07:30',
        daysOfWeek: [1],
        durationMinutes: 2,
      }),
    ).toThrow(BadRequestException);
  });

  it('remove soft-deletes routine', async () => {
    const routine = { id: 'r1', userId: 'user-1', active: true } as Routine;
    repo.findOne.mockResolvedValue(routine);

    await service.remove('user-1', 'r1');

    expect(routine.active).toBe(false);
    expect(repo.save).toHaveBeenCalledWith(routine);
  });
});
