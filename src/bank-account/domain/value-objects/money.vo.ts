import { DddValueObject } from '@nestjslatam/ddd-lib';

export interface MoneyProps {
    amount: number;
    currency: string;
}

export class Money extends DddValueObject<MoneyProps> {
    constructor(props: MoneyProps) {
        super(props);
    }

    get amount(): number {
        return this.getValue().amount;
    }

    get currency(): string {
        return this.getValue().currency;
    }

    static create(amount: number, currency: string): Money {
        if (amount < 0) {
            throw new Error('Money amount cannot be negative');
        }
        return new Money({ amount, currency });
    }

    add(money: Money): Money {
        if (this.currency !== money.currency) {
            throw new Error('Currencies must match');
        }
        return new Money({ amount: this.amount + money.amount, currency: this.currency });
    }

    subtract(money: Money): Money {
        if (this.currency !== money.currency) {
            throw new Error('Currencies must match');
        }
        const newAmount = this.amount - money.amount;
        if (newAmount < 0) {
            throw new Error('Insufficient funds');
        }
        return new Money({ amount: newAmount, currency: this.currency });
    }

    protected getEqualityComponents(): Iterable<any> {
        return [this.amount, this.currency];
    }
}
