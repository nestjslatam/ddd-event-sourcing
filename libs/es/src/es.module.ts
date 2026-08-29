import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DddModule } from '@nestjslatam/ddd-lib';
import { CqrsModule } from '@nestjs/cqrs';

import {
  EVENT_STORE_CONNECTION,
  Event,
  EventSchema,
  EventsBridge,
  MongoEventStore,
  MongoSnapshotStore,
  Snapshot,
  SnapshotSchema,
} from './es-store';
import {
  AbstractEventStore,
  EsOptions,
  DomainEventDeserializer,
  DomainEventSerializer,
  AbstractSnapshotStore,
  UpcasterRegistry,
} from './es-core';
import { EventStorePublisher } from './es-eventstore.publisher';
import { AggregateRehydrator } from './es-aggregate-rehydrator';

@Module({
  imports: [ConfigModule.forRoot(), DddModule],
})
export class EsModule {
  static forRoot(options: EsOptions) {
    const providers: any[] = [];
    const imports: any[] = [DddModule, CqrsModule];

    // Common providers
    const commonProviders = [
      EventStorePublisher,
      DomainEventDeserializer,
      DomainEventSerializer,
      UpcasterRegistry,
      AggregateRehydrator,
    ];

    if (options.driver === 'mongo') {
      imports.push(
        MongooseModule.forRoot(options.mongoUrl, {
          connectionName: EVENT_STORE_CONNECTION,
          directConnection: true,
        }),
        // forRoot opens the connection; forFeature registers the models on
        // it. Without this the connection existed and the models did not, so
        // MongoEventStore, MongoSnapshotStore and EventsBridge -- all three of
        // which take an @InjectModel -- could not be constructed and the whole
        // driver failed to boot.
        MongooseModule.forFeature(
          [
            { name: Event.name, schema: EventSchema },
            { name: Snapshot.name, schema: SnapshotSchema },
          ],
          EVENT_STORE_CONNECTION,
        ),
      );
      providers.push(
        MongoEventStore,
        MongoSnapshotStore,
        EventsBridge, // MongoDB-specific
        {
          provide: AbstractEventStore,
          useExisting: MongoEventStore,
        },
        {
          provide: AbstractSnapshotStore,
          useExisting: MongoSnapshotStore,
        },
      );
    } else if (options.driver === 'custom') {
      providers.push(options.eventStoreClass, {
        provide: AbstractEventStore,
        useClass: options.eventStoreClass,
      });

      if (options.snapshotStoreClass) {
        providers.push(options.snapshotStoreClass, {
          provide: AbstractSnapshotStore,
          useClass: options.snapshotStoreClass,
        });
      }
    }

    const exports: any[] = [
      AbstractEventStore,
      DomainEventDeserializer,
      DomainEventSerializer,
      UpcasterRegistry,
      EventStorePublisher,
      AggregateRehydrator,
      ...providers,
    ];

    if (options.driver === 'mongo') {
      exports.push(AbstractSnapshotStore, EventsBridge);
    } else if (options.driver === 'custom' && options.snapshotStoreClass) {
      exports.push(AbstractSnapshotStore);
    }

    return {
      // Global, like ConfigModule.forRoot({ isGlobal: true }).
      //
      // forRoot is called once at the root, but Nest does not hoist a dynamic
      // module's providers -- a feature module importing the bare `EsModule`
      // class gets the static @Module, which declares no providers and exports
      // nothing. That is why the sample failed with "Nest can't resolve
      // dependencies of the EnhancedAggregateRehydrator ... AbstractEventStore
      // at index [0]", and why anyone wiring a second feature module would
      // have hit the same wall.
      //
      // The alternative -- importing EsModule.forRoot() again in each feature
      // module -- would open a second connection per module, so global is not
      // a shortcut here; it is the correct shape for a root-configured
      // infrastructure module.
      global: true,
      module: EsModule,
      imports,
      providers: [...commonProviders, ...providers],
      exports,
    };
  }
}
