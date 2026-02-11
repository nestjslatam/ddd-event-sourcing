import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { MaterializedViewManager } from './materialized-view.manager';

/**
 * Strategy for invalidating materialized views when events occur
 */
export interface ViewInvalidationStrategy {
  /**
   * Determine which views should be invalidated for a given event
   */
  getViewsToInvalidate(event: DomainEvent): string[];
}

/**
 * Invalidate views based on aggregate ID
 */
export class AggregateIdInvalidationStrategy
  implements ViewInvalidationStrategy
{
  constructor(private readonly viewPrefix: string) {}

  getViewsToInvalidate(event: DomainEvent): string[] {
    return [`${this.viewPrefix}-${event.aggregateId}`];
  }
}

/**
 * Invalidate views based on event type
 */
export class EventTypeInvalidationStrategy implements ViewInvalidationStrategy {
  constructor(private readonly eventViewMap: Map<string, string[]>) {}

  getViewsToInvalidate(event: DomainEvent): string[] {
    const eventType = event.constructor.name;
    return this.eventViewMap.get(eventType) || [];
  }
}

/**
 * Invalidate all views (use sparingly!)
 */
export class InvalidateAllStrategy implements ViewInvalidationStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getViewsToInvalidate(_event: DomainEvent): string[] {
    return ['*'];
  }
}

/**
 * Service that automatically invalidates views when events occur
 */
@Injectable()
export class AutoViewInvalidator {
  constructor(
    private readonly viewManager: MaterializedViewManager,
    private readonly strategies: ViewInvalidationStrategy[] = [],
  ) {}

  /**
   * Register an invalidation strategy
   */
  addStrategy(strategy: ViewInvalidationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Handle an event and invalidate affected views
   */
  async handleEvent(event: DomainEvent): Promise<void> {
    const viewsToInvalidate = new Set<string>();

    for (const strategy of this.strategies) {
      const views = strategy.getViewsToInvalidate(event);
      views.forEach((v) => viewsToInvalidate.add(v));
    }

    for (const viewName of viewsToInvalidate) {
      if (viewName === '*') {
        this.viewManager.invalidateAll();
      } else {
        this.viewManager.invalidate(viewName);
      }
    }
  }
}
