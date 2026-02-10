import { Injectable, Type, Optional } from '@nestjs/common';
import {
  DddAggregateRoot,
} from '@nestjslatam/ddd-lib';

import { AbstractEventStore, AbstractSnapshotStore } from './es-core';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class AggregateRehydrator {
  constructor(
    private readonly eventStore: AbstractEventStore,
    private readonly eventPublisher: EventPublisher,
    @Optional() private readonly snapshotStore?: AbstractSnapshotStore,
  ) { }

  async rehydrate<T extends DddAggregateRoot<any, any>>(
    aggregateId: string,
    AggregateCls: Type<T>,
  ): Promise<T> {
    let events: any[] = [];
    let snapshot: any = null;

    if (this.snapshotStore) {
      snapshot = await this.snapshotStore.getLast(aggregateId);
    }

    if (snapshot) {
      events = await this.eventStore.getEventsByStreamId(aggregateId, snapshot.version);
    } else {
      events = await this.eventStore.getEventsByStreamId(aggregateId);
    }

    const AggregateClsWithDispatcher =
      this.eventPublisher.mergeClassContext(AggregateCls);

    // If snapshot exists, we assume payload contains the props.
    // If not, we try to pass aggregateId as before (legacy/default behavior)
    const aggregate = new AggregateClsWithDispatcher(snapshot ? snapshot.payload : aggregateId);

    if (snapshot) {
      // Manually restore version and id
      (aggregate as any).id = aggregateId;
      (aggregate as any).version = snapshot.version;
    }

    aggregate.loadFromHistory(events);

    return aggregate;
  }
}
