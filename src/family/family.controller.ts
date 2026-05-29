import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateFamilyDto, UpdateFamilyDto } from './dto/create-family.dto';
import { InviteFamilyMemberDto } from './dto/invite-family.dto';
import { FamilyService } from './family.service';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  getOverview(@CurrentUser() user: { id: string }) {
    return this.familyService.getOverview(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familyService.createFamily(user.id, dto);
  }

  @Patch()
  update(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familyService.updateFamily(user.id, dto);
  }

  @Delete()
  remove(@CurrentUser() user: { id: string }) {
    return this.familyService.deleteFamily(user.id);
  }

  @Post('invitations')
  invite(
    @CurrentUser() user: { id: string },
    @Body() dto: InviteFamilyMemberDto,
  ) {
    return this.familyService.inviteMember(user.id, dto.email);
  }

  @Delete('invitations/:id')
  cancelInvitation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.familyService.cancelInvitation(user.id, id);
  }

  @Post('invitations/:id/accept')
  acceptInvitation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.familyService.acceptInvitation(user.id, id);
  }

  @Post('invitations/:id/decline')
  declineInvitation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.familyService.declineInvitation(user.id, id);
  }

  @Delete('members/:userId')
  removeMember(
    @CurrentUser() user: { id: string },
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.familyService.removeMember(user.id, targetUserId);
  }
}
