import { Test, TestingModule } from '@nestjs/testing';
import {
  DepositMoneyCommandHandler,
  DepositMoneyCommand,
} from './deposit-money.command';
import { EnhancedAggregateRehydrator } from '@nestjslatam/es';
import { BankAccount } from '../../domain/bank-account.aggregate';

describe('DepositMoneyCommandHandler', () => {
  let handler: DepositMoneyCommandHandler;
  let rehydrator: jest.Mocked<EnhancedAggregateRehydrator>;

  beforeEach(async () => {
    const mockRehydrator = {
      rehydrate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositMoneyCommandHandler,
        { provide: EnhancedAggregateRehydrator, useValue: mockRehydrator },
      ],
    }).compile();

    handler = module.get<DepositMoneyCommandHandler>(
      DepositMoneyCommandHandler,
    );
    rehydrator = module.get(
      EnhancedAggregateRehydrator,
    ) as jest.Mocked<EnhancedAggregateRehydrator>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should deposit money to an account', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440001',
      'John Doe',
      1000,
      'USD',
    );
    account.commit(); // Clear initial events
    account.commit = jest.fn(); // Mock commit

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new DepositMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440001',
      500,
    );

    await handler.execute(command);

    expect(rehydrator.rehydrate).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      BankAccount,
    );
    expect(account.props.balance.amount).toBe(1500);
    expect(account.commit).toHaveBeenCalled();
  });

  it('should generate MoneyDepositedEvent', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440002',
      'Jane Smith',
      2000,
      'EUR',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new DepositMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440002',
      750,
    );

    await handler.execute(command);

    const events = account.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].constructor.name).toBe('MoneyDepositedEvent');
  });

  it('should handle multiple deposits', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440003',
      'Bob Johnson',
      500,
      'GBP',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    await handler.execute(
      new DepositMoneyCommand('550e8400-e29b-41d4-a716-446655440003', 100),
    );
    await handler.execute(
      new DepositMoneyCommand('550e8400-e29b-41d4-a716-446655440003', 200),
    );

    expect(account.props.balance.amount).toBe(800);
    expect(account.commit).toHaveBeenCalledTimes(2);
  });

  it('should rehydrate aggregate before depositing', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440004',
      'Alice Brown',
      1500,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const command = new DepositMoneyCommand(
      '550e8400-e29b-41d4-a716-446655440004',
      300,
    );

    await handler.execute(command);

    expect(rehydrator.rehydrate).toHaveBeenCalled();
    expect(account.commit).toHaveBeenCalled();
  });

  it('should update balance correctly', async () => {
    const account = BankAccount.open(
      '550e8400-e29b-41d4-a716-446655440005',
      'Charlie Davis',
      100,
      'USD',
    );
    account.commit();
    account.commit = jest.fn();

    rehydrator.rehydrate.mockResolvedValue(account as any);

    const initialBalance = account.props.balance.amount;
    const depositAmount = 250;

    await handler.execute(
      new DepositMoneyCommand(
        '550e8400-e29b-41d4-a716-446655440005',
        depositAmount,
      ),
    );

    expect(account.props.balance.amount).toBe(initialBalance + depositAmount);
  });
});
