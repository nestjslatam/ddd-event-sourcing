import { Injectable, Logger, Optional, Type } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { DddAggregateRoot } from '@nestjslatam/ddd-lib';
import { AbstractEventStore } from './es-core/eventstore.base';
import {
  AbstractSnapshotStore,
  SnapshotEnvelope,
} from './es-core/snapshot-store.base';
import { SnapshotStrategy } from './es-core/snapshot-strategy.interface';

/**
 * Enhanced Aggregate Rehydrator with automatic snapshot management
 * Supports configurable snapshot strategies for performance optimization
 */
@Injectable()
export class EnhancedAggregateRehydrator {
  private readonly logger = new Logger(EnhancedAggregateRehydrator.name);

  constructor(
    private readonly eventStore: AbstractEventStore,
    private readonly eventPublisher: EventPublisher,
    @Optional() private readonly snapshotStore?: AbstractSnapshotStore,
    @Optional() private readonly snapshotStrategy?: SnapshotStrategy,
  ) {}

  /**
   * Rehydrate an aggregate from its event stream
   * Automatically takes snapshots based on configured strategy
   */
  async rehydrate<T extends DddAggregateRoot<any, any, any>>(
    aggregateId: string,
    AggregateCls: Type<T>,
  ): Promise<T> {
    const startTime = Date.now();

    // Try to load from snapshot
    const snapshot = await this.loadSnapshot(aggregateId);
    const fromVersion = snapshot?.version;

    // Load events since snapshot (or all events if no snapshot)
    const events = await this.eventStore.getEventsByStreamId(
      aggregateId,
      fromVersion,
    );

    this.logger.debug(
      `Loaded ${events.length} events for aggregate ${aggregateId}` +
        (snapshot ? ` from snapshot version ${snapshot.version}` : ''),
    );

    // Reconstruct aggregate
    const aggregate = this.reconstructAggregate(AggregateCls, snapshot, events);

    // Auto-snapshot if strategy suggests
    if (this.shouldTakeSnapshot(aggregate, events.length)) {
      await this.takeSnapshot(aggregate);
    }

    const duration = Date.now() - startTime;
    this.logger.debug(`Rehydrated aggregate ${aggregateId} in ${duration}ms`);

    return aggregate;
  }

  /**
   * Load the latest snapshot for an aggregate
   */
  private async loadSnapshot(
    aggregateId: string,
  ): Promise<SnapshotEnvelope | null> {
    if (!this.snapshotStore) {
      return null;
    }

    try {
      return await this.snapshotStore.getLast(aggregateId);
    } catch (error) {
      this.logger.warn(
        `Failed to load snapshot for ${aggregateId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Reconstruct aggregate from snapshot and events
   */
  private reconstructAggregate<T extends DddAggregateRoot<any, any, any>>(
    AggregateCls: Type<T>,
    snapshot: SnapshotEnvelope | null,
    events: any[],
  ): T {
    // Merge class context with event publisher
    const AggregateClsWithDispatcher =
      this.eventPublisher.mergeClassContext(AggregateCls);

    // An aggregate's constructor is (props, options?) -- the id belongs in the
    // options bag, not in the props slot. Passing the id string as props gave
    // every replayed aggregate a string where its props should be, so the
    // first event handler to assign a field threw
    // `Cannot create property 'holderName' on string '...'`.
    //
    // Replaying starts from empty props by design: the events are what fill
    // them, which is the whole premise of event sourcing.
    const aggregateId = snapshot?.aggregateId ?? events[0]?.aggregateId;
    const aggregate = snapshot
      ? new AggregateClsWithDispatcher(snapshot.payload, { id: aggregateId })
      : new AggregateClsWithDispatcher({}, { id: aggregateId });

    // Restore the version from the snapshot. The id came from the constructor
    // above; assigning it here as a raw string used to replace the
    // IdValueObject the base had built.
    if (snapshot) {
      (aggregate as any).version = snapshot.version;
    }

    // One call with the whole array. `loadFromHistory(history: EventBase[])`
    // iterates internally, so feeding it one event at a time threw
    // `TypeError: history.forEach is not a function` on the first event --
    // meaning this rehydrator, the one with snapshot support and the one the
    // sample uses, had never replayed an aggregate successfully. The plain
    // AggregateRehydrator next to it always called it correctly.
    aggregate.loadFromHistory(events);

    return aggregate;
  }

  /**
   * Determine if a snapshot should be taken
   */
  private shouldTakeSnapshot(
    aggregate: DddAggregateRoot<any, any, any>,
    eventCount: number,
  ): boolean {
    if (!this.snapshotStore || !this.snapshotStrategy) {
      return false;
    }

    return this.snapshotStrategy.shouldTakeSnapshot(aggregate, eventCount);
  }

  /**
   * Take a snapshot of the aggregate's current state
   */
  private async takeSnapshot(
    aggregate: DddAggregateRoot<any, any>,
  ): Promise<void> {
    if (!this.snapshotStore) {
      return;
    }

    try {
      const snapshot: SnapshotEnvelope = {
        aggregateId: aggregate.id.toString(),
        aggregateType: aggregate.constructor.name,
        version: (aggregate as any).version || 0,
        payload: aggregate.props,
        timestamp: new Date(),
      };

      await this.snapshotStore.save(snapshot);

      this.logger.debug(
        `Saved snapshot for ${snapshot.aggregateId} at version ${snapshot.version}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save snapshot for ${aggregate.id}: ${error.message}`,
      );
      // Don't throw - snapshot failure shouldn't break rehydration
    }
  }
}
