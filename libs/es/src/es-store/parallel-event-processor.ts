import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { DomainEvent } from '@nestjslatam/ddd-lib';

/**
 * Process events in parallel with configurable concurrency
 * 
 * This processor allows you to control how many events are processed
 * simultaneously, preventing overwhelming the system while still
 * achieving better throughput than sequential processing.
 * 
 * @example
 * ```typescript
 * const processor = new ParallelEventProcessor(eventBus, 10);
 * await processor.processEvents(events);
 * ```
 */
@Injectable()
export class ParallelEventProcessor {
    private readonly logger = new Logger(ParallelEventProcessor.name);

    constructor(
        private readonly eventBus: EventBus,
        private readonly concurrency: number = 10,
    ) {
        this.logger.log(`Initialized with concurrency=${concurrency}`);
    }

    /**
     * Process events in parallel with controlled concurrency
     */
    async processEvents(events: DomainEvent[]): Promise<void> {
        if (events.length === 0) {
            return;
        }

        this.logger.log(
            `Processing ${events.length} events with concurrency ${this.concurrency}`,
        );

        const chunks = this.chunk(events, this.concurrency);
        let processed = 0;

        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(async (event) => {
                    try {
                        await this.eventBus.publish(event);
                        processed++;
                    } catch (error) {
                        this.logger.error(
                            `Error processing event ${event.constructor.name}: ${error.message}`,
                            error.stack,
                        );
                        throw error;
                    }
                }),
            );

            this.logger.debug(`Processed ${processed}/${events.length} events`);
        }

        this.logger.log(`Successfully processed all ${events.length} events`);
    }

    /**
     * Split array into chunks of specified size
     */
    private chunk<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Get processor configuration
     */
    getConfig(): ProcessorConfig {
        return {
            concurrency: this.concurrency,
        };
    }
}

export interface ProcessorConfig {
    concurrency: number;
}
