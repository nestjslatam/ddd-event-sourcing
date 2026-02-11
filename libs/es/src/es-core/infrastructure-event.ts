export interface InfrastructureEvent {
    aggregateId: string;
    aggregateVersion: number;
    eventId: string;
    occurredOn: Date;
    eventName: string;
    eventVersion?: number; // Added for event versioning support
    attributes: Record<string, any>;
    meta: Record<string, any>;
}
