import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './user.entity';

const AVATAR_DATA_URL =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_HTTP_URL = /^https?:\/\/.+/;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(email: string, password: string, name?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepo.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name?.trim() || null,
    });
    return this.usersRepo.save(user);
  }

  validatePassword(user: User, password: string) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase();
      const existing = await this.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email уже занят');
      }
      user.email = email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name.trim() || null;
    }

    if (dto.avatarUrl !== undefined) {
      if (dto.avatarUrl !== null) {
        this.assertValidAvatar(dto.avatarUrl);
      }
      user.avatarUrl = dto.avatarUrl;
    }

    const saved = await this.usersRepo.save(user);
    return this.toPublic(saved);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const valid = await this.validatePassword(user, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(user);
    return { success: true };
  }

  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  private assertValidAvatar(value: string) {
    if (value.length > 400_000) {
      throw new BadRequestException('Фото слишком большое');
    }

    const ok =
      (value.length <= 500 && AVATAR_HTTP_URL.test(value)) ||
      AVATAR_DATA_URL.test(value);

    if (!ok) {
      throw new BadRequestException('Недопустимый формат фото');
    }
  }
}
