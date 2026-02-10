import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChangeStream, ChangeStreamInsertDocument } from 'mongodb';
import { Model } from 'mongoose';
import {
  DomainEvent,
} from '@nestjslatam/ddd-lib';
import { DomainEventDeserializer, InfrastructureEvent } from '../es-core';

import { EVENT_STORE_CONNECTION } from './constants';
import { EventDocument } from './schemas';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class EventsBridge
  implements OnApplicationBootstrap, OnApplicationShutdown {
  private changeStream: ChangeStream | any;

  constructor(
    @InjectModel(Event.name, EVENT_STORE_CONNECTION)
    private readonly eventStore: Model<DomainEvent>,
    private readonly eventBus: EventBus,
    private readonly eventDeserializer: DomainEventDeserializer,
  ) { }

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
      });
  }

  onApplicationShutdown() {
    return this.changeStream.close();
  }

  handleEventStoreChange(change: ChangeStreamInsertDocument<EventDocument>) {
    // "ChangeStreamInsertDocument" object exposes the "txnNumber" property, which represents
    // the transaction identifier. If you need multi-document transactions in your application,
    // you can use this property to achieve atomicity.
    const insertedEvent = change.fullDocument; 0
    const eventInstance = this.eventDeserializer.deserialize(insertedEvent as unknown as InfrastructureEvent);
    this.eventBus.subject$.next(eventInstance);
  }
}
