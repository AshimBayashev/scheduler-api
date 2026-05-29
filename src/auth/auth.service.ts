import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = await this.usersService.create(
      dto.email,
      dto.password,
      dto.name,
    );
    return this.buildAuthResponse(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) return null;

    return this.usersService.toPublic(user);
  }

  async login(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string | null;
  }) {
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
    createdAt?: Date;
  }) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt ?? new Date(),
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.usersService.toPublic(user);
  }
}
