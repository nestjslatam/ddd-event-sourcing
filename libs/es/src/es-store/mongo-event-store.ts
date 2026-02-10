import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { EVENT_STORE_CONNECTION } from './constants';

import { AbstractEventStore, DomainEventDeserializer } from '../es-core';
import { ISerializable } from '@nestjslatam/ddd-lib';
m '@nestjslatam/ddd-lib';

@Injectable()
export class MongoEventStore implements AbstractEventStore {
  private readonly logger = new Logger(MongoEventStore.name);

  constructor(
    @InjectModel(Event.name, EVENT_STORE_CONNECTION)
    private readonly eventStore: Model<Event>,
    private readonly eventDeserializer: DomainEventDeserializer,
  ) { }

  async persist(
    eventOrEvents: ISerializable | ISerializable[],
  ): Promise<void> {
    const events = Array.isArray(eventOrEvents)
      ? eventOrEvents
      : [eventOrEvents];

    const session = await this.eventStore.startSession();
    try {
      session.startTransaction();
      await this.eventStore.insertMany(events, { session, ordered: true });

      await session.commitTransaction();
      this.logger.debug(`Events inserted successfully to the event store`);
    } catch (error) {
      await session.abortTransaction();

      const UNIQUE_CONSTRAINT_ERROR_CODE = 11000;
      if (error?.code === UNIQUE_CONSTRAINT_ERROR_CODE) {
        this.logger.error(`Events could not be persisted. Aggregate is stale.`);
        console.error(error.writeErrors?.[0]?.err?.errmsg);
      } else {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  async getEventsByStreamId(streamId: string): Promise<ISerializable[]> {
    const events = await this.eventStore
      .find({ streamId })
      .sort({ position: 1 });

    if (events.length === 0) {
      throw new Error(`Aggregate with id ${streamId} does not exist`);
    }

    return events.map((event) =>
      this.eventDeserializer.deserialize(event.toJSON()),
    );
  }
}
