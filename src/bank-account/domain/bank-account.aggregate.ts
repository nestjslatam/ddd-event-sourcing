import { DddAggregateRoot } from '@nestjslatam/ddd-lib';
import { AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from './events';
import { Money } from './value-objects/money.vo';

import { IdValueObject } from '@nestjslatam/ddd-lib/valueobjects/id.valueobject';

export interface BankAccountProps {
    holderName: string;
    balance: Money;
}

export class BankAccount extends DddAggregateRoot<BankAccount, BankAccountProps> {
    constructor(props: BankAccountProps, id?: IdValueObject) {
        super(props, id ? { id } : undefined);
    }

    static open(id: string, holderName: string, initialAmount: number, currency: string): BankAccount {
        const money = Money.create(initialAmount, currency);
        const idVo = IdValueObject.load(id);

        // Pass ID to constructor so it's set in the base class
        const account = new BankAccount({
            holderName,
            balance: money,
        }, idVo);

        account.createAccount(id, holderName, initialAmount, currency);
        return account;
    }

    public createAccount(id: string, holderName: string, initialAmount: number, currency: string) {
        this.apply(
            new AccountOpenedEvent(id, holderName, initialAmount, currency)
        );
    }

    deposit(amount: number): void {
        this.apply(
            new MoneyDepositedEvent(this.id.toString(), amount, this.props.balance.currency)
        );
    }

    withdraw(amount: number): void {
        if (this.props.balance.amount < amount) {
            throw new Error('Insufficient funds');
        }

        this.apply(
            new MoneyWithdrawnEvent(this.id.toString(), amount, this.props.balance.currency)
        );
    }

    // --- Event Handlers ---

    private onAccountOpenedEvent(event: AccountOpenedEvent): void {
        this.props.holderName = event.holderName;
        this.props.balance = Money.create(event.initialBalance, event.currency);
    }

    private onMoneyDepositedEvent(event: MoneyDepositedEvent): void {
        const depositAmount = Money.create(event.amount, event.currency);
        this.props.balance = this.props.balance.add(depositAmount);
    }

    private onMoneyWithdrawnEvent(event: MoneyWithdrawnEvent): void {
        const withdrawAmount = Money.create(event.amount, event.currency);
        this.props.balance = this.props.balance.subtract(withdrawAmount);
    }
}
