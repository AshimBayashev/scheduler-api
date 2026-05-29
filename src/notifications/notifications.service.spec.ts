import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from './push-subscription.entity';
import { PushService } from './push.service';
import { TelegramLinkToken } from './telegram-link.entity';
import { TelegramService } from './telegram.service';
import { mockRepository } from '../test/mock-repository';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const pushService = {
    getPublicKey: jest.fn(() => null),
    isEnabled: jest.fn(),
  };
  const telegramService = {
    isEnabled: jest.fn(),
    getBotUsername: jest.fn(),
  };
  const subsRepo = mockRepository<PushSubscription>();
  const usersRepo = mockRepository<User>();
  const tokensRepo = mockRepository<TelegramLinkToken>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PushService, useValue: pushService },
        { provide: TelegramService, useValue: telegramService },
        { provide: getRepositoryToken(PushSubscription), useValue: subsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(TelegramLinkToken), useValue: tokensRepo },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('getTelegramStatus reflects linked chat id', async () => {
    telegramService.isEnabled.mockReturnValue(true);
    telegramService.getBotUsername.mockReturnValue('my_bot');
    usersRepo.findOne.mockResolvedValue({
      id: 'u1',
      telegramChatId: '12345',
    } as User);

    await expect(service.getTelegramStatus('u1')).resolves.toEqual({
      enabled: true,
      linked: true,
      botUsername: 'my_bot',
    });
  });

  it('getTelegramStatus returns linked false without chat id', async () => {
    telegramService.isEnabled.mockReturnValue(true);
    telegramService.getBotUsername.mockReturnValue('my_bot');
    usersRepo.findOne.mockResolvedValue({ id: 'u1', telegramChatId: null } as User);

    const status = await service.getTelegramStatus('u1');
    expect(status.linked).toBe(false);
  });

  it('createTelegramLink returns disabled payload when bot off', async () => {
    telegramService.isEnabled.mockReturnValue(false);

    await expect(service.createTelegramLink('u1')).resolves.toEqual({
      enabled: false,
      linked: false,
      botUsername: null,
    });
  });

  it('createTelegramLink creates token and bot url', async () => {
    telegramService.isEnabled.mockReturnValue(true);
    telegramService.getBotUsername.mockReturnValue('my_bot');

    const result = await service.createTelegramLink('u1');

    expect(tokensRepo.delete).toHaveBeenCalledWith({ userId: 'u1' });
    expect(tokensRepo.save).toHaveBeenCalled();
    expect(result.enabled).toBe(true);
    expect(result.botUrl).toMatch(/^https:\/\/t\.me\/my_bot\?start=/);
  });

  it('unlinkTelegram clears chat id and tokens', async () => {
    await service.unlinkTelegram('u1');

    expect(usersRepo.update).toHaveBeenCalledWith('u1', { telegramChatId: null });
    expect(tokensRepo.delete).toHaveBeenCalledWith({ userId: 'u1' });
  });
});
