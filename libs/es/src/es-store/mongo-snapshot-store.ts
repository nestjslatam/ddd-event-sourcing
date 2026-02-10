import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractSnapshotStore, SnapshotEnvelope } from '../es-core';
import { Snapshot } from './schemas';
import { EVENT_STORE_CONNECTION } from './constants';

@Injectable()
export class MongoSnapshotStore implements AbstractSnapshotStore {
    private readonly logger = new Logger(MongoSnapshotStore.name);

    constructor(
        @InjectModel(Snapshot.name, EVENT_STORE_CONNECTION)
        private readonly snapshotModel: Model<Snapshot>,
    ) { }

    async save(snapshot: SnapshotEnvelope): Promise<void> {
        try {
            await this.snapshotModel.create(snapshot);
            this.logger.debug(`Snapshot for ${snapshot.aggregateId} saved.`);
        } catch (error) {
            this.logger.error(`Failed to save snapshot for ${snapshot.aggregateId}`, error);
        }
    }

    async getLast(aggregateId: string): Promise<SnapshotEnvelope | null> {
        const doc = await this.snapshotModel
            .findOne({ aggregateId })
            .sort({ version: -1 })
            .exec();

        if (!doc) return null;

        return {
            aggregateId: doc.aggregateId,
            aggregateType: doc.aggregateType,
            version: doc.version,
            payload: doc.payload,
            timestamp: (doc as any).createdAt,
        };
    }
}
