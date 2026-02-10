import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type EventDocument = HydratedDocument<DomainEvent>;

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
})
export class Event {
  @Prop()
  aggregateId: string;

  @Prop()
  eventId: string;

  @Prop()
  eventName: string;

  @Prop()
  occurredOn: Date;

  @Prop()
  position: number;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  attributes: Record<string, any>;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  meta: Record<string, any>;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ aggregateId: 1, position: 1 }, { unique: true });
