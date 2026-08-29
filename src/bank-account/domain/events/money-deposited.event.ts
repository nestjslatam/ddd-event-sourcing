import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '@nestjslatam/ddd-es-lib';

import { IReplayMetadata } from './account-opened.event';

/**
 * Accepts either the domain arguments or a metadata object -- see
 * {@link AccountOpenedEvent} for why the second shape is required on the
 * replay path.
 */
@EsAutowiredEvent
export class MoneyDepositedEvent extends DomainEvent {
  public accountId!: string;
  public amount!: number;
  public currency!: string;

  constructor(
    accountIdOrMetadata: string | IReplayMetadata,
    amount?: number,
    currency?: string,
  ) {
    const replaying = typeof accountIdOrMetadata !== 'string';
    const aggregateId = replaying
      ? accountIdOrMetadata.aggregateId
      : accountIdOrMetadata;

    super({
      aggregateId,
      aggregateType: 'BankAccount',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as never);

    if (!replaying) {
      this.accountId = aggregateId;
      this.amount = amount as number;
      this.currency = currency as string;
    }
  }
}
