import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { EVENT_STORE_CONNECTION } from './constants';

import {
  AbstractEventStore,
  DomainEventDeserializer,
  UpcasterRegistry,
  InfrastructureEvent,
} from '../es-core';
import { ISerializable } from '@nestjslatam/ddd-lib';

@Injectable()
export class MongoEventStore implements AbstractEventStore {
  private readonly logger = new Logger(MongoEventStore.name);

  constructor(
    @InjectModel(Event.name, EVENT_STORE_CONNECTION)
    private readonly eventStore: Model<Event>,
    private readonly eventDeserializer: DomainEventDeserializer,
    private readonly upcasterRegistry: UpcasterRegistry,
  ) {}

  /** Resolves once the collection exists; retained so this costs one round trip. */
  private collectionReady?: Promise<void>;

  private ensureCollection(): Promise<void> {
    this.collectionReady ??= this.eventStore
      .createCollection()
      .then(() => undefined)
      // Already created -- by a previous run, or by another instance racing
      // this one. Either way the postcondition holds.
      .catch(() => undefined);

    return this.collectionReady;
  }

  async persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void> {
    const events = Array.isArray(eventOrEvents)
      ? eventOrEvents
      : [eventOrEvents];

    // MongoDB will not create a collection inside a multi-document
    // transaction, so the very first write to a fresh database failed with
    // "Collection namespace 'x.events' is already in use" -- an empty
    // database being exactly what every new deployment starts with. Creating
    // it up front, once, is the documented way around it.
    await this.ensureCollection();

    const session = await this.eventStore.startSession();
    try {
      session.startTransaction();
      await this.eventStore.insertMany(events, { session, ordered: true });

      await session.commitTransaction();
      this.logger.debug(`Events inserted successfully to the event store`);
    } catch (error) {
      // Abort only while a transaction is actually open. This used to abort
      // unconditionally, so anything that threw AFTER a successful commit
      // produced `Cannot call abortTransaction after calling
      // commitTransaction` -- and that replaced the real error, which was
      // never seen. The handler meant to report failures was destroying the
      // only evidence of them.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const UNIQUE_CONSTRAINT_ERROR_CODE = 11000;
      if (error?.code === UNIQUE_CONSTRAINT_ERROR_CODE) {
        // A concurrent write already claimed this position: the aggregate the
        // caller holds is behind. Swallowing it is deliberate -- optimistic
        // concurrency treats the loser as a no-op -- but it is logged with the
        // driver's own message rather than printed to the console.
        this.logger.warn(
          `Events could not be persisted; the aggregate is stale. ` +
            `${error.writeErrors?.[0]?.err?.errmsg ?? error.message}`,
        );
      } else {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  async getEventsByStreamId(
    streamId: string,
    fromVersion?: number,
  ): Promise<ISerializable[]> {
    // The parameter is called streamId; the field it corresponds to is
    // aggregateId, which is what the schema declares and what persist()
    // writes. Querying `{ streamId }` matched nothing, so every read threw
    // "Aggregate does not exist" no matter how many events were stored.
    const query: any = { aggregateId: streamId };
    if (fromVersion) {
      query.position = { $gt: fromVersion };
    }
    const events = await this.eventStore.find(query).sort({ position: 1 });

    if (events.length === 0) {
      throw new Error(`Aggregate with id ${streamId} does not exist`);
    }

    return events.map((event) => {
      let infraEvent = event.toJSON() as unknown as InfrastructureEvent;

      const upcasters = this.upcasterRegistry.getUpcastersFor(
        infraEvent.eventName,
      );
      for (const upcaster of upcasters) {
        infraEvent = upcaster.upcast(infraEvent);
      }

      return this.eventDeserializer.deserialize(infraEvent);
    });
  }
}
