import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { InfrastructureEvent } from './infrastructure-event';

@Injectable()
export class DomainEventSerializer {
  serialize(event: DomainEvent): InfrastructureEvent {
    // Extract metadata if exists (not strictly typed in IDomainEvent usually, but good to handle)
    const { ...attributes } = event;
    // metadata is often not part of the event payload itself directly but attached or separate.
    // However, if the event object has properties that are the payload, we treat them as such.
    // We should probably exclude 'occurredOn', 'eventId' from attributes if they are properties of the event class
    // but usually they are.

    // Let's refine attributes extraction.
    // IDomainEvent usually has occurredOn and eventId.
    // IDomainEvent usually has occurredOn and eventId.
    const { occurredOn, eventId, ...payload } = attributes as any;

    return {
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      eventId: eventId,
      occurredOn: occurredOn || new Date(), // Fallback if not present
      eventName: event.constructor.name,
      attributes: payload,
      meta: {}, // customizable if needed
    };
  }
}
