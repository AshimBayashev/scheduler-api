import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { mockRepository } from '../test/mock-repository';

const VALID_AVATAR =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

describe('UsersService', () => {
  let service: UsersService;
  const repo = mockRepository<User>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('create hashes password and normalizes email', async () => {
    repo.save.mockImplementation(async (u) => ({ ...u, id: 'u1' }) as User);

    await service.create('Test@Mail.com', 'secret12', ' Ash ');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@mail.com',
        name: 'Ash',
      }),
    );
    const hash = (repo.create as jest.Mock).mock.calls[0][0].passwordHash;
    expect(await bcrypt.compare('secret12', hash)).toBe(true);
  });

  it('updateProfile rejects duplicate email', async () => {
    repo.findOne
      .mockResolvedValueOnce({ id: 'u1', email: 'a@test.com' } as User)
      .mockResolvedValueOnce({ id: 'u2', email: 'b@test.com' } as User);

    await expect(
      service.updateProfile('u1', { email: 'b@test.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateProfile accepts valid avatar data url', async () => {
    const user = { id: 'u1', email: 'a@test.com', name: 'A' } as User;
    repo.findOne.mockResolvedValue(user);
    repo.save.mockImplementation(async (u) => u as User);

    const result = await service.updateProfile('u1', { avatarUrl: VALID_AVATAR });
    expect(result.avatarUrl).toBe(VALID_AVATAR);
  });

  it('updateProfile rejects invalid avatar', async () => {
    repo.findOne.mockResolvedValue({ id: 'u1' } as User);

    await expect(
      service.updateProfile('u1', { avatarUrl: 'not-an-image' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('changePassword rejects wrong current password', async () => {
    const hash = await bcrypt.hash('oldpass', 4);
    repo.findOne.mockResolvedValue({
      id: 'u1',
      passwordHash: hash,
    } as User);

    await expect(
      service.changePassword('u1', 'wrong', 'newpass123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changePassword updates hash on success', async () => {
    const hash = await bcrypt.hash('oldpass', 4);
    const user = { id: 'u1', passwordHash: hash } as User;
    repo.findOne.mockResolvedValue(user);

    await service.changePassword('u1', 'oldpass', 'newpass123');

    expect(await bcrypt.compare('newpass123', user.passwordHash)).toBe(true);
  });

  it('updateProfile throws when user not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.updateProfile('missing', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
