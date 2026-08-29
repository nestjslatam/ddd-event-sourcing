import { EventBus, IEvent, IEventPublisher } from '@nestjs/cqrs';

import { EventStorePublisher } from './es-eventstore.publisher';
import { AbstractEventStore } from './es-core/eventstore.base';
import { DomainEventSerializer } from './es-core';

/**
 * The defect these tests exist for:
 *
 * `onApplicationBootstrap` assigns `eventBus.publisher = this`, which
 * REPLACES the publisher CQRS uses to feed `@EventsHandler` subscribers -- it
 * does not wrap it. Events were stored correctly and nothing downstream ever
 * ran. No projector, no read model, no materialised view. `commit()` returned
 * cleanly and every handler was silently skipped, so any endpoint reading a
 * projection answered 404 forever.
 *
 * Nothing failed loudly, which is why 183 passing tests never noticed.
 */
describe('EventStorePublisher', () => {
  class OrderPlaced implements IEvent {
    constructor(
      readonly aggregateId = 'order-1',
      readonly aggregateVersion = 1,
    ) {}
  }

  let persisted: unknown[];
  let dispatched: IEvent[];
  let downstream: IEventPublisher;
  let eventBus: EventBus;
  let store: AbstractEventStore;
  let serializer: DomainEventSerializer;

  const build = () => new EventStorePublisher(store, eventBus, serializer);

  beforeEach(() => {
    persisted = [];
    dispatched = [];

    downstream = {
      publish: (event: IEvent) => {
        dispatched.push(event);
      },
    } as IEventPublisher;

    // A stand-in for the real EventBus: only the publisher accessor matters
    // here, and it is the accessor the defect turned on.
    eventBus = { publisher: downstream } as unknown as EventBus;

    store = {
      persist: (payload: unknown) => {
        persisted.push(payload);
        return Promise.resolve();
      },
    } as unknown as AbstractEventStore;

    serializer = {
      serialize: (event: unknown) => ({ payload: event }),
    } as unknown as DomainEventSerializer;
  });

  it('captures the publisher it displaces before replacing it', () => {
    const publisher = build();
    publisher.onApplicationBootstrap();

    // The read has to happen before the write. After the assignment the
    // original is unreachable, and that is precisely how it was lost.
    expect(eventBus.publisher).toBe(publisher);
  });

  it('stores the event AND passes it on', async () => {
    const publisher = build();
    publisher.onApplicationBootstrap();

    const event = new OrderPlaced();
    await publisher.publish(event);

    expect(persisted).toHaveLength(1);
    expect(dispatched).toEqual([event]);
  });

  it('stores before dispatching, so a failed write reaches no subscriber', async () => {
    // If persistence fails the event did not durably happen. Dispatching it
    // anyway would let a projection describe a state the store never recorded.
    store = {
      persist: () => Promise.reject(new Error('disk is full')),
    } as unknown as AbstractEventStore;

    const publisher = build();
    publisher.onApplicationBootstrap();

    await expect(publisher.publish(new OrderPlaced())).rejects.toThrow(
      'disk is full',
    );
    expect(dispatched).toHaveLength(0);
  });

  it('passes on every event of a batch', async () => {
    const publisher = build();
    publisher.onApplicationBootstrap();

    const events = [new OrderPlaced('a', 1), new OrderPlaced('b', 2)];
    await publisher.publishAll(events);

    expect(persisted).toHaveLength(1);
    expect(dispatched).toEqual(events);
  });

  it('does not let a throwing subscriber fail the write', async () => {
    // The event is already stored. A projector's bug is not the command's
    // problem, and propagating it would roll back nothing while failing a
    // request that actually succeeded.
    downstream = {
      publish: () => {
        throw new Error('projector exploded');
      },
    } as IEventPublisher;
    eventBus = { publisher: downstream } as unknown as EventBus;

    const publisher = build();
    publisher.onApplicationBootstrap();

    await expect(publisher.publish(new OrderPlaced())).resolves.toBeUndefined();
    expect(persisted).toHaveLength(1);
  });

  it('still stores when it was never bootstrapped', async () => {
    // A unit test constructing the class directly, or a module that never
    // booted. Persisting without dispatching is the old behaviour; it should
    // not crash.
    const publisher = build();

    await publisher.publish(new OrderPlaced());

    expect(persisted).toHaveLength(1);
    expect(dispatched).toHaveLength(0);
  });
});
