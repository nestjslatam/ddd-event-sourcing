import { IEventHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../../domain/events';
import { BankAccountView } from './schema/bank-account.schema';
import { IdempotentEventHandler, ProcessedEventTracker } from '@nestjslatam/es';

/**
 * Idempotent projector for BankAccount events
 * Uses @IdempotentEventHandler to prevent duplicate event processing
 * 
 * Note: Each event type needs its own handler for idempotency tracking
 */

@IdempotentEventHandler(AccountOpenedEvent)
@Injectable()
export class AccountOpenedProjector implements IEventHandler<AccountOpenedEvent> {
    constructor(
        @InjectModel(BankAccountView.name)
        private readonly repository: Model<BankAccountView>,
        private readonly processedEvents: ProcessedEventTracker,
    ) { }

    async handle(event: AccountOpenedEvent) {
        // Idempotency is automatic - this will only execute once per event
        await this.repository.create({
            _id: event.aggregateId,
            holderName: event.holderName,
            balance: event.initialBalance,
            currency: event.currency,
            openedAt: event.occurredOn,
            updatedAt: event.occurredOn,
        });
    }
}

@IdempotentEventHandler(MoneyDepositedEvent)
@Injectable()
export class MoneyDepositedProjector implements IEventHandler<MoneyDepositedEvent> {
    constructor(
        @InjectModel(BankAccountView.name)
        private readonly repository: Model<BankAccountView>,
        private readonly processedEvents: ProcessedEventTracker,
    ) { }

    async handle(event: MoneyDepositedEvent) {
        // Idempotency is automatic - safe to replay events
        await this.repository.findByIdAndUpdate(event.aggregateId, {
            $inc: { balance: event.amount },
            updatedAt: event.occurredOn,
        });
    }
}

@IdempotentEventHandler(MoneyWithdrawnEvent)
@Injectable()
export class MoneyWithdrawnProjector implements IEventHandler<MoneyWithdrawnEvent> {
    constructor(
        @InjectModel(BankAccountView.name)
        private readonly repository: Model<BankAccountView>,
        private readonly processedEvents: ProcessedEventTracker,
    ) { }

    async handle(event: MoneyWithdrawnEvent) {
        // Idempotency is automatic - prevents double withdrawals
        await this.repository.findByIdAndUpdate(event.aggregateId, {
            $inc: { balance: -event.amount },
            updatedAt: event.occurredOn,
        });
    }
}

// Export all projectors for module registration
export const BankAccountProjectors = [
    AccountOpenedProjector,
    MoneyDepositedProjector,
    MoneyWithdrawnProjector,
];

// Legacy export for backward compatibility
export { AccountOpenedProjector as BankAccountProjector };
