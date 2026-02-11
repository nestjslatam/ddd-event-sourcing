import { DddAggregateRoot } from '@nestjslatam/ddd-lib';

/**
 * Strategy interface for determining when to take snapshots
 */
export interface SnapshotStrategy {
  /**
   * Determine if a snapshot should be taken for the given aggregate
   * @param aggregate The aggregate to evaluate
   * @param eventCount Number of events since last snapshot
   * @returns True if a snapshot should be taken
   */
  shouldTakeSnapshot(
    aggregate: DddAggregateRoot<any, any>,
    eventCount: number,
  ): boolean;
}

/**
 * Snapshot strategy based on event count threshold
 * Takes a snapshot every N events
 */
export class EventCountSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly threshold: number = 10) {
    if (threshold < 1) {
      throw new Error('Snapshot threshold must be at least 1');
    }
  }

  shouldTakeSnapshot(
    aggregate: DddAggregateRoot<any, any>,
    eventCount: number,
  ): boolean {
    return eventCount > 0 && eventCount % this.threshold === 0;
  }
}

/**
 * Snapshot strategy based on time intervals
 * Takes a snapshot if enough time has passed since the last one
 */
export class TimeBasedSnapshotStrategy implements SnapshotStrategy {
  private readonly lastSnapshotTimes = new Map<string, number>();

  constructor(
    private readonly intervalMs: number = 3600000, // 1 hour default
    private readonly minEventCount: number = 5,
  ) {
    if (intervalMs < 1000) {
      throw new Error('Snapshot interval must be at least 1 second');
    }
  }

  shouldTakeSnapshot(
    aggregate: DddAggregateRoot<any, any>,
    eventCount: number,
  ): boolean {
    // Don't snapshot if too few events
    if (eventCount < this.minEventCount) {
      return false;
    }

    const aggregateId = aggregate.id.toString();
    const lastSnapshotTime = this.lastSnapshotTimes.get(aggregateId);

    if (!lastSnapshotTime) {
      // First snapshot for this aggregate
      this.lastSnapshotTimes.set(aggregateId, Date.now());
      return true;
    }

    const timeSinceLastSnapshot = Date.now() - lastSnapshotTime;
    const shouldSnapshot = timeSinceLastSnapshot >= this.intervalMs;

    if (shouldSnapshot) {
      this.lastSnapshotTimes.set(aggregateId, Date.now());
    }

    return shouldSnapshot;
  }
}

/**
 * Composite strategy that combines multiple strategies
 * Takes a snapshot if ANY strategy returns true
 */
export class CompositeSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly strategies: SnapshotStrategy[]) {
    if (strategies.length === 0) {
      throw new Error('At least one strategy must be provided');
    }
  }

  shouldTakeSnapshot(
    aggregate: DddAggregateRoot<any, any>,
    eventCount: number,
  ): boolean {
    return this.strategies.some((strategy) =>
      strategy.shouldTakeSnapshot(aggregate, eventCount),
    );
  }
}
