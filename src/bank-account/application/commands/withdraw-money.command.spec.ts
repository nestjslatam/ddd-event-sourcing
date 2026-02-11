import { Test, TestingModule } from '@nestjs/testing';
import {
  WithdrawMoneyCommandHandler,
  WithdrawMoneyCommand,
} from './withdraw-money.command';
import { EnhancedAggregateRehydrator } from '@nestjslatam/es';
import { BankAccount } from '../../domain/bank-account.aggregate';

describe('WithdrawMoneyCommandHandler', () => {
  let handler: WithdrawMoneyCommandHandler;
  let rehydrator: jest.Mocked<EnhancedAggregateRehydrator>;

  beforeEach(async () => {
    const mockRehydrator = {
      rehydrate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawMoneyCommandHandler,
        { provide: EnhancedAggregateRehydrator, useValue: mockRehydrator },
      ],
    }).compile();

    handler = module.get<WithdrawMoneyCommandHandler>(
      WithdrawMoneyCommandHandler,
    );
    rehydrator = module.get(
      EnhancedAggregateRehydrator,
    ) as jest.Mocked<EnhancedAggregateRehydrator>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should withdraw money from an account', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440001',
      'John Doe',
      1000,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new WithdrawMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440001',
      300,
    );

    await handler.execute(command);

    expect(rehydrator.rehydrate).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      BankAccount,
    );
    expect(account.props.balance.amount).toBe(700);
    expect(account.commit).toHaveBeenCalled();
  });

  it('should generate MoneyWithdrawnEvent', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440002',
      'Jane Smith',
      2000,
      'EUR',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new WithdrawMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440002',
      500,
    );

    await handler.execute(command);

    const events = account.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].constructor.name).toBe('MoneyWithdrawnEvent');
  });

  it('should throw error for insufficient funds', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440003',
      'Bob Johnson',
      500,
      'GBP',
    );
    account.commit();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new WithdrawMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440003',
      1000,
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Insufficient funds',
    );
  });

  it('should handle multiple withdrawals', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440004',
      'Alice Brown',
      1000,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    await handler.execute(
      new WithdrawMoneyCommand('550e8400-e29b-41d4-a716-446655440004', 200),
    );
    await handler.execute(
      new WithdrawMoneyCommand('550e8400-e29b-41d4-a716-446655440004', 300),
    );

    expect(account.props.balance.amount).toBe(500);
    expect(account.commit).toHaveBeenCalledTimes(2);
  });

  it('should rehydrate aggregate before withdrawing', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440005',
      'Charlie Davis',
      1500,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new WithdrawMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440005',
      400,
    );

    await handler.execute(command);

    expect(rehydrator.rehydrate).toHaveBeenCalled();
    expect(account.commit).toHaveBeenCalled();
  });

  it('should update balance correctly', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440006',
      'David Evans',
      800,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const initialBalance = account.props.balance.amount;
    const withdrawAmount = 250;

    await handler.execute(
      new WithdrawMoneyCommand(
        '550e8400-e29b-41d4-a716-446655440006',
        withdrawAmount,
      ),
    );

    expect(account.props.balance.amount).toBe(initialBalance - withdrawAmount);
  });

  it('should allow withdrawal of exact balance', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440007',
      'Emma Foster',
      1000,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new WithdrawMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440007',
      1000,
    );

    await handler.execute(command);

    expect(account.props.balance.amount).toBe(0);
  });
});
