import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEntity } from './event.entity';
import { EventsService } from './events.service';
import { mockRepository } from '../test/mock-repository';

describe('EventsService', () => {
  let service: EventsService;
  const repo = mockRepository<EventEntity>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(EventEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('findAll without range filters by userId only', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { start: 'ASC' },
    });
  });

  it('findAll rejects partial date range', () => {
    expect(() => service.findAll('user-1', '2026-01-01', undefined)).toThrow(
      BadRequestException,
    );
  });

  it('findAll rejects range over 366 days', () => {
    expect(() =>
      service.findAll('user-1', '2026-01-01T00:00:00.000Z', '2027-01-10T00:00:00.000Z'),
    ).toThrow(/366/);
  });

  it('findOne throws when event missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'id-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create rejects end before start', () => {
    expect(() =>
      service.create('user-1', {
        title: 'Test',
        start: '2026-05-28T12:00:00.000Z',
        end: '2026-05-28T11:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('create saves event with userId', async () => {
    repo.save.mockImplementation(async (e) => ({ ...e, id: 'new-id' }) as EventEntity);

    await service.create('user-1', {
      title: '  Meeting  ',
      description: '  notes ',
      start: '2026-05-28T10:00:00.000Z',
      end: '2026-05-28T11:00:00.000Z',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        title: '  Meeting  ',
        description: 'notes',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('remove deletes after findOne', async () => {
    const event = { id: 'e1', userId: 'user-1' } as EventEntity;
    repo.findOne.mockResolvedValue(event);

    const result = await service.remove('user-1', 'e1');
    expect(repo.remove).toHaveBeenCalledWith(event);
    expect(result).toEqual({ success: true });
  });
});
