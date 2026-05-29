import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from '../notifications/telegram.service';
import { UsersService } from '../users/users.service';
import { FamilyTelegramNotifier } from './family-telegram.notifier';

describe('FamilyTelegramNotifier', () => {
  let notifier: FamilyTelegramNotifier;
  const telegram = {
    isEnabled: jest.fn().mockReturnValue(true),
    sendMessage: jest.fn().mockResolvedValue(true),
  };
  const usersService = {
    findById: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyTelegramNotifier,
        { provide: TelegramService, useValue: telegram },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    notifier = module.get(FamilyTelegramNotifier);
  });

  it('sends invitation when invitee has telegram', async () => {
    usersService.findById.mockResolvedValue({ id: 'u2', telegramChatId: '999' });
    config.get.mockReturnValue('https://app.test');

    await notifier.notifyInvitation('u2', 'Аня', 'Наша семья');

    expect(telegram.sendMessage).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Аня'),
    );
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('https://app.test/profile#profile-family'),
    );
  });

  it('skips send when telegram disabled', async () => {
    telegram.isEnabled.mockReturnValue(false);
    await notifier.notifyInvitation('u2', 'Аня', 'Семья');
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('skips send when user has no chat id', async () => {
    usersService.findById.mockResolvedValue({ id: 'u2', telegramChatId: null });
    await notifier.notifyInvitation('u2', null, 'Семья');
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});
