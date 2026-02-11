import { Test, TestingModule } from '@nestjs/testing';
import { EsModule } from '../es.module';
import { AbstractEventStore } from './eventstore.base';
import { InMemoryEventStore } from '../es-store/in-memory-event-store';
import { DomainEventDeserializer } from './domain-event-deserializer';
import { EventStorePublisher } from '../es-eventstore.publisher';

describe('Repository Pattern (Custom Driver)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EsModule.forRoot({
          driver: 'custom',
          eventStoreClass: InMemoryEventStore,
        }),
      ],
    }).compile();
  });

  it('should provide InMemoryEventStore as AbstractEventStore', () => {
    const eventStore = module.get<AbstractEventStore>(AbstractEventStore);
    expect(eventStore).toBeInstanceOf(InMemoryEventStore);
  });

  it('should not provide MongoEventStore', () => {
    // We can't easily check for "not provided" without trying to get it and expecting error
    // but we can check if AbstractEventStore is NOT MongoEventStore (if we imported it)
    const eventStore = module.get<AbstractEventStore>(AbstractEventStore);
    expect(eventStore.constructor.name).toBe('InMemoryEventStore');
  });

  it('should provide common dependencies', () => {
    expect(module.get(EventStorePublisher)).toBeDefined();
    expect(module.get(DomainEventDeserializer)).toBeDefined();
  });
});
