import { Type } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DomainEvent } from '@nestjslatam/ddd-lib';

/**
 * Decorator to make an event handler idempotent
 * Automatically prevents duplicate processing of the same event
 * 
 * @param eventClass The event class this handler processes
 * 
 * @example
 * ```typescript
 * @IdempotentEventHandler(MoneyDepositedEvent)
 * export class MoneyDepositedHandler implements IEventHandler<MoneyDepositedEvent> {
 *   constructor(
 *     private readonly repository: Model<BankAccountView>,
 *     private readonly processedEvents: ProcessedEventTracker
 *   ) {}
 * 
 *   async handle(event: MoneyDepositedEvent): Promise<void> {
 *     // Handler logic - idempotency handled automatically
 *     await this.repository.findByIdAndUpdate(
 *       event.aggregateId,
 *       { $inc: { balance: event.amount } }
 *     );
 *   }
 * }
 * ```
 */
export function IdempotentEventHandler(eventClass: Type<DomainEvent>) {
    return (target: any) => {
        const originalHandle = target.prototype.handle;
        const handlerName = target.name;

        target.prototype.handle = async function (event: DomainEvent) {
            const tracker = this.processedEvents;

            if (!tracker) {
                throw new Error(
                    `${handlerName} must inject ProcessedEventTracker to use @IdempotentEventHandler`,
                );
            }

            const eventId = (event as any).eventId || event.aggregateId;

            // Check if already processed
            if (await tracker.isProcessed(eventId, handlerName)) {
                console.log(
                    `[${handlerName}] Skipping duplicate event ${eventId}`,
                );
                return;
            }

            // Process the event
            await originalHandle.call(this, event);

            // Mark as processed
            await tracker.markProcessed(eventId, handlerName);
        };

        // Apply the standard @EventsHandler decorator
        return EventsHandler(eventClass)(target);
    };
}
