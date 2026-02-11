import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawMoneyCommandHandler, WithdrawMoneyCommand } from './withdraw-money.command';
import { AggregateRehydrator } from '../../../../libs/es/src/es-aggregate-rehydrator';
import { BankAccount } from '../../domain/bank-account.aggregate';

describe('WithdrawMoneyCommandHandler', () => {
    let handler: WithdrawMoneyCommandHandler;
    let rehydrator: jest.Mocked<AggregateRehydrator>;

    beforeEach(async () => {
        const mockRehydrator = {
            rehydrate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WithdrawMoneyCommandHandler,
                { provide: AggregateRehydrator, useValue: mockRehydrator },
            ],
        }).compile();

        handler = module.get<WithdrawMoneyCommandHandler>(WithdrawMoneyCommandHandler);
        rehydrator = module.get(AggregateRehydrator) as jest.Mocked<AggregateRehydrator>;
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    it('should withdraw money from an account', async () => {
        const account = BankAccount.open('acc-1', 'John Doe', 1000, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new WithdrawMoneyCommand('acc-1', 300);

        await handler.execute(command);

        expect(rehydrator.rehydrate).toHaveBeenCalledWith('acc-1', BankAccount);
        expect(account.props.balance.amount).toBe(700);
        expect(account.commit).toHaveBeenCalled();
    });

    it('should generate MoneyWithdrawnEvent', async () => {
        const account = BankAccount.open('acc-2', 'Jane Smith', 2000, 'EUR');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new WithdrawMoneyCommand('acc-2', 500);

        await handler.execute(command);

        const events = account.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('MoneyWithdrawnEvent');
    });

    it('should throw error for insufficient funds', async () => {
        const account = BankAccount.open('acc-3', 'Bob Johnson', 500, 'GBP');
        account.commit();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new WithdrawMoneyCommand('acc-3', 1000);

        await expect(handler.execute(command)).rejects.toThrow('Insufficient funds');
    });

    it('should handle multiple withdrawals', async () => {
        const account = BankAccount.open('acc-4', 'Alice Brown', 1000, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        await handler.execute(new WithdrawMoneyCommand('acc-4', 200));
        await handler.execute(new WithdrawMoneyCommand('acc-4', 300));

        expect(account.props.balance.amount).toBe(500);
        expect(account.commit).toHaveBeenCalledTimes(2);
    });

    it('should rehydrate aggregate before withdrawing', async () => {
        const account = BankAccount.open('acc-5', 'Charlie Davis', 1500, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new WithdrawMoneyCommand('acc-5', 400);

        await handler.execute(command);

        expect(rehydrator.rehydrate).toHaveBeenCalledBefore(account.commit as jest.Mock);
    });

    it('should update balance correctly', async () => {
        const account = BankAccount.open('acc-6', 'David Evans', 800, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const initialBalance = account.props.balance.amount;
        const withdrawAmount = 250;

        await handler.execute(new WithdrawMoneyCommand('acc-6', withdrawAmount));

        expect(account.props.balance.amount).toBe(initialBalance - withdrawAmount);
    });

    it('should allow withdrawal of exact balance', async () => {
        const account = BankAccount.open('acc-7', 'Emma Foster', 1000, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrator.mockResolvedValue(account as any);

        const command = new WithdrawMoneyCommand('acc-7', 1000);

        await handler.execute(command);

        expect(account.props.balance.amount).toBe(0);
    });
});
