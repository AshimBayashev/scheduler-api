import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FamilyService } from '../family/family.service';
import { Routine } from './routine.entity';
import { RoutinesService } from './routines.service';
import { mockRepository } from '../test/mock-repository';

const familyService = {
  assertCanViewUser: jest.fn().mockResolvedValue(undefined),
  isInFamily: jest.fn().mockResolvedValue(false),
  getMemberIdsForViewer: jest.fn().mockResolvedValue(['user-1']),
  getMemberNamesMap: jest.fn().mockResolvedValue(new Map()),
};

function mockQueryBuilder(getMany: Routine[] = []) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(getMany),
  };
}

describe('RoutinesService', () => {
  let service: RoutinesService;
  const repo = mockRepository<Routine>() as ReturnType<
    typeof mockRepository<Routine>
  > & {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder());
    familyService.assertCanViewUser.mockResolvedValue(undefined);
    familyService.getMemberNamesMap.mockResolvedValue(new Map());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinesService,
        { provide: getRepositoryToken(Routine), useValue: repo },
        { provide: FamilyService, useValue: familyService },
      ],
    }).compile();

    service = module.get(RoutinesService);
  });

  it('findAll returns active routines for user', async () => {
    repo.createQueryBuilder.mockReturnValue(mockQueryBuilder([]));
    await service.findAll('user-1');
    expect(repo.createQueryBuilder).toHaveBeenCalledWith('r');
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

  it('create rejects invalid duration', async () => {
    await expect(
      service.create('user-1', {
        title: 'Run',
        startTime: '07:30',
        daysOfWeek: [1],
        durationMinutes: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove soft-deletes routine', async () => {
    const routine = { id: 'r1', userId: 'user-1', active: true } as Routine;
    repo.findOne.mockResolvedValue(routine);

    await service.remove('user-1', 'r1');

    expect(routine.active).toBe(false);
    expect(repo.save).toHaveBeenCalledWith(routine);
  });
});
