import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DddModule } from '@nestjslatam/ddd-lib';

import {
  EVENT_STORE_CONNECTION,
  EventsBridge,
  MongoEventStore,
} from './es-store';
import { AbstractEventStore, EsOptions, DomainEventDeserializer, DomainEventSerializer } from './es-core';
import { EventStorePublisher } from './es-eventstore.publisher';

@Module({
  imports: [ConfigModule.forRoot(), DddModule],
  providers: [
    EventStorePublisher,
    MongoEventStore,
    EventsBridge,
    DomainEventDeserializer,
    DomainEventSerializer,
    {
      provide: AbstractEventStore,
      useExisting: MongoEventStore,
    }
  ],
  exports: [AbstractEventStore],
})
export class EsModule {
  static forRoot(options: EsOptions) {
    const imports = [
      DddModule,
      MongooseModule.forRoot(options.mongoUrl, {
        connectionName: EVENT_STORE_CONNECTION,
        directConnection: true,
      }),
    ];

    return {
      module: EsModule,
      imports,
    };
  }
}
