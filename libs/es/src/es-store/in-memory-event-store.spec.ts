import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryEventStore } from './in-memory-event-store';
import { DomainEventDeserializer } from '../es-core/domain-event-deserializer';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly value: number,
  ) {
    super({
      aggregateId,
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

describe('InMemoryEventStore', () => {
  let eventStore: InMemoryEventStore;

  beforeEach(async () => {
    const mockDeserializer = {
      deserialize: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InMemoryEventStore,
        { provide: DomainEventDeserializer, useValue: mockDeserializer },
      ],
    }).compile();

    eventStore = module.get<InMemoryEventStore>(InMemoryEventStore);
    module.get(DomainEventDeserializer) as jest.Mocked<DomainEventDeserializer>;
  });

  describe('persist', () => {
    it('should persist a single event', async () => {
      const event = new TestEvent('agg-1', 100);

      await eventStore.persist(event);

      const events = await eventStore.getEventsByStreamId('agg-1');
      expect(events).toHaveLength(1);
      expect(events[0]).toBe(event);
    });

    it('should persist multiple events', async () => {
      const event1 = new TestEvent('agg-2', 10);
      const event2 = new TestEvent('agg-2', 20);

      await eventStore.persist([event1, event2]);

      const events = await eventStore.getEventsByStreamId('agg-2');
      expect(events).toHaveLength(2);
    });

    it('should log persistence', async () => {
      const loggerSpy = jest.spyOn((eventStore as any).logger, 'log');
      const event = new TestEvent('agg-3', 50);

      await eventStore.persist(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Persisted 1 events to InMemory store',
      );
    });
  });

  describe('getEventsByStreamId', () => {
    it('should return events for a specific stream', async () => {
      const event1 = new TestEvent('agg-4', 1);
      const event2 = new TestEvent('agg-4', 2);
      const event3 = new TestEvent('agg-5', 3);

      await eventStore.persist([event1, event2, event3]);

      const events = await eventStore.getEventsByStreamId('agg-4');

      expect(events).toHaveLength(2);
      expect(events).toContain(event1);
      expect(events).toContain(event2);
      expect(events).not.toContain(event3);
    });

    it('should return empty array for non-existent stream', async () => {
      const events = await eventStore.getEventsByStreamId('non-existent');

      expect(events).toEqual([]);
    });

    it('should filter by aggregateId', async () => {
      const event1 = new TestEvent('agg-6', 100);
      const event2 = new TestEvent('agg-7', 200);

      await eventStore.persist([event1, event2]);

      const events = await eventStore.getEventsByStreamId('agg-6');

      expect(events).toHaveLength(1);
      expect((events[0] as TestEvent).value).toBe(100);
    });

    it('should log retrieval', async () => {
      const loggerSpy = jest.spyOn((eventStore as any).logger, 'log');

      await eventStore.getEventsByStreamId('agg-8');

      expect(loggerSpy).toHaveBeenCalledWith('Getting events for stream agg-8');
    });

    it('should handle fromVersion parameter (basic implementation)', async () => {
      const event1 = new TestEvent('agg-9', 1);
      const event2 = new TestEvent('agg-9', 2);

      await eventStore.persist([event1, event2]);

      // In-memory store has basic implementation, just returns all for streamId
      const events = await eventStore.getEventsByStreamId('agg-9', 1);

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('persistence across operations', () => {
    it('should maintain events across multiple persist calls', async () => {
      await eventStore.persist(new TestEvent('agg-10', 1));
      await eventStore.persist(new TestEvent('agg-10', 2));
      await eventStore.persist(new TestEvent('agg-10', 3));

      const events = await eventStore.getEventsByStreamId('agg-10');

      expect(events).toHaveLength(3);
    });

    it('should handle mixed single and array persists', async () => {
      await eventStore.persist(new TestEvent('agg-11', 1));
      await eventStore.persist([
        new TestEvent('agg-11', 2),
        new TestEvent('agg-11', 3),
      ]);

      const events = await eventStore.getEventsByStreamId('agg-11');

      expect(events).toHaveLength(3);
    });
  });
});
