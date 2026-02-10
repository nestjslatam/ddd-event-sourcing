import { BankAccount } from './bank-account.aggregate';
import { AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from './events';
import { Money } from './value-objects/money.vo';
import { IdValueObject } from '@nestjslatam/ddd-lib/valueobjects/id.valueobject';

describe('BankAccount Aggregate', () => {
    const accountId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const holderName = 'John Doe';
    const currency = 'USD';

    // Mock IdValueObject.create to return a fixed ID if needed, 
    // but since we pass ID to open(), it should work.

    it('should open an account', () => {
        const account = BankAccount.open(accountId, holderName, 100, currency);

        expect(account.id.toString()).toBe(accountId);
        expect(account.props.holderName).toBe(holderName);
        expect(account.props.balance.amount).toBe(100);
        expect(account.props.balance.currency).toBe(currency);

        const events = account.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(AccountOpenedEvent);
        expect((events[0] as AccountOpenedEvent).initialBalance).toBe(100);
    });

    it('should deposit money', () => {
        const account = BankAccount.open(accountId, holderName, 100, currency);
        account.commit(); // Clear events

        account.deposit(50);

        expect(account.props.balance.amount).toBe(150);

        const events = account.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(MoneyDepositedEvent);
        expect((events[0] as MoneyDepositedEvent).amount).toBe(50);
    });

    it('should withdraw money', () => {
        const account = BankAccount.open(accountId, holderName, 100, currency);
        account.commit();

        account.withdraw(50);

        expect(account.props.balance.amount).toBe(50);

        const events = account.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(MoneyWithdrawnEvent);
        expect((events[0] as MoneyWithdrawnEvent).amount).toBe(50);
    });

    it('should fail to withdraw insufficient funds', () => {
        const account = BankAccount.open(accountId, holderName, 100, currency);
        account.commit();

        expect(() => account.withdraw(200)).toThrow('Insufficient funds');
    });
});
