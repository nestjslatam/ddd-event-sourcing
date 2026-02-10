export interface SnapshotEnvelope {
    aggregateId: string;
    aggregateType: string;
    version: number;
    payload: any;
    timestamp: Date;
}

export abstract class AbstractSnapshotStore {
    abstract save(snapshot: SnapshotEnvelope): Promise<void>;
    abstract getLast(aggregateId: string): Promise<SnapshotEnvelope | null>;
}
