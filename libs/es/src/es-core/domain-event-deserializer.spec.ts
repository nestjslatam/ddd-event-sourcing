import { DomainEventDeserializer } from './domain-event-deserializer';
import { DomainEventClsRegistry } from './domain-event-cls.registry';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent extends DomainEvent {
  public value!: string;

  constructor(metadata?: {
    aggregateId: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    // Initialize with provided metadata or placeholder
    super({
      aggregateId: metadata?.aggregateId || 'placeholder-id',
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: metadata?.occurredOn?.getTime() || Date.now(),
    } as any);
  }
}

describe('DomainEventDeserializer', () => {
  let deserializer: DomainEventDeserializer;

  beforeEach(() => {
    deserializer = new DomainEventDeserializer();
  });

  describe('deserialize', () => {
    it('should deserialize infrastructure event to domain event', () => {
      DomainEventClsRegistry.register(TestEvent);

      const infraEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date('2024-06-15T10:30:00Z'),
        eventName: 'TestEvent',
        attributes: { value: 'test value' },
        meta: {},
      };

      const result = deserializer.deserialize(infraEvent);

      expect(result).toBeInstanceOf(TestEvent);
      expect(result.aggregateId).toBe('agg-1');
      expect((result as TestEvent).value).toBe('test value');
    });

    it('should throw error if event class not registered', () => {
      const infraEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'UnknownEvent',
        attributes: {},
        meta: {},
      };

      expect(() => deserializer.deserialize(infraEvent)).toThrow(
        'Event class not found for eventName: "UnknownEvent"',
      );
    });

    it('should convert occurredOn string to Date object', () => {
      DomainEventClsRegistry.register(TestEvent);

      const infraEvent = {
        aggregateId: 'agg-3',
        aggregateVersion: 1,
        eventId: 'evt-3',
        occurredOn: '2024-06-15T10:30:00Z' as any,
        eventName: 'TestEvent',
        attributes: { value: 'data' },
        meta: {},
      };

      const result = deserializer.deserialize(infraEvent);

      expect((result as any).occurredOn).toBeInstanceOf(Date);
    });

    it('should use static deserialize method', () => {
      DomainEventClsRegistry.register(TestEvent);

      const infraEvent = {
        aggregateId: 'agg-4',
        aggregateVersion: 1,
        eventId: 'evt-4',
        occurredOn: new Date('2024-06-15T10:30:00Z'),
        eventName: 'TestEvent',
        attributes: { value: 'static test' },
        meta: {},
      };

      const result = DomainEventDeserializer.deserialize(infraEvent);

      expect(result).toBeInstanceOf(TestEvent);
      expect((result as TestEvent).value).toBe('static test');
    });

    it('should preserve all attributes in deserialized event', () => {
      DomainEventClsRegistry.register(TestEvent);

      const infraEvent = {
        aggregateId: 'agg-5',
        aggregateVersion: 1,
        eventId: 'evt-5',
        occurredOn: new Date('2024-06-15T10:30:00Z'),
        eventName: 'TestEvent',
        attributes: { value: 'preserved' },
        meta: { source: 'test' },
      };

      const result = deserializer.deserialize(infraEvent);

      // Check that custom attributes are preserved
      expect((result as TestEvent).value).toBe('preserved');
      expect(result.aggregateId).toBe('agg-5');
    });
  });
});
