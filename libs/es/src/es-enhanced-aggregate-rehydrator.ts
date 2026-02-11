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

    // Create aggregate instance
    const aggregate = snapshot
      ? new AggregateClsWithDispatcher(snapshot.payload)
      : new AggregateClsWithDispatcher(events[0]?.aggregateId);

    // Restore version and ID from snapshot
    if (snapshot) {
      (aggregate as any).version = snapshot.version;
      (aggregate as any).id = snapshot.aggregateId;
    }

    // Apply events
    events.forEach((event) => aggregate.loadFromHistory(event));

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
