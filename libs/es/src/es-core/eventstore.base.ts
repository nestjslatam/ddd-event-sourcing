import { ISerializable } from '@nestjslatam/ddd-lib';

export abstract class AbstractEventStore {
  abstract persist(
    eventOrEvents: ISerializable | ISerializable[],
  ): Promise<void>;
  abstract getEventsByStreamId(
    streamId: string,
    fromVersion?: number,
  ): Promise<ISerializable[]>;
}
