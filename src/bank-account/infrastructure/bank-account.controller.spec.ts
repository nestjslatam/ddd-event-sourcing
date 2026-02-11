import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BankAccountController } from './bank-account.controller';
import {
  OpenAccountCommand,
  DepositMoneyCommand,
  WithdrawMoneyCommand,
} from '../application/commands';
import { GetAccountQuery } from '../application/queries';

describe('BankAccountController', () => {
  let controller: BankAccountController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    }).compile();

    controller = module.get<BankAccountController>(BankAccountController);
    commandBus = module.get(CommandBus) as jest.Mocked<CommandBus>;
    queryBus = module.get(QueryBus) as jest.Mocked<QueryBus>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('openAccount', () => {
    it('should open a new account', async () => {
      const dto = {
        accountId: 'acc-123',
        holderName: 'John Doe',
        initialAmount: 1000,
        currency: 'USD',
      };

      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.openAccount(dto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new OpenAccountCommand('acc-123', 'John Doe', 1000, 'USD'),
      );
      expect(result).toEqual({ id: 'acc-123' });
    });

    it('should throw BadRequestException if holderName is missing', async () => {
      const dto = {
        accountId: 'acc-456',
        holderName: '',
        initialAmount: 500,
        currency: 'EUR',
      };

      await expect(controller.openAccount(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if holderName is null', async () => {
      const dto = {
        accountId: 'acc-789',
        holderName: null as any,
        initialAmount: 200,
        currency: 'GBP',
      };

      await expect(controller.openAccount(dto)).rejects.toThrow(
        'Holder name is required',
      );
    });
  });

  describe('deposit', () => {
    it('should deposit money to an account', async () => {
      const dto = { amount: 500 };
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deposit('acc-123', dto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DepositMoneyCommand('acc-123', 500),
      );
    });

    it('should handle multiple deposits', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deposit('acc-1', { amount: 100 });
      await controller.deposit('acc-1', { amount: 200 });

      expect(commandBus.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('withdraw', () => {
    it('should withdraw money from an account', async () => {
      const dto = { amount: 300 };
      commandBus.execute.mockResolvedValue(undefined);

      await controller.withdraw('acc-456', dto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new WithdrawMoneyCommand('acc-456', 300),
      );
    });

    it('should handle withdrawal errors from command bus', async () => {
      const dto = { amount: 1000 };
      commandBus.execute.mockRejectedValue(new Error('Insufficient funds'));

      await expect(controller.withdraw('acc-789', dto)).rejects.toThrow(
        'Insufficient funds',
      );
    });
  });

  describe('getAccount', () => {
    it('should retrieve account by id', async () => {
      const mockAccount = {
        _id: 'acc-123',
        holderName: 'John Doe',
        balance: 1000,
        currency: 'USD',
      };

      queryBus.execute.mockResolvedValue(mockAccount);

      const result = await controller.getAccount('acc-123');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetAccountQuery('acc-123'),
      );
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      queryBus.execute.mockResolvedValue(null);

      await expect(controller.getAccount('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getAccount('non-existent')).rejects.toThrow(
        'Account with id non-existent not found',
      );
    });

    it('should return account for existing id', async () => {
      const mockAccount = {
        _id: 'acc-456',
        holderName: 'Jane Smith',
        balance: 2500,
        currency: 'EUR',
      };

      queryBus.execute.mockResolvedValue(mockAccount);

      const result = await controller.getAccount('acc-456');

      expect(result).toBeDefined();
      expect(result.holderName).toBe('Jane Smith');
    });
  });
});
