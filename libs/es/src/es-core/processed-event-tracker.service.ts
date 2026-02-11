import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface ProcessedEvent {
    eventId: string;
    processedAt: Date;
    handlerName: string;
}

/**
 * Service for tracking processed events to ensure idempotency
 * Prevents duplicate event processing in event handlers
 */
@Injectable()
export class ProcessedEventTracker {
    private readonly logger = new Logger(ProcessedEventTracker.name);
    private readonly inMemoryCache = new Set<string>();

    constructor(
        @InjectModel('ProcessedEvent')
        private readonly model?: Model<ProcessedEvent>,
    ) { }

    /**
     * Check if an event has already been processed
     * @param eventId The unique event identifier
     * @param handlerName Optional handler name for scoped tracking
     * @returns True if the event has been processed
     */
    async isProcessed(eventId: string, handlerName?: string): Promise<boolean> {
        const key = this.getCacheKey(eventId, handlerName);

        // Check in-memory cache first
        if (this.inMemoryCache.has(key)) {
            return true;
        }

        // Check persistent store if available
        if (this.model) {
            const query: any = { eventId };
            if (handlerName) {
                query.handlerName = handlerName;
            }

            const exists = await this.model.exists(query);
            if (exists) {
                this.inMemoryCache.add(key);
                return true;
            }
        }

        return false;
    }

    /**
     * Mark an event as processed
     * @param eventId The unique event identifier
     * @param handlerName Optional handler name for scoped tracking
     */
    async markProcessed(eventId: string, handlerName?: string): Promise<void> {
        const key = this.getCacheKey(eventId, handlerName);

        // Add to in-memory cache
        this.inMemoryCache.add(key);

        // Persist if model available
        if (this.model) {
            try {
                await this.model.create({
                    eventId,
                    handlerName: handlerName || 'default',
                    processedAt: new Date(),
                });
            } catch (error) {
                // Ignore duplicate key errors (race condition)
                if (error.code !== 11000) {
                    this.logger.error(
                        `Failed to mark event ${eventId} as processed: ${error.message}`,
                    );
                }
            }
        }
    }

    /**
     * Clear processed events older than a certain date
     * Useful for cleanup and preventing unbounded growth
     * @param olderThan Date threshold
     */
    async cleanup(olderThan: Date): Promise<number> {
        if (!this.model) {
            return 0;
        }

        const result = await this.model.deleteMany({
            processedAt: { $lt: olderThan },
        });

        this.logger.log(`Cleaned up ${result.deletedCount} processed event records`);
        return result.deletedCount || 0;
    }

    /**
     * Get cache key for event tracking
     */
    private getCacheKey(eventId: string, handlerName?: string): string {
        return handlerName ? `${handlerName}:${eventId}` : eventId;
    }
}
