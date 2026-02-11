import { DomainEvent } from '@nestjslatam/ddd-lib';

/**
 * Base class for versioned domain events
 * Provides explicit version tracking for safe schema evolution
 */
export abstract class VersionedEvent extends DomainEvent {
  /**
   * The version of this event schema
   * Increment when making breaking changes to the event structure
   */
  abstract readonly schemaVersion: number;

  /**
   * The type identifier for this event
   * Should remain constant across versions (e.g., "AccountOpened")
   */
  abstract readonly eventType: string;

  /**
   * Get the full versioned event name
   * Format: EventType.v{version}
   */
  get versionedEventName(): string {
    return `${this.eventType}.v${this.schemaVersion}`;
  }
}
