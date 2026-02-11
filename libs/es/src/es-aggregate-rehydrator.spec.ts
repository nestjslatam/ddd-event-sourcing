import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { AggregateRehydrator } from './es-aggregate-rehydrator';
import { AbstractEventStore } from './es-core/eventstore.base';
import { AbstractSnapshotStore } from './es-core/snapshot-store.base';
import { DddAggregateRoot, DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly value: number,
  ) {
    super({
      aggregateId,
      aggregateType: 'TestAggregate',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

interface TestAggregateProps {
  value: number;
}

class TestAggregate extends DddAggregateRoot<
  TestAggregate,
  TestAggregateProps
> {
  constructor(props: TestAggregateProps | string) {
    if (typeof props === 'string') {
      super({ value: 0 });
    } else {
      super(props);
    }
  }

  increment(amount: number) {
    this.apply(new TestEvent(this.id.toString(), amount));
  }

  private onTestEvent(event: TestEvent) {
    this.props.value += event.value;
  }
}

describe('AggregateRehydrator', () => {
  let rehydrator: AggregateRehydrator;
  let eventStore: jest.Mocked<AbstractEventStore>;
  let snapshotStore: jest.Mocked<AbstractSnapshotStore>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const mockEventStore = {
      persist: jest.fn(),
      getEventsByStreamId: jest.fn(),
    };

    const mockSnapshotStore = {
      getLast: jest.fn(),
      save: jest.fn(),
    };

    const mockEventPublisher = {
      mergeClassContext: jest.fn((cls) => cls),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregateRehydrator,
        { provide: AbstractEventStore, useValue: mockEventStore },
        { provide: AbstractSnapshotStore, useValue: mockSnapshotStore },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    rehydrator = module.get<AggregateRehydrator>(AggregateRehydrator);
    eventStore = module.get(
      AbstractEventStore,
    ) as jest.Mocked<AbstractEventStore>;
    snapshotStore = module.get(
      AbstractSnapshotStore,
    ) as jest.Mocked<AbstractSnapshotStore>;
    eventPublisher = module.get(EventPublisher) as jest.Mocked<EventPublisher>;
  });

  describe('rehydrate without snapshots', () => {
    it('should rehydrate aggregate from event stream', async () => {
      const aggregateId = 'agg-1';
      const events = [
        new TestEvent(aggregateId, 10),
        new TestEvent(aggregateId, 20),
        new TestEvent(aggregateId, 30),
      ];

      eventStore.getEventsByStreamId.mockResolvedValue(events);
      snapshotStore.getLast.mockResolvedValue(null);

      const aggregate = await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect(snapshotStore.getLast).toHaveBeenCalledWith(aggregateId);
      expect(eventStore.getEventsByStreamId).toHaveBeenCalledWith(aggregateId);
      expect(aggregate.props.value).toBe(60);
    });

    it('should merge class context with event publisher', async () => {
      const aggregateId = 'agg-2';
      eventStore.getEventsByStreamId.mockResolvedValue([]);
      snapshotStore.getLast.mockResolvedValue(null);

      await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect(eventPublisher.mergeClassContext).toHaveBeenCalledWith(
        TestAggregate,
      );
    });

    it('should handle empty event stream', async () => {
      const aggregateId = 'agg-3';
      eventStore.getEventsByStreamId.mockResolvedValue([]);
      snapshotStore.getLast.mockResolvedValue(null);

      const aggregate = await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect(aggregate.props.value).toBe(0);
    });
  });

  describe('rehydrate with snapshots', () => {
    it('should rehydrate from snapshot and subsequent events', async () => {
      const aggregateId = 'agg-4';
      const snapshot = {
        aggregateId,
        aggregateType: 'TestAggregate',
        version: 2,
        payload: { value: 50 },
        timestamp: new Date(),
      };
      const eventsAfterSnapshot = [
        new TestEvent(aggregateId, 15),
        new TestEvent(aggregateId, 25),
      ];

      snapshotStore.getLast.mockResolvedValue(snapshot);
      eventStore.getEventsByStreamId.mockResolvedValue(eventsAfterSnapshot);

      const aggregate = await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect(snapshotStore.getLast).toHaveBeenCalledWith(aggregateId);
      expect(eventStore.getEventsByStreamId).toHaveBeenCalledWith(
        aggregateId,
        2,
      );
      expect(aggregate.props.value).toBe(90); // 50 + 15 + 25
    });

    it('should restore version from snapshot', async () => {
      const aggregateId = 'agg-5';
      const snapshot = {
        aggregateId,
        aggregateType: 'TestAggregate',
        version: 10,
        payload: { value: 100 },
        timestamp: new Date(),
      };

      snapshotStore.getLast.mockResolvedValue(snapshot);
      eventStore.getEventsByStreamId.mockResolvedValue([]);

      const aggregate = await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect((aggregate as any).version).toBe(10);
      expect((aggregate as any).id).toBe(aggregateId);
    });
  });

  describe('rehydrator without snapshot store', () => {
    beforeEach(async () => {
      const mockEventStore = {
        persist: jest.fn(),
        getEventsByStreamId: jest.fn(),
      };

      const mockEventPublisher = {
        mergeClassContext: jest.fn((cls) => cls),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AggregateRehydrator,
          { provide: AbstractEventStore, useValue: mockEventStore },
          { provide: EventPublisher, useValue: mockEventPublisher },
        ],
      }).compile();

      rehydrator = module.get<AggregateRehydrator>(AggregateRehydrator);
      eventStore = module.get(
        AbstractEventStore,
      ) as jest.Mocked<AbstractEventStore>;
      eventPublisher = module.get(
        EventPublisher,
      ) as jest.Mocked<EventPublisher>;
    });

    it('should work without snapshot store', async () => {
      const aggregateId = 'agg-6';
      const events = [new TestEvent(aggregateId, 42)];

      eventStore.getEventsByStreamId.mockResolvedValue(events);

      const aggregate = await rehydrator.rehydrate(aggregateId, TestAggregate);

      expect(aggregate.props.value).toBe(42);
      expect(eventStore.getEventsByStreamId).toHaveBeenCalledWith(aggregateId);
    });
  });
});
