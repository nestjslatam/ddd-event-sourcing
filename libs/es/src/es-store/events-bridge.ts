import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChangeStream, ChangeStreamInsertDocument } from 'mongodb';
import { Model } from 'mongoose';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { DomainEventDeserializer, InfrastructureEvent } from '../es-core';

import { EVENT_STORE_CONNECTION } from './constants';
import { EventDocument } from './schemas';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class EventsBridge
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EventsBridge.name);

  private changeStream: ChangeStream | any;

  constructor(
    @InjectModel(Event.name, EVENT_STORE_CONNECTION)
    private readonly eventStore: Model<DomainEvent>,
    private readonly eventBus: EventBus,
    private readonly eventDeserializer: DomainEventDeserializer,
  ) {}

  onApplicationBootstrap() {
    // In the poll-based approach, instead of using a change stream (as we're doing here), we would periodically
    // poll the event store for new events. To keep track of what events we already processed,
    // we would need to store the last processed event (cursor) in a separate collection.
    this.changeStream = this.eventStore
      .watch()
      .on('change', (change: ChangeStreamInsertDocument<EventDocument>) => {
        if (change.operationType === 'insert') {
          this.handleEventStoreChange(change);
        }
      })
      // A change stream is an EventEmitter, and an 'error' with no listener
      // is an unhandled exception that takes the process down. A dropped
      // connection or a failed resume should not kill the application.
      .on('error', (error: Error) => {
        this.logger.error(
          'The event store change stream failed; new events will not reach subscribers until it is re-established.',
          error.stack,
        );
      });
  }

  onApplicationShutdown() {
    return this.changeStream.close();
  }

  handleEventStoreChange(change: ChangeStreamInsertDocument<EventDocument>) {
    // "ChangeStreamInsertDocument" object exposes the "txnNumber" property, which represents
    // the transaction identifier. If you need multi-document transactions in your application,
    // you can use this property to achieve atomicity.
    const insertedEvent = change.fullDocument;

    // One undeserializable document must not take the bridge -- or the
    // process -- down with it. This runs inside a change-stream callback, so
    // anything thrown here surfaces as an unhandled 'error' event rather than
    // as a rejected promise a caller could catch. A document written by an
    // older schema, or one whose event class was renamed, is a reason to skip
    // that document and keep the stream alive, not to stop the application.
    try {
      const eventInstance = this.eventDeserializer.deserialize(
        insertedEvent as unknown as InfrastructureEvent,
      );
      this.eventBus.subject$.next(eventInstance);
    } catch (error) {
      this.logger.error(
        `Skipping an event the deserializer could not build: ` +
          `${(insertedEvent as unknown as InfrastructureEvent)?.eventName ?? 'unknown'} for aggregate ` +
          `${(insertedEvent as unknown as InfrastructureEvent)?.aggregateId ?? 'unknown'}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
