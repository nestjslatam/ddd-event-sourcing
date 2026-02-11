import { Injectable, Logger } from '@nestjs/common';
import { InfrastructureEvent } from './infrastructure-event';

export interface IEventUpcaster {
    /**
     * Upcast an event from one version to the next
     * @param event The event to upcast
     * @returns The upcasted event
     */
    upcast(event: InfrastructureEvent): InfrastructureEvent;
}

/**
 * Enhanced registry for managing event upcasters with version tracking
 * Supports automatic upcasting from any version to the latest
 */
@Injectable()
export class EnhancedUpcasterRegistry {
    private readonly logger = new Logger(EnhancedUpcasterRegistry.name);

    // Map: eventType -> Map: fromVersion -> upcaster
    private readonly upcasters = new Map<string, Map<number, IEventUpcaster>>();

    // Map: eventType -> latestVersion
    private readonly latestVersions = new Map<string, number>();

    /**
     * Register an upcaster for a specific event type and version
     * @param eventType The event type (e.g., "AccountOpened")
     * @param fromVersion The version to upcast from
     * @param toVersion The version to upcast to
     * @param upcaster The upcaster implementation
     */
    register(
        eventType: string,
        fromVersion: number,
        toVersion: number,
        upcaster: IEventUpcaster,
    ): void {
        if (!this.upcasters.has(eventType)) {
            this.upcasters.set(eventType, new Map());
        }

        this.upcasters.get(eventType)!.set(fromVersion, upcaster);

        // Track latest version
        const currentLatest = this.latestVersions.get(eventType) || 0;
        if (toVersion > currentLatest) {
            this.latestVersions.set(eventType, toVersion);
        }

        this.logger.log(
            `Registered upcaster for ${eventType}: v${fromVersion} -> v${toVersion}`,
        );
    }

    /**
     * Upcast an event to a specific version
     * @param event The event to upcast
     * @param targetVersion The target version (defaults to latest)
     * @returns The upcasted event
     */
    upcast(
        event: InfrastructureEvent,
        targetVersion?: number,
    ): InfrastructureEvent {
        const eventType = this.extractEventType(event.eventName);
        const currentVersion = event.eventVersion || 1;
        const target = targetVersion || this.latestVersions.get(eventType) || currentVersion;

        if (currentVersion >= target) {
            return event; // Already at or above target version
        }

        const eventUpcasters = this.upcasters.get(eventType);
        if (!eventUpcasters) {
            this.logger.warn(
                `No upcasters registered for event type: ${eventType}`,
            );
            return event;
        }

        let currentEvent = event;
        let version = currentVersion;

        // Apply upcasters sequentially
        while (version < target) {
            const upcaster = eventUpcasters.get(version);
            if (!upcaster) {
                this.logger.warn(
                    `Missing upcaster for ${eventType} v${version} -> v${version + 1}`,
                );
                break;
            }

            currentEvent = upcaster.upcast(currentEvent);
            currentEvent.eventVersion = version + 1;
            version++;

            this.logger.debug(
                `Upcasted ${eventType} from v${version - 1} to v${version}`,
            );
        }

        return currentEvent;
    }

    /**
     * Get the latest version for an event type
     * @param eventType The event type
     * @returns The latest version number
     */
    getLatestVersion(eventType: string): number {
        return this.latestVersions.get(eventType) || 1;
    }

    /**
     * Check if an upcaster exists for a specific version transition
     * @param eventType The event type
     * @param fromVersion The source version
     * @returns True if an upcaster exists
     */
    hasUpcaster(eventType: string, fromVersion: number): boolean {
        return this.upcasters.get(eventType)?.has(fromVersion) || false;
    }

    /**
     * Extract event type from event name (handles versioned names)
     * @param eventName The full event name (e.g., "AccountOpened" or "AccountOpened.v2")
     * @returns The base event type
     */
    private extractEventType(eventName: string): string {
        return eventName.split('.')[0];
    }
}
