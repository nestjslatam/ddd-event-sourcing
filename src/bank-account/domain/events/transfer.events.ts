import { DomainEvent } from '@nestjslatam/ddd-lib';

// Transfer events don't need the decorator since they're used directly in sagas
export class TransferInitiatedEvent extends DomainEvent {
  constructor(
    public readonly transferId: string,
    public readonly sourceAccountId: string,
    public readonly targetAccountId: string,
    public readonly amount: number,
  ) {
    super({
      aggregateId: transferId,
      aggregateType: 'MoneyTransfer',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

export class TransferCompletedEvent extends DomainEvent {
  constructor(
    public readonly transferId: string,
    public readonly sourceAccountId: string,
    public readonly targetAccountId: string,
    public readonly amount: number,
  ) {
    super({
      aggregateId: transferId,
      aggregateType: 'MoneyTransfer',
      aggregateVersion: 2,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

export class TransferFailedEvent extends DomainEvent {
  constructor(
    public readonly transferId: string,
    public readonly sourceAccountId: string,
    public readonly targetAccountId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {
    super({
      aggregateId: transferId,
      aggregateType: 'MoneyTransfer',
      aggregateVersion: 2,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}
