import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '@nestjslatam/ddd-es-lib';

/** What `DomainEventDeserializer` passes when rebuilding an event from storage. */
export interface IReplayMetadata {
  aggregateId: string;
  eventId?: string;
  occurredOn?: Date;
}

/**
 * The constructor accepts either the domain arguments or a metadata object.
 *
 * The second shape is what `DomainEventDeserializer` uses: it rebuilds an
 * event from storage by calling `new EventClass(metadata)` and then assigning
 * the domain fields from the stored attributes. With only the positional form,
 * `accountId` received the metadata object itself on every replay, `aggregateId`
 * became that object, and the projector wrote it into a string `_id`.
 */
@EsAutowiredEvent
export class AccountOpenedEvent extends DomainEvent {
  public accountId!: string;
  public holderName!: string;
  public initialBalance!: number;
  public currency!: string;

  constructor(
    accountIdOrMetadata: string | IReplayMetadata,
    holderName?: string,
    initialBalance?: number,
    currency?: string,
  ) {
    const replaying = typeof accountIdOrMetadata !== 'string';
    const aggregateId = replaying
      ? accountIdOrMetadata.aggregateId
      : accountIdOrMetadata;

    super({
      aggregateId,
      aggregateType: 'BankAccount',
      aggregateVersion: 1, // Overridden by the aggregate.
      eventVersion: 1,
      timestamp: Date.now(),
    } as never);

    if (!replaying) {
      this.accountId = aggregateId;
      this.holderName = holderName as string;
      this.initialBalance = initialBalance as number;
      this.currency = currency as string;
    }
    // When replaying, the deserializer assigns the domain fields from the
    // stored attributes immediately after construction.
  }
}
