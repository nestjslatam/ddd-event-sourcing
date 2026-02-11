import {
  EventCountSnapshotStrategy,
  TimeBasedSnapshotStrategy,
  CompositeSnapshotStrategy,
} from './snapshot-strategy.interface';
import { DddAggregateRoot, IdValueObject } from '@nestjslatam/ddd-lib';

// Mock aggregate for testing
class MockAggregate extends DddAggregateRoot<any, any, object> {
  public lastSnapshotAt?: Date;
  private _mockVersion: number;

  constructor(id: string, version: number, lastSnapshotAt?: Date) {
    const mockId = { toString: () => id } as IdValueObject;
    super({ id: mockId } as any);
    this._mockVersion = version;
    this.lastSnapshotAt = lastSnapshotAt;
  }

  get version(): number {
    return this._mockVersion;
  }
}

describe('Snapshot Strategies', () => {
  describe('EventCountSnapshotStrategy', () => {
    it('should snapshot every N events', () => {
      const strategy = new EventCountSnapshotStrategy(10);
      const aggregate = new MockAggregate('agg-1', 10);

      expect(strategy.shouldTakeSnapshot(aggregate, 10)).toBe(true);
      expect(strategy.shouldTakeSnapshot(aggregate, 9)).toBe(false);
      expect(strategy.shouldTakeSnapshot(aggregate, 11)).toBe(true);
    });

    it('should snapshot at exact intervals', () => {
      const strategy = new EventCountSnapshotStrategy(5);
      const aggregate = new MockAggregate('agg-1', 15);

      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(true);
      expect(strategy.shouldTakeSnapshot(aggregate, 10)).toBe(true);
      expect(strategy.shouldTakeSnapshot(aggregate, 15)).toBe(true);
      expect(strategy.shouldTakeSnapshot(aggregate, 7)).toBe(false);
    });

    it('should not snapshot with 0 events', () => {
      const strategy = new EventCountSnapshotStrategy(10);
      const aggregate = new MockAggregate('agg-1', 0);

      expect(strategy.shouldTakeSnapshot(aggregate, 0)).toBe(false);
    });

    it('should handle interval of 1', () => {
      const strategy = new EventCountSnapshotStrategy(1);
      const aggregate = new MockAggregate('agg-1', 1);

      expect(strategy.shouldTakeSnapshot(aggregate, 1)).toBe(true);
      expect(strategy.shouldTakeSnapshot(aggregate, 2)).toBe(true);
    });
  });

  describe('TimeBasedSnapshotStrategy', () => {
    it('should snapshot after time interval', () => {
      const oneHour = 3600000;
      const strategy = new TimeBasedSnapshotStrategy(oneHour, 1);

      const twoHoursAgo = new Date(Date.now() - 2 * oneHour);
      const aggregate = new MockAggregate('agg-1', 10, twoHoursAgo);

      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(true);
    });

    it('should not snapshot before time interval', () => {
      const oneHour = 3600000;
      const strategy = new TimeBasedSnapshotStrategy(oneHour, 1);

      const thirtyMinutesAgo = new Date(Date.now() - oneHour / 2);
      const aggregate = new MockAggregate('agg-1', 10, thirtyMinutesAgo);

      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(false);
    });

    it('should snapshot if no previous snapshot', () => {
      const oneHour = 3600000;
      const strategy = new TimeBasedSnapshotStrategy(oneHour, 5);

      const aggregate = new MockAggregate('agg-1', 10);

      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(true);
    });

    it('should respect minimum event count', () => {
      const oneHour = 3600000;
      const strategy = new TimeBasedSnapshotStrategy(oneHour, 10);

      const twoHoursAgo = new Date(Date.now() - 2 * oneHour);
      const aggregate = new MockAggregate('agg-1', 5, twoHoursAgo);

      // Time elapsed but not enough events
      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(false);
      expect(strategy.shouldTakeSnapshot(aggregate, 10)).toBe(true);
    });

    it('should not snapshot with insufficient events even if no previous snapshot', () => {
      const oneHour = 3600000;
      const strategy = new TimeBasedSnapshotStrategy(oneHour, 10);

      const aggregate = new MockAggregate('agg-1', 5);

      expect(strategy.shouldTakeSnapshot(aggregate, 5)).toBe(false);
    });
  });

  describe('CompositeSnapshotStrategy', () => {
    it('should snapshot if any strategy returns true', () => {
      const strategy1 = new EventCountSnapshotStrategy(10);
      const strategy2 = new EventCountSnapshotStrategy(20);
      const composite = new CompositeSnapshotStrategy([strategy1, strategy2]);

      const aggregate = new MockAggregate('agg-1', 10);

      // 10 events - strategy1 says yes, strategy2 says no
      expect(composite.shouldTakeSnapshot(aggregate, 10)).toBe(true);
    });

    it('should not snapshot if all strategies return false', () => {
      const strategy1 = new EventCountSnapshotStrategy(10);
      const strategy2 = new EventCountSnapshotStrategy(20);
      const composite = new CompositeSnapshotStrategy([strategy1, strategy2]);

      const aggregate = new MockAggregate('agg-1', 5);

      expect(composite.shouldTakeSnapshot(aggregate, 5)).toBe(false);
    });

    it('should combine time and count strategies', () => {
      const oneHour = 3600000;
      const countStrategy = new EventCountSnapshotStrategy(100);
      const timeStrategy = new TimeBasedSnapshotStrategy(oneHour, 5);
      const composite = new CompositeSnapshotStrategy([
        countStrategy,
        timeStrategy,
      ]);

      const twoHoursAgo = new Date(Date.now() - 2 * oneHour);
      const aggregate = new MockAggregate('agg-1', 50, twoHoursAgo);

      // Only 50 events (count strategy says no) but time elapsed (time strategy says yes)
      expect(composite.shouldTakeSnapshot(aggregate, 10)).toBe(true);
    });

    it('should handle empty strategy array', () => {
      const composite = new CompositeSnapshotStrategy([]);
      const aggregate = new MockAggregate('agg-1', 10);

      expect(composite.shouldTakeSnapshot(aggregate, 10)).toBe(false);
    });

    it('should handle single strategy', () => {
      const strategy = new EventCountSnapshotStrategy(10);
      const composite = new CompositeSnapshotStrategy([strategy]);
      const aggregate = new MockAggregate('agg-1', 10);

      expect(composite.shouldTakeSnapshot(aggregate, 10)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should support aggressive snapshotting (every event)', () => {
      const strategy = new EventCountSnapshotStrategy(1);
      const aggregate = new MockAggregate('agg-1', 100);

      for (let i = 1; i <= 100; i++) {
        expect(strategy.shouldTakeSnapshot(aggregate, i)).toBe(true);
      }
    });

    it('should support conservative snapshotting (rarely)', () => {
      const strategy = new EventCountSnapshotStrategy(1000);
      const aggregate = new MockAggregate('agg-1', 999);

      expect(strategy.shouldTakeSnapshot(aggregate, 999)).toBe(false);
      expect(strategy.shouldTakeSnapshot(aggregate, 1000)).toBe(true);
    });

    it('should support hybrid strategy (time OR count)', () => {
      const oneHour = 3600000;
      const composite = new CompositeSnapshotStrategy([
        new EventCountSnapshotStrategy(100), // Every 100 events
        new TimeBasedSnapshotStrategy(oneHour, 10), // Or every hour (min 10 events)
      ]);

      // Scenario 1: 100 events reached
      const agg1 = new MockAggregate('agg-1', 100);
      expect(composite.shouldTakeSnapshot(agg1, 100)).toBe(true);

      // Scenario 2: Time elapsed with enough events
      const twoHoursAgo = new Date(Date.now() - 2 * oneHour);
      const agg2 = new MockAggregate('agg-2', 50, twoHoursAgo);
      expect(composite.shouldTakeSnapshot(agg2, 15)).toBe(true);

      // Scenario 3: Neither condition met
      const thirtyMinutesAgo = new Date(Date.now() - oneHour / 2);
      const agg3 = new MockAggregate('agg-3', 50, thirtyMinutesAgo);
      expect(composite.shouldTakeSnapshot(agg3, 50)).toBe(false);
    });
  });
});
