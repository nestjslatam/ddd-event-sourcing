import { Test, TestingModule } from '@nestjs/testing';
import { DomainEventDeserializer } from '../domain-event-deserializer';
import { UpcasterRegistry } from './upcaster.registry';
import { IEventUpcaster } from './upcaster.interface';
import { InfrastructureEvent } from '../infrastructure-event';
import { MongoEventStore } from '../../es-store/mongo-event-store';
import { getModelToken } from '@nestjs/mongoose';
import { EVENT_STORE_CONNECTION } from '../../es-store/constants';

// Mock Event class
class TestEvent {
  constructor(public readonly data: string) {}
}

const mockEventHTML = {
  eventName: 'TestEvent',
  aggregateId: '123',
  aggregateVersion: 1,
  eventId: 'abc',
  occurredOn: new Date(),
  attributes: { data: 'original' },
};

// Upcaster
class TestUpcaster implements IEventUpcaster {
  supports(eventName: string): boolean {
    return eventName === 'TestEvent';
  }
  upcast(event: InfrastructureEvent): InfrastructureEvent {
    return {
      ...event,
      attributes: {
        ...event.attributes,
        data: 'upcasted',
      },
    };
  }
}

describe('Event Upcasting', () => {
  let eventStore: MongoEventStore;
  let registry: UpcasterRegistry;
  let deserializer: DomainEventDeserializer;
  let model: any;

  beforeEach(async () => {
    model = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnValue([{ toJSON: () => mockEventHTML }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoEventStore,
        UpcasterRegistry,
        {
          provide: DomainEventDeserializer,
          useValue: {
            deserialize: jest.fn((evt) => new TestEvent(evt.attributes.data)),
          },
        },
        {
          provide: getModelToken('Event', EVENT_STORE_CONNECTION),
          useValue: model,
        },
      ],
    }).compile();

    eventStore = module.get<MongoEventStore>(MongoEventStore);
    registry = module.get<UpcasterRegistry>(UpcasterRegistry);
    deserializer = module.get<DomainEventDeserializer>(DomainEventDeserializer);
  });

  it('should upcast event before deserialization', async () => {
    // Register upcaster
    registry.register(new TestUpcaster());

    const events = await eventStore.getEventsByStreamId('123');

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TestEvent);
    expect((events[0] as unknown as TestEvent).data).toBe('upcasted');

    // Verify deserializer was called with upcasted data
    expect(deserializer.deserialize).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { data: 'upcasted' },
      }),
    );
  });
});
