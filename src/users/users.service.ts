import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

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

  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
