import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../../domain/events';
import { BankAccountView } from './schema/bank-account.schema';

@EventsHandler(AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent)
export class BankAccountProjector
    implements IEventHandler<AccountOpenedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent> {
    constructor(
        @InjectModel(BankAccountView.name)
        private readonly repository: Model<BankAccountView>,
    ) { }

    async handle(event: AccountOpenedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent) {
        if (event instanceof AccountOpenedEvent) {
            await this.onAccountOpened(event);
        } else if (event instanceof MoneyDepositedEvent) {
            await this.onMoneyDeposited(event);
        } else if (event instanceof MoneyWithdrawnEvent) {
            await this.onMoneyWithdrawn(event);
        }
    }

    private async onAccountOpened(event: AccountOpenedEvent) {
        await this.repository.create({
            _id: event.aggregateId,
            holderName: event.holderName,
            balance: event.initialBalance,
            currency: event.currency,
            openedAt: event.occurredOn,
            updatedAt: event.occurredOn,
        });
    }

    private async onMoneyDeposited(event: MoneyDepositedEvent) {
        await this.repository.findByIdAndUpdate(event.aggregateId, {
            $inc: { balance: event.amount },
            updatedAt: event.occurredOn,
        });
    }

    private async onMoneyWithdrawn(event: MoneyWithdrawnEvent) {
        await this.repository.findByIdAndUpdate(event.aggregateId, {
            $inc: { balance: -event.amount },
            updatedAt: event.occurredOn,
        });
    }
}
