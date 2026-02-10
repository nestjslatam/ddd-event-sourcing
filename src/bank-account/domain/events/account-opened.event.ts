import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '../../../../libs/es/src/es-decorators/autowired-event.decorator';

@EsAutowiredEvent
export class AccountOpenedEvent extends DomainEvent {
    constructor(
        public readonly accountId: string,
        public readonly holderName: string,
        public readonly initialBalance: number,
        public readonly currency: string,
    ) {
        super({
            aggregateId: accountId,
            aggregateType: 'BankAccount',
            aggregateVersion: 1, // Will be overridden by aggregate
            eventVersion: 1,
            timestamp: Date.now(),
        } as any);
    }
}
