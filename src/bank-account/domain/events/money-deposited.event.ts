import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '../../../../libs/es/src/es-decorators/autowired-event.decorator';

@EsAutowiredEvent
export class MoneyDepositedEvent extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super({
      aggregateId: accountId, // Required by constructor, but usually managed by AggregateRoot.apply() merging context
      aggregateType: 'BankAccount',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}
