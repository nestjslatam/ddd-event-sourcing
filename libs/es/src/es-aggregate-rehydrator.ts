import { Injectable, Type } from '@nestjs/common';
import {
  DddAggregateRoot,
} from '@nestjslatam/ddd-lib';

import { AbstractEventStore } from './es-core';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class AggregateRehydrator {
  constructor(
    private readonly eventStore: AbstractEventStore,
    private readonly eventPublisher: EventPublisher,
  ) { }

  async rehydrate<T extends DddAggregateRoot<any, any>>(
    aggregateId: string,
    AggregateCls: Type<T>,
  ): Promise<T> {
    const events = await this.eventStore.getEventsByStreamId(aggregateId);

    const AggregateClsWithDispatcher =
      this.eventPublisher.mergeClassContext(AggregateCls);
    const aggregate = new AggregateClsWithDispatcher(aggregateId);

    aggregate.loadFromHistory(events);

    return aggregate;
  }
}
