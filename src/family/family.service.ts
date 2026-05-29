import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { CreateFamilyDto, UpdateFamilyDto } from './dto/create-family.dto';
import { FamilyInvitation } from './family-invitation.entity';
import { FamilyMember, FamilyMemberRole } from './family-member.entity';
import { Family } from './family.entity';
import { FamilyTelegramNotifier } from './family-telegram.notifier';

export interface FamilyMemberPublic {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: FamilyMemberRole;
}

export interface FamilyInvitationPublic {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
}

export interface IncomingInvitationPublic {
  id: string;
  familyId: string;
  familyName: string;
  inviterName: string | null;
  createdAt: Date;
}

export interface FamilyOverview {
  inFamily: boolean;
  family: { id: string; name: string } | null;
  role: FamilyMemberRole | null;
  members: FamilyMemberPublic[];
  sentInvitations: FamilyInvitationPublic[];
  incomingInvitations: IncomingInvitationPublic[];
}

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(Family)
    private readonly familiesRepo: Repository<Family>,
    @InjectRepository(FamilyMember)
    private readonly membersRepo: Repository<FamilyMember>,
    @InjectRepository(FamilyInvitation)
    private readonly invitationsRepo: Repository<FamilyInvitation>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly familyTelegram: FamilyTelegramNotifier,
  ) {}

  async getOverview(userId: string): Promise<FamilyOverview> {
    const membership = await this.membersRepo.findOne({ where: { userId } });
    const incomingInvitations = await this.getIncomingInvitations(userId);

    if (!membership) {
      return {
        inFamily: false,
        family: null,
        role: null,
        members: [],
        sentInvitations: [],
        incomingInvitations,
      };
    }

    const family = await this.familiesRepo.findOne({
      where: { id: membership.familyId },
    });
    if (!family) {
      throw new NotFoundException('Семья не найдена');
    }

    const members = await this.getMembersPublic(family.id);
    const sentInvitations =
      membership.role === 'owner'
        ? await this.getSentInvitations(family.id)
        : [];

    return {
      inFamily: true,
      family: { id: family.id, name: family.name },
      role: membership.role,
      members,
      sentInvitations,
      incomingInvitations,
    };
  }

  async createFamily(userId: string, dto: CreateFamilyDto) {
    const existing = await this.membersRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Вы уже в семье');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const name =
      dto.name?.trim() ||
      (user.name ? `Семья ${user.name}` : 'Моя семья');

    const family = await this.familiesRepo.save(
      this.familiesRepo.create({ name, ownerId: userId }),
    );

    await this.membersRepo.save(
      this.membersRepo.create({
        familyId: family.id,
        userId,
        role: 'owner',
      }),
    );

    return this.getOverview(userId);
  }

  async updateFamily(userId: string, dto: UpdateFamilyDto) {
    const membership = await this.requireOwner(userId);
    const family = await this.familiesRepo.findOne({
      where: { id: membership.familyId },
    });
    if (!family) {
      throw new NotFoundException('Семья не найдена');
    }

    family.name = dto.name.trim();
    await this.familiesRepo.save(family);
    return this.getOverview(userId);
  }

  async deleteFamily(userId: string) {
    const membership = await this.requireOwner(userId);
    await this.familiesRepo.delete({ id: membership.familyId });
    return { success: true };
  }

  async inviteMember(userId: string, email: string) {
    const membership = await this.requireOwner(userId);
    const normalizedEmail = email.trim().toLowerCase();

    const invitee = await this.usersService.findByEmail(normalizedEmail);
    if (!invitee) {
      throw new NotFoundException(
        'Пользователь с такой почтой не зарегистрирован',
      );
    }

    if (invitee.id === userId) {
      throw new BadRequestException('Нельзя пригласить себя');
    }

    const inviteeMembership = await this.membersRepo.findOne({
      where: { userId: invitee.id },
    });
    if (inviteeMembership) {
      throw new ConflictException('Пользователь уже в семье');
    }

    const pending = await this.invitationsRepo.findOne({
      where: {
        familyId: membership.familyId,
        inviteeEmail: normalizedEmail,
        status: 'pending',
      },
    });
    if (pending) {
      throw new ConflictException('Приглашение уже отправлено');
    }

    const family = await this.familiesRepo.findOne({
      where: { id: membership.familyId },
    });
    const inviter = await this.usersService.findById(userId);

    await this.invitationsRepo.save(
      this.invitationsRepo.create({
        familyId: membership.familyId,
        inviterId: userId,
        inviteeEmail: normalizedEmail,
        inviteeId: invitee.id,
        status: 'pending',
      }),
    );

    if (family) {
      void this.familyTelegram.notifyInvitation(
        invitee.id,
        inviter?.name ?? null,
        family.name,
      );
    }

    return this.getOverview(userId);
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const membership = await this.requireOwner(userId);
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId, familyId: membership.familyId },
    });
    if (!invitation || invitation.status !== 'pending') {
      throw new NotFoundException('Приглашение не найдено');
    }

    await this.invitationsRepo.remove(invitation);
    return this.getOverview(userId);
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const existingMembership = await this.membersRepo.findOne({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('Вы уже в семье');
    }

    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId, inviteeId: userId, status: 'pending' },
    });
    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }

    const family = await this.familiesRepo.findOne({
      where: { id: invitation.familyId },
    });

    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await this.invitationsRepo.save(invitation);

    await this.membersRepo.save(
      this.membersRepo.create({
        familyId: invitation.familyId,
        userId,
        role: 'member',
      }),
    );

    await this.invitationsRepo.update(
      { inviteeId: userId, status: 'pending' },
      { status: 'declined', respondedAt: new Date() },
    );

    if (family) {
      const members = await this.membersRepo.find({
        where: { familyId: family.id },
      });
      void this.familyTelegram.notifyInvitationAccepted(
        invitation.inviterId,
        user.name,
        family.name,
      );
      void this.familyTelegram.notifyMemberJoined(
        members.map((m) => m.userId),
        user.name,
        family.name,
        userId,
      );
    }

    return this.getOverview(userId);
  }

  async declineInvitation(userId: string, invitationId: string) {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId, inviteeId: userId, status: 'pending' },
    });
    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }

    const family = await this.familiesRepo.findOne({
      where: { id: invitation.familyId },
    });
    const invitee = await this.usersService.findById(userId);

    invitation.status = 'declined';
    invitation.respondedAt = new Date();
    await this.invitationsRepo.save(invitation);

    if (family) {
      void this.familyTelegram.notifyInvitationDeclined(
        invitation.inviterId,
        invitee?.name ?? null,
        family.name,
      );
    }

    return this.getOverview(userId);
  }

  async removeMember(actorId: string, targetUserId: string) {
    const actorMembership = await this.membersRepo.findOne({
      where: { userId: actorId },
    });
    if (!actorMembership) {
      throw new ForbiddenException('Вы не в семье');
    }

    const targetMembership = await this.membersRepo.findOne({
      where: { userId: targetUserId, familyId: actorMembership.familyId },
    });
    if (!targetMembership) {
      throw new NotFoundException('Участник не найден');
    }

    if (targetMembership.role === 'owner') {
      throw new BadRequestException('Нельзя удалить создателя семьи');
    }

    if (actorId !== targetUserId && actorMembership.role !== 'owner') {
      throw new ForbiddenException('Только создатель может удалять участников');
    }

    const family = await this.familiesRepo.findOne({
      where: { id: actorMembership.familyId },
    });

    await this.membersRepo.remove(targetMembership);

    if (family) {
      void this.familyTelegram.notifyRemovedFromFamily(
        targetUserId,
        family.name,
        actorId === targetUserId,
      );
    }

    return this.getOverview(actorId);
  }

  async getMemberIdsForViewer(userId: string): Promise<string[]> {
    const membership = await this.membersRepo.findOne({ where: { userId } });
    if (!membership) {
      return [userId];
    }

    const members = await this.membersRepo.find({
      where: { familyId: membership.familyId },
    });
    return members.map((m) => m.userId);
  }

  async assertCanViewUser(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      return;
    }

    const viewerMembership = await this.membersRepo.findOne({
      where: { userId: viewerId },
    });
    if (!viewerMembership) {
      throw new ForbiddenException('Нет доступа к календарю этого пользователя');
    }

    const targetMembership = await this.membersRepo.findOne({
      where: { userId: targetUserId, familyId: viewerMembership.familyId },
    });
    if (!targetMembership) {
      throw new ForbiddenException('Нет доступа к календарю этого пользователя');
    }
  }

  async isInFamily(userId: string): Promise<boolean> {
    const membership = await this.membersRepo.findOne({ where: { userId } });
    return !!membership;
  }

  async getMemberNamesMap(
    userIds: string[],
  ): Promise<Map<string, { name: string | null; email: string }>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const users = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: userIds })
      .getMany();

    return new Map(
      users.map((u) => [u.id, { name: u.name, email: u.email }]),
    );
  }

  private async requireOwner(userId: string) {
    const membership = await this.membersRepo.findOne({ where: { userId } });
    if (!membership) {
      throw new ForbiddenException('Вы не в семье');
    }
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Только создатель семьи может это делать');
    }
    return membership;
  }

  private async getMembersPublic(familyId: string): Promise<FamilyMemberPublic[]> {
    const members = await this.membersRepo.find({
      where: { familyId },
      order: { joinedAt: 'ASC' },
    });

    const result: FamilyMemberPublic[] = [];
    for (const member of members) {
      const user = await this.usersService.findById(member.userId);
      if (!user) continue;
      result.push({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: member.role,
      });
    }
    return result;
  }

  private async getSentInvitations(
    familyId: string,
  ): Promise<FamilyInvitationPublic[]> {
    const invitations = await this.invitationsRepo.find({
      where: { familyId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.inviteeEmail,
      status: inv.status,
      createdAt: inv.createdAt,
    }));
  }

  private async getIncomingInvitations(
    userId: string,
  ): Promise<IncomingInvitationPublic[]> {
    const user = await this.usersService.findById(userId);
    if (!user) return [];

    const invitations = await this.invitationsRepo.find({
      where: { inviteeId: userId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });

    const result: IncomingInvitationPublic[] = [];
    for (const inv of invitations) {
      const family = await this.familiesRepo.findOne({
        where: { id: inv.familyId },
      });
      if (!family) continue;

      const inviter = await this.usersService.findById(inv.inviterId);
      result.push({
        id: inv.id,
        familyId: family.id,
        familyName: family.name,
        inviterName: inviter?.name ?? null,
        createdAt: inv.createdAt,
      });
    }
    return result;
  }
}
