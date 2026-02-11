import { Test, TestingModule } from '@nestjs/testing';
import { DepositMoneyCommandHandler, DepositMoneyCommand } from './deposit-money.command';
import { AggregateRehydrator } from '../../../../libs/es/src/es-aggregate-rehydrator';
import { BankAccount } from '../../domain/bank-account.aggregate';

describe('DepositMoneyCommandHandler', () => {
    let handler: DepositMoneyCommandHandler;
    let rehydrator: jest.Mocked<AggregateRehydrator>;

    beforeEach(async () => {
        const mockRehydrator = {
            rehydrate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DepositMoneyCommandHandler,
                { provide: AggregateRehydrator, useValue: mockRehydrator },
            ],
        }).compile();

        handler = module.get<DepositMoneyCommandHandler>(DepositMoneyCommandHandler);
        rehydrator = module.get(AggregateRehydrator) as jest.Mocked<AggregateRehydrator>;
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    it('should deposit money to an account', async () => {
        const account = BankAccount.open('acc-1', 'John Doe', 1000, 'USD');
        account.commit(); // Clear initial events
        account.commit = jest.fn(); // Mock commit

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new DepositMoneyCommand('acc-1', 500);

        await handler.execute(command);

        expect(rehydrator.rehydrate).toHaveBeenCalledWith('acc-1', BankAccount);
        expect(account.props.balance.amount).toBe(1500);
        expect(account.commit).toHaveBeenCalled();
    });

    it('should generate MoneyDepositedEvent', async () => {
        const account = BankAccount.open('acc-2', 'Jane Smith', 2000, 'EUR');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new DepositMoneyCommand('acc-2', 750);

        await handler.execute(command);

        const events = account.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('MoneyDepositedEvent');
    });

    it('should handle multiple deposits', async () => {
        const account = BankAccount.open('acc-3', 'Bob Johnson', 500, 'GBP');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        await handler.execute(new DepositMoneyCommand('acc-3', 100));
        await handler.execute(new DepositMoneyCommand('acc-3', 200));

        expect(account.props.balance.amount).toBe(800);
        expect(account.commit).toHaveBeenCalledTimes(2);
    });

    it('should rehydrate aggregate before depositing', async () => {
        const account = BankAccount.open('acc-4', 'Alice Brown', 1500, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const command = new DepositMoneyCommand('acc-4', 300);

        await handler.execute(command);

        expect(rehydrator.rehydrate).toHaveBeenCalledBefore(account.commit as jest.Mock);
    });

    it('should update balance correctly', async () => {
        const account = BankAccount.open('acc-5', 'Charlie Davis', 100, 'USD');
        account.commit();
        account.commit = jest.fn();

        rehydrator.rehydrate.mockResolvedValue(account as any);

        const initialBalance = account.props.balance.amount;
        const depositAmount = 250;

        await handler.execute(new DepositMoneyCommand('acc-5', depositAmount));

        expect(account.props.balance.amount).toBe(initialBalance + depositAmount);
    });
});
