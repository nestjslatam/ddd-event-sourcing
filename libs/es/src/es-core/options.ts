import { Type } from '@nestjs/common';
import { AbstractEventStore } from './eventstore.base';
import { AbstractSnapshotStore } from './snapshot-store.base';

export interface EsMongoOptions {
  driver: 'mongo';
  mongoUrl: string;
}

export interface EsCustomOptions {
  driver: 'custom';
  eventStoreClass: Type<AbstractEventStore>;
  snapshotStoreClass?: Type<AbstractSnapshotStore>;
}

export type EsOptions = EsMongoOptions | EsCustomOptions;

