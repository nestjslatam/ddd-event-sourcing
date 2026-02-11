import { Injectable, Logger } from '@nestjs/common';

/**
 * Manager for caching materialized views
 * 
 * Materialized views are pre-computed query results stored in memory
 * for fast read access. This manager handles caching, invalidation,
 * and automatic refresh of views.
 * 
 * @example
 * ```typescript
 * const summary = await viewManager.getOrCreate(
 *   'account-summary-123',
 *   () => this.computeAccountSummary('123')
 * );
 * ```
 */
@Injectable()
export class MaterializedViewManager {
    private readonly logger = new Logger(MaterializedViewManager.name);
    private readonly views = new Map<string, CachedView>();

    /**
     * Get a view from cache or create it using the factory
     */
    async getOrCreate<T>(
        viewName: string,
        factory: () => Promise<T>,
        ttlMs?: number,
    ): Promise<T> {
        const cached = this.views.get(viewName);

        // Check if cached and not expired
        if (cached && !this.isExpired(cached)) {
            this.logger.debug(`Cache hit for view: ${viewName}`);
            return cached.data as T;
        }

        // Create new view
        this.logger.debug(`Cache miss for view: ${viewName}, creating...`);
        const data = await factory();

        this.views.set(viewName, {
            data,
            createdAt: Date.now(),
            ttlMs,
        });

        return data;
    }

    /**
     * Invalidate a specific view
     */
    invalidate(viewName: string): void {
        if (this.views.has(viewName)) {
            this.views.delete(viewName);
            this.logger.log(`Invalidated view: ${viewName}`);
        }
    }

    /**
     * Invalidate all views matching a pattern
     */
    invalidatePattern(pattern: RegExp): void {
        let count = 0;
        for (const viewName of this.views.keys()) {
            if (pattern.test(viewName)) {
                this.views.delete(viewName);
                count++;
            }
        }
        this.logger.log(`Invalidated ${count} views matching pattern: ${pattern}`);
    }

    /**
     * Invalidate all views
     */
    invalidateAll(): void {
        const count = this.views.size;
        this.views.clear();
        this.logger.log(`Invalidated all ${count} views`);
    }

    /**
     * Get cache statistics
     */
    getStats(): ViewCacheStats {
        return {
            totalViews: this.views.size,
            expiredViews: Array.from(this.views.values()).filter(v => this.isExpired(v)).length,
        };
    }

    /**
     * Clean up expired views
     */
    cleanup(): number {
        let removed = 0;
        for (const [key, view] of this.views.entries()) {
            if (this.isExpired(view)) {
                this.views.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            this.logger.log(`Cleaned up ${removed} expired views`);
        }
        return removed;
    }

    private isExpired(view: CachedView): boolean {
        if (!view.ttlMs) return false;
        return Date.now() - view.createdAt > view.ttlMs;
    }
}

interface CachedView {
    data: any;
    createdAt: number;
    ttlMs?: number;
}

export interface ViewCacheStats {
    totalViews: number;
    expiredViews: number;
}
