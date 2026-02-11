import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { EventStorePublisher } from './es-eventstore.publisher';
import { AbstractEventStore } from './es-core/eventstore.base';
import { DomainEventSerializer } from './es-core/domain-event-serializer';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent extends DomainEvent {
    constructor(aggregateId: string, public readonly data: string) {
        super({
            aggregateId,
            aggregateType: 'Test',
            aggregateVersion: 1,
            eventVersion: 1,
            timestamp: Date.now(),
        } as any);
    }
}

describe('EventStorePublisher', () => {
    let publisher: EventStorePublisher;
    let eventStore: jest.Mocked<AbstractEventStore>;
    let eventBus: jest.Mocked<EventBus>;
    let serializer: jest.Mocked<DomainEventSerializer>;

    beforeEach(async () => {
        const mockEventStore = {
            persist: jest.fn().mockResolvedValue(undefined),
            getEventsByStreamId: jest.fn(),
        };

        const mockEventBus = {
            publisher: null,
        };

        const mockSerializer = {
            serialize: jest.fn((event) => ({
                eventName: event.constructor.name,
                aggregateId: event.aggregateId,
                payload: event,
            })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventStorePublisher,
                { provide: AbstractEventStore, useValue: mockEventStore },
                { provide: EventBus, useValue: mockEventBus },
                { provide: DomainEventSerializer, useValue: mockSerializer },
            ],
        }).compile();

        publisher = module.get<EventStorePublisher>(EventStorePublisher);
        eventStore = module.get(AbstractEventStore) as jest.Mocked<AbstractEventStore>;
        eventBus = module.get(EventBus) as jest.Mocked<EventBus>;
        serializer = module.get(DomainEventSerializer) as jest.Mocked<DomainEventSerializer>;
    });

    describe('onApplicationBootstrap', () => {
        it('should set itself as the event bus publisher', () => {
            publisher.onApplicationBootstrap();
            expect(eventBus.publisher).toBe(publisher);
        });
    });

    describe('publish', () => {
        it('should serialize and persist a single event', async () => {
            const event = new TestEvent('agg-1', 'test data');

            await publisher.publish(event);

            expect(serializer.serialize).toHaveBeenCalledWith(event);
            expect(eventStore.persist).toHaveBeenCalledWith({
                eventName: 'TestEvent',
                aggregateId: 'agg-1',
                payload: event,
            });
        });

        it('should handle event persistence', async () => {
            const event = new TestEvent('agg-2', 'another test');

            await publisher.publish(event);

            expect(eventStore.persist).toHaveBeenCalledTimes(1);
        });
    });

    describe('publishAll', () => {
        it('should serialize and persist multiple events', async () => {
            const event1 = new TestEvent('agg-1', 'data 1');
            const event2 = new TestEvent('agg-1', 'data 2');
            (event1 as any).aggregateVersion = 1;
            (event2 as any).aggregateVersion = 2;

            await publisher.publishAll([event1, event2]);

            expect(serializer.serialize).toHaveBeenCalledTimes(2);
            expect(eventStore.persist).toHaveBeenCalledWith([
                {
                    eventName: 'TestEvent',
                    aggregateId: 'agg-1',
                    payload: event1,
                    position: 1,
                },
                {
                    eventName: 'TestEvent',
                    aggregateId: 'agg-1',
                    payload: event2,
                    position: 2,
                },
            ]);
        });

        it('should handle empty event array', async () => {
            await publisher.publishAll([]);

            expect(serializer.serialize).not.toHaveBeenCalled();
            expect(eventStore.persist).toHaveBeenCalledWith([]);
        });

        it('should add position from aggregate version', async () => {
            const event = new TestEvent('agg-3', 'versioned');
            (event as any).aggregateVersion = 5;

            await publisher.publishAll([event]);

            expect(eventStore.persist).toHaveBeenCalledWith([
                expect.objectContaining({ position: 5 }),
            ]);
        });
    });
});
