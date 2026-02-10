export interface InfrastructureEvent {
    aggregateId: string;
    eventId: string;
    aggregateVersion: number;
    eventName: string;
    occurredOn: Date;
    attributes: any;
    meta?: any;
}
