import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    findById: jest.fn(),
    toPublic: jest.fn(),
  };
  const jwtService = { sign: jest.fn(() => 'token-123') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('register throws when email exists', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'u1' });

    await expect(
      service.register({ email: 'a@test.com', password: 'secret12' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register returns token and public user', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: 'u1',
      email: 'a@test.com',
      name: null,
      avatarUrl: null,
      createdAt: new Date('2026-01-01'),
    });

    const result = await service.register({
      email: 'a@test.com',
      password: 'secret12',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'a@test.com',
    });
    expect(result.accessToken).toBe('token-123');
    expect(result.user.email).toBe('a@test.com');
  });

  it('validateUser returns null for wrong password', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'u1' });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(service.validateUser('a@test.com', 'x')).resolves.toBeNull();
  });

  it('getProfile throws when user missing', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
