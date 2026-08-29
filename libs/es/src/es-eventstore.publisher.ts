import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { EventBus, IEvent, IEventPublisher } from '@nestjs/cqrs';
import { DomainEventSerializer } from './es-core';
import { AbstractEventStore } from './es-core/eventstore.base';

/**
 * Persists every published event, then lets it continue to the subscribers.
 *
 * The second half is the part this class was missing. Installing itself as
 * `eventBus.publisher` REPLACES the publisher CQRS uses to feed
 * `@EventsHandler` subscribers -- it does not wrap it. So while events were
 * being stored correctly, nothing downstream ever ran: no projector, no read
 * model, no materialised view. `commit()` returned cleanly and every handler
 * was silently skipped, which made any endpoint reading a projection answer
 * 404 forever.
 *
 * The publisher it displaces is captured first and invoked after the write.
 * That order is deliberate: if persistence fails the event did not durably
 * happen, and dispatching it anyway would let a projection describe a state
 * the event store never recorded.
 */
@Injectable()
export class EventStorePublisher
  implements OnApplicationBootstrap, IEventPublisher
{
  protected readonly logger = new Logger(EventStorePublisher.name);

  /**
   * The publisher this one displaced -- CQRS's own, which pushes into the
   * subject `@EventsHandler` subscribes to.
   */
  private downstream?: IEventPublisher;

  /** Writes started but not yet settled, so `flush()` can wait for them. */
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly eventStore: AbstractEventStore,
    private readonly eventBus: EventBus,
    private readonly eventSerializer: DomainEventSerializer,
  ) {}

  onApplicationBootstrap() {
    // Read before write: after the assignment `eventBus.publisher` is this
    // object, and the original is unreachable.
    this.downstream = this.eventBus.publisher;
    this.eventBus.publisher = this;
  }

  publish<T extends IEvent>(event: T): Promise<void> {
    return this.track(this.write([event]));
  }

  publishAll<T extends IEvent>(events: T[]): Promise<void> {
    return this.track(this.write(events));
  }

  /**
   * Resolves once every write started so far has settled.
   *
   * `AggregateRoot.commit()` is synchronous and does not await the publisher,
   * so a command handler returns while its events are still being written --
   * and the next command, reading the aggregate back, could find nothing.
   * That failed about one request in five. Awaiting this after `commit()`
   * closes the window.
   */
  async flush(): Promise<void> {
    while (this.inFlight.size) {
      await Promise.allSettled([...this.inFlight]);
    }
  }

  private track(work: Promise<void>): Promise<void> {
    const tracked = work.finally(() => this.inFlight.delete(tracked));
    this.inFlight.add(tracked);
    return tracked;
  }

  private async write<T extends IEvent>(events: T[]): Promise<void> {
    const serializable = events
      .map((event) =>
        this.eventSerializer.serialize(event as unknown as DomainEvent),
      )
      .map((doc, index) => ({
        ...doc,
        position: (events[index] as unknown as DomainEvent).aggregateVersion,
      }));

    await this.eventStore.persist(
      (serializable.length === 1 ? serializable[0] : serializable) as never,
    );

    for (const event of events) {
      this.dispatch(event);
    }
  }

  /**
   * Hands the event on to the subscribers.
   *
   * A subscriber that throws must not fail the write that produced the event:
   * it is already durably stored, and a projector's bug is not the command's
   * problem. Failures are logged rather than propagated, which is the same
   * contract CQRS's own publisher offers.
   */
  private dispatch<T extends IEvent>(event: T): void {
    if (!this.downstream) {
      // onApplicationBootstrap has not run -- a unit test constructing this
      // class directly, or a module that never booted. Persisting without
      // dispatching is the old behaviour, so say so rather than failing.
      this.logger.debug(
        'No downstream publisher captured; the event was stored but not dispatched.',
      );
      return;
    }

    try {
      this.downstream.publish(event);
    } catch (error) {
      this.logger.error(
        `A subscriber threw while handling ${event?.constructor?.name}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
