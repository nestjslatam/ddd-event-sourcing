import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type SnapshotDocument = HydratedDocument<Snapshot>;

@Schema({
    timestamps: true,
    collection: 'snapshots',
})
export class Snapshot {
    @Prop({ required: true, index: true })
    aggregateId: string;

    @Prop({ required: true })
    aggregateType: string;

    @Prop({ required: true })
    version: number;

    @Prop({ type: SchemaTypes.Mixed, required: true })
    payload: any;
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot);
SnapshotSchema.index({ aggregateId: 1, version: -1 });
