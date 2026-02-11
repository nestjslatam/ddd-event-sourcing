import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DddModule } from '@nestjslatam/ddd-lib';
import { CqrsModule } from '@nestjs/cqrs';

import {
  EVENT_STORE_CONNECTION,
  EventsBridge,
  MongoEventStore,
  MongoSnapshotStore,
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
      module: EsModule,
      imports,
      providers: [...commonProviders, ...providers],
      exports,
    };
  }
}
