import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventBus, IEvent } from '@nestjs/cqrs';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EventStorePublisher } from '../es-eventstore.publisher';
import { AbstractEventStore } from '../es-core/eventstore.base';
import { DomainEventSerializer } from '../es-core/domain-event-serializer';

/**
 * Event publisher that batches events for improved throughput
 * 
 * Instead of publishing events immediately, this publisher accumulates
 * events and publishes them in batches, reducing database round-trips
 * and improving overall system throughput.
 * 
 * Features:
 * - Configurable batch size (default: 100)
 * - Configurable timeout (default: 1000ms)
 * - Automatic flush on batch size or timeout
 * - Graceful shutdown handling
 */
@Injectable()
export class BatchedEventStorePublisher extends EventStorePublisher implements OnModuleDestroy {
    private readonly logger = new Logger(BatchedEventStorePublisher.name);
    private batch: IEvent[] = [];
    private batchTimer?: NodeJS.Timeout;
    private isShuttingDown = false;

    constructor(
        eventStore: AbstractEventStore,
        eventBus: EventBus,
        eventSerializer: DomainEventSerializer,
        private readonly batchSize: number = 100,
        private readonly batchTimeoutMs: number = 1000,
    ) {
        super(eventStore, eventBus, eventSerializer);
        this.logger.log(
            `Initialized with batchSize=${batchSize}, timeout=${batchTimeoutMs}ms`,
        );
    }

    /**
     * Add event to batch and flush if needed
     */
    async publish<T extends IEvent>(event: T): Promise<void> {
        if (this.isShuttingDown) {
            this.logger.warn('Publisher is shutting down, publishing immediately');
            return super.publish(event);
        }

        this.batch.push(event);
        this.logger.debug(`Added event to batch (${this.batch.length}/${this.batchSize})`);

        // Flush if batch is full
        if (this.batch.length >= this.batchSize) {
            await this.flush();
        } else if (!this.batchTimer) {
            // Start timer if not already running
            this.batchTimer = setTimeout(() => this.flush(), this.batchTimeoutMs);
        }
    }

    /**
     * Flush all pending events
     */
    async flush(): Promise<void> {
        if (this.batch.length === 0) {
            return;
        }

        const events = [...this.batch];
        this.batch = [];

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }

        this.logger.log(`Flushing batch of ${events.length} events`);

        try {
            // Publish all events in parallel
            await Promise.all(events.map(event => super.publish(event)));
        } catch (error) {
            this.logger.error(`Error flushing batch: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get current batch statistics
     */
    getBatchStats(): BatchStats {
        return {
            currentBatchSize: this.batch.length,
            maxBatchSize: this.batchSize,
            timeoutMs: this.batchTimeoutMs,
            timerActive: !!this.batchTimer,
        };
    }

    /**
     * Graceful shutdown - flush remaining events
     */
    async onModuleDestroy(): Promise<void> {
        this.isShuttingDown = true;
        this.logger.log('Shutting down, flushing remaining events...');
        await this.flush();
    }
}

export interface BatchStats {
    currentBatchSize: number;
    maxBatchSize: number;
    timeoutMs: number;
    timerActive: boolean;
}
