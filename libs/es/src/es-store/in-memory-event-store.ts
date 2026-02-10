import { Injectable, Logger } from '@nestjs/common';
import { AbstractEventStore, DomainEventDeserializer } from '../es-core';
import { ISerializable } from '@nestjslatam/ddd-lib';

@Injectable()
export class InMemoryEventStore implements AbstractEventStore {
    private readonly events: any[] = [];
    private readonly logger = new Logger(InMemoryEventStore.name);

    constructor(
        private readonly eventDeserializer: DomainEventDeserializer,
    ) { }

    async persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void> {
        const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
        for (const event of events) {
            this.events.push(event);
        }
        this.logger.log(`Persisted ${events.length} events to InMemory store`);
    }

    async getEventsByStreamId(streamId: string, fromVersion?: number): Promise<ISerializable[]> {
        this.logger.log(`Getting events for stream ${streamId}`);
        // Naive implementation: In real app, we would store by streamId and check versions
        // Since this is for verification of injection, we can keep it simple or implement properly
        // Let's assume we store the serialized event or the domain event directly?
        // AbstractEventStore expects ISerializable (DomainEvent) to be passed to persist.
        // But usually we serialize them before storing.
        // For in-memory, we can store them as is, but getEventsByStreamId expects to return them.

        // In Mongo implementation we serialize to JSON and then deserialize.
        // Here let's just return what we stored if it matches streamId.

        // BUT we need to inspect the event to check streamId (aggregateId).
        return this.events.filter(e => e.aggregateId === streamId);
    }
}
