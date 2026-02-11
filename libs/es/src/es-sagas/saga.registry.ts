import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AbstractSaga } from './saga.base';

/**
 * Registry for managing saga instances
 * Automatically discovers and registers sagas in the application
 */
@Injectable()
export class SagaRegistry {
    private readonly logger = new Logger(SagaRegistry.name);
    private readonly sagas = new Map<string, AbstractSaga>();

    constructor(private readonly moduleRef: ModuleRef) { }

    /**
     * Register a saga instance
     */
    register(name: string, saga: AbstractSaga): void {
        this.sagas.set(name, saga);
        this.logger.log(`Registered saga: ${name}`);
    }

    /**
     * Get a registered saga by name
     */
    get(name: string): AbstractSaga | undefined {
        return this.sagas.get(name);
    }

    /**
     * Get all registered sagas
     */
    getAll(): AbstractSaga[] {
        return Array.from(this.sagas.values());
    }

    /**
     * Check if a saga is registered
     */
    has(name: string): boolean {
        return this.sagas.has(name);
    }

    /**
     * Get saga count
     */
    count(): number {
        return this.sagas.size;
    }
}
