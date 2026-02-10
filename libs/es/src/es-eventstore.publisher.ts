import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  DomainEvent,
} from '@nestjslatam/ddd-lib';
import { EventBus, IEvent, IEventPublisher } from '@nestjs/cqrs';
import { DomainEventSerializer } from './es-core';
import { MongoEventStore } from './es-store/mongo-event-store';

@Injectable()
export class EventStorePublisher
  implements OnApplicationBootstrap, IEventPublisher {
  constructor(
    private readonly eventStore: MongoEventStore,
    private readonly eventBus: EventBus,
    private readonly eventSerializer: DomainEventSerializer,
  ) { }

  onApplicationBootstrap() {
    this.eventBus.publisher = this;
  }

  publish<T extends IEvent>(event: T) {
    const serializableEvent = this.eventSerializer.serialize(event as unknown as DomainEvent);
    return this.eventStore.persist(serializableEvent as any);
  }

  publishAll<T extends IEvent>(events: T[]) {
    const serializableEvents = events
      .map((event) => this.eventSerializer.serialize(event as unknown as DomainEvent))
      .map((serializableEvent, index) => ({
        ...serializableEvent,
        position: (events[index] as unknown as DomainEvent).aggregateVersion,
      }));

    return this.eventStore.persist(serializableEvents as any[]);
  }
}
