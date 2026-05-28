import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @CurrentUser() user: { id: string },
    @Body() dto: SubscribePushDto,
  ) {
    return this.notificationsService.subscribe(user.id, dto);
  }

  @Delete('push/subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(
    @CurrentUser() user: { id: string },
    @Body() dto: UnsubscribePushDto,
  ) {
    return this.notificationsService.unsubscribe(user.id, dto);
  }

  @Get('telegram/status')
  @UseGuards(JwtAuthGuard)
  getTelegramStatus(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getTelegramStatus(user.id);
  }

  @Post('telegram/link')
  @UseGuards(JwtAuthGuard)
  createTelegramLink(@CurrentUser() user: { id: string }) {
    return this.notificationsService.createTelegramLink(user.id);
  }

  @Delete('telegram')
  @UseGuards(JwtAuthGuard)
  unlinkTelegram(@CurrentUser() user: { id: string }) {
    return this.notificationsService.unlinkTelegram(user.id);
  }
}
