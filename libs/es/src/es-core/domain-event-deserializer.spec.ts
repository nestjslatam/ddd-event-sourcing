import { DomainEventDeserializer } from './domain-event-deserializer';
import { DomainEventClsRegistry } from './domain-event-cls.registry';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { InfrastructureEvent } from './infrastructure-event';

class TestEvent extends DomainEvent {
    constructor(
        aggregateId: string,
        public readonly value: string,
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

describe('DomainEventDeserializer', () => {
    let deserializer: DomainEventDeserializer;

    beforeEach(() => {
        deserializer = new DomainEventDeserializer();
        DomainEventClsRegistry.clear();
    });

    afterEach(() => {
        DomainEventClsRegistry.clear();
    });

    describe('deserialize', () => {
        it('should deserialize infrastructure event to domain event', () => {
            DomainEventClsRegistry.register(TestEvent);

            const infraEvent: InfrastructureEvent = {
                aggregateId: 'agg-1',
                aggregateVersion: 1,
                eventId: 'evt-1',
                occurredOn: new Date('2024-01-01'),
                eventName: 'TestEvent',
                attributes: {
                    value: 'test value',
                },
                meta: {},
            };

            const result = deserializer.deserialize(infraEvent);

            expect(result).toBeInstanceOf(TestEvent);
            expect(result.aggregateId).toBe('agg-1');
            expect((result as TestEvent).value).toBe('test value');
        });

        it('should throw error if event class not registered', () => {
            const infraEvent: InfrastructureEvent = {
                aggregateId: 'agg-2',
                aggregateVersion: 1,
                eventId: 'evt-2',
                occurredOn: new Date(),
                eventName: 'UnknownEvent',
                attributes: {},
                meta: {},
            };

            expect(() => deserializer.deserialize(infraEvent)).toThrow(
                /Event class not found for eventName: "UnknownEvent"/
            );
        });

        it('should convert occurredOn string to Date object', () => {
            DomainEventClsRegistry.register(TestEvent);

            const infraEvent: InfrastructureEvent = {
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

            const infraEvent: InfrastructureEvent = {
                aggregateId: 'agg-4',
                aggregateVersion: 2,
                eventId: 'evt-4',
                occurredOn: new Date(),
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

            const infraEvent: InfrastructureEvent = {
                aggregateId: 'agg-5',
                aggregateVersion: 3,
                eventId: 'evt-5',
                occurredOn: new Date('2024-03-20'),
                eventName: 'TestEvent',
                attributes: {
                    value: 'complex data',
                },
                meta: { source: 'test' },
            };

            const result = deserializer.deserialize(infraEvent);

            expect((result as any).eventId).toBe('evt-5');
            expect((result as any).eventName).toBe('TestEvent');
            expect((result as any).meta).toEqual({ source: 'test' });
        });
    });
});
