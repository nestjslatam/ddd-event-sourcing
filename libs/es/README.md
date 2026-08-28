# @nestjslatam/ddd-es-lib

Event sourcing for `@nestjslatam/ddd-lib` on NestJS: an event store abstraction, aggregate rehydration, snapshots and upcasting, wired into `@nestjs/cqrs`.

[![npm](https://img.shields.io/npm/v/%40nestjslatam%2Fddd-es-lib.svg)](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib) [![CI](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml/badge.svg)](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml)

> [!WARNING]
> **Not recommended for production.** `1.1.0` has an unstable public API, only the `custom` driver boots, and committed events do not reach `@EventsHandler` projectors. Read [Known limitations](#known-limitations) before adopting it, and pin an exact version.
>
> **The licence is contradictory.** `libs/es/package.json` declares `Apache-2.0`; the `LICENSE` file shipped inside the tarball, and the repository root `LICENSE`, are both MIT; the root `package.json` declares `"Apache"`, which is not a valid SPDX identifier. Three declarations disagree. Ask a maintainer before relying on any of them.

```bash
npm install @nestjslatam/ddd-es-lib
```

## Define an aggregate and replay it

Every line below was executed against `1.1.0` in this repository's Jest setup.

```typescript
import {
  DddAggregateRoot,
  DomainEvent,
  EventMetadataBuilder,
  IdValueObject,
} from '@nestjslatam/ddd-lib';
import { AggregateRehydrator, EsAutowiredEvent } from '@nestjslatam/ddd-es-lib';

@EsAutowiredEvent
export class MoneyDeposited extends DomainEvent {
  constructor(
    accountId: string,
    public readonly amount: number,
  ) {
    super(EventMetadataBuilder.create(accountId, 'BankAccount', 1).build());
  }
}

export class BankAccount extends DddAggregateRoot<
  BankAccount,
  { balance: number }
> {
  // With no snapshot, AggregateRehydrator calls `new BankAccount(aggregateId)`
  // with the bare id string. The constructor has to accept that and rebuild
  // the id itself, or the replayed aggregate gets a fresh random id and its
  // events are written to a different stream.
  constructor(propsOrId: { balance: number } | string) {
    if (typeof propsOrId === 'string') {
      super({ balance: 0 }, { id: IdValueObject.load(propsOrId) });
    } else {
      super(propsOrId);
    }
  }

  deposit(amount: number): void {
    this.apply(new MoneyDeposited(this.id.toString(), amount));
  }

  // Called by @nestjs/cqrs on apply() and on replay: `on` + the event class name.
  private onMoneyDeposited(event: MoneyDeposited): void {
    this.props.balance += event.amount;
  }
}

// In a command handler. Note the argument order: id first, then the class.
// `accountId` must be a UUID v4 — IdValueObject.load rejects anything else.
const account = await rehydrator.rehydrate(accountId, BankAccount);
account.deposit(100);
account.commit(); // serialised and handed to your store's persist().
// Synchronous: AggregateRoot.commit() returns void,
// so awaiting it does not wait for your store.
```

Rehydrating that stream again yields `props.balance === 100`; a further `deposit(50)` and `commit()` replays to `150`.

## Registering the store

The library ships no working store you can use. You write one; `EsModule` wires it in.

```typescript
import { Injectable, Module } from '@nestjs/common';
import { ISerializable } from '@nestjslatam/ddd-lib';
import {
  AbstractEventStore,
  DomainEventDeserializer,
  EsModule,
  InfrastructureEvent,
  UpcasterRegistry,
} from '@nestjslatam/ddd-es-lib';

@Injectable()
export class InMemoryEventStore extends AbstractEventStore {
  private readonly events: InfrastructureEvent[] = [];

  constructor(
    private readonly deserializer: DomainEventDeserializer,
    private readonly upcasters: UpcasterRegistry,
  ) {
    super();
  }

  async persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void> {
    const batch = Array.isArray(eventOrEvents)
      ? eventOrEvents
      : [eventOrEvents];
    this.events.push(...(batch as unknown as InfrastructureEvent[]));
  }

  async getEventsByStreamId(streamId: string): Promise<ISerializable[]> {
    return this.events
      .filter((e) => e.aggregateId === streamId)
      .map((e) =>
        this.upcasters
          .getUpcastersFor(e.eventName)
          .reduce((event, upcaster) => upcaster.upcast(event), e),
      )
      .map((e) => this.deserializer.deserialize(e));
  }
}

@Module({
  imports: [
    EsModule.forRoot({
      driver: 'custom',
      eventStoreClass: InMemoryEventStore,
      // snapshotStoreClass is optional; without it, rehydration always replays
      // the whole stream.
    }),
  ],
})
export class AppModule {}
```

`AbstractEventStore` is an abstract class, not an interface — `extends` it and call `super()`.

Records reach `persist()` as `InfrastructureEvent` objects: `aggregateId`, `aggregateVersion`, `eventId`, `occurredOn`, `eventName`, `attributes` and an empty `meta`. `EventStorePublisher.publishAll` -- the path `commit()` takes -- also adds a `position` from each event's `aggregateVersion`; `publish`, the single-event path, does not. `getEventsByStreamId` must give the records back to the deserialiser.

Serialisation is by convention. `DomainEventSerializer` **promotes** `eventId` and `occurredOn` to top-level fields and **drops** `eventType`, `eventVersion` and `metadata`, storing every remaining own property of the event as `attributes`. `@EsAutowiredEvent` registers the class so `DomainEventDeserializer` can find it again; forget it on one event and replay throws `Event class not found for eventName: "…"`.

Upcasting is applied by the store, not the deserialiser — the `reduce` above is what makes `UpcasterRegistry.register(upcaster)` take effect. A store that omits it gets no upcasting at all.

## The ecosystem

| Package                                                                                        | What it is                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`@nestjslatam/ddd-lib`](https://www.npmjs.com/package/@nestjslatam/ddd-lib)                   | DDD building blocks: aggregates, value objects, validators, broken rules, state tracking                                    |
| [`@nestjslatam/ddd-cli`](https://www.npmjs.com/package/@nestjslatam/ddd-cli)                   | Inventory the stereotypes, scaffold them, subclass them, audit your code. Runs as an MCP server so an AI agent can drive it |
| [`@nestjslatam/ddd-valueobjects`](https://www.npmjs.com/package/@nestjslatam/ddd-valueobjects) | Ready-made value objects: email, phone number, money, date range, document id                                               |
| **[`@nestjslatam/ddd-es-lib`](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib)**         | Event sourcing: event store, snapshots, upcasting, sagas, materialised views — you are here                                 |

## Requirements

Node `>=20.11` per the manifest, though CI also runs the suite on Node 18. The package is CommonJS only (`main: index.js`, `types: index.d.ts`); the tarball holds compiled `.js`, `.js.map` and `.d.ts` files, the MIT `LICENSE`, this README, and a 293 kB `tsconfig.lib.tsbuildinfo` that should not be there.

Ten peer dependencies, none marked optional, so npm installs them for you and fails on a version conflict. `1.1.0` added four the library had always imported but never declared: `@nestjs/config`, `@nestjs/mongoose`, `class-transformer` and `mongodb`. The manifest has the exact ranges.

`@nestjs/mongoose`, `mongoose` and `@nestjs/config` are `require`d when the barrel loads, so they must be installed even if you only ever use the `custom` driver. `mongodb`, `class-transformer` and `rxjs` appear in no emitted `.js` file; they are needed to type-check against the shipped `.d.ts` files.

## Known limitations

Each was reproduced against `1.1.0` by running it, except where noted.

- **Committed events never reach your projectors.** `EventStorePublisher` assigns itself to `eventBus.publisher` on application bootstrap, replacing the in-memory pub/sub that feeds `@EventsHandler`. A `commit()` persists the event and nothing else: a registered handler for it is called zero times. `@IdempotentEventHandler` and `ProcessedEventTracker` are therefore unreachable through this path. Publish to the read side yourself.
- **`AggregateRehydrator` does not restore the id.** With no snapshot it calls `new AggregateClass(aggregateId)` — the id string where your constructor expects props — and never assigns `id`. If your constructor ignores that argument, the aggregate gets a fresh random id and its next events are appended to a different stream, so a second replay returns `0`. The quickstart constructor above is the workaround.
- **A snapshot restores `id` as a plain string.** `AggregateRehydrator` assigns the raw id, so `aggregate.id` is a `String`, not the `IdValueObject` the type says. `toString()` works; `id.isEmpty()` throws `is not a function`.
- **`aggregate.version` is `undefined`.** `DddAggregateRoot` in `ddd-lib@2.0.0` never initialises or increments its version; only a snapshot rehydration sets it. Track the stream version yourself and pass it to `AbstractSnapshotStore.save()`: writing `version: aggregate.version` stores `undefined`, and a store that reads `fromVersion === undefined` as "from the beginning" then replays the whole stream on top of the snapshot payload — measured as a balance of 200 where 100 was correct.
- **A replayed event is not the event you stored.** `DomainEventDeserializer` calls `new EventClass({ aggregateId, eventId, occurredOn })` — one argument — then copies `attributes` onto the instance. An event whose constructor takes `(aggregateId, amount)` receives that object as its first parameter, and `eventId` is regenerated rather than restored. Payload fields survive; identity fields do not.
- **The Mongo driver does not boot.** `EsModule.forRoot({ driver: 'mongo', … })` fails with `Nest can't resolve dependencies of the MongoEventStore (?, DomainEventDeserializer, UpcasterRegistry) … "event-store-connectionConnection/EventModel" is not available in the EsModule module`. `forRoot` calls `MongooseModule.forRoot` but never `forFeature`, and registering the models in your own module does not help because `MongoEventStore` is built in `EsModule`'s injector. Reading the source, two further defects sit behind it: `getEventsByStreamId` queries `{ streamId }` while records are written with `aggregateId`, and `persist` swallows Mongo's duplicate-key error 11000 — the optimistic-concurrency failure — logging `Aggregate is stale` and returning normally. Neither could be executed, because the driver does not start.
- **`EnhancedAggregateRehydrator` throws on any non-empty stream.** It calls `loadFromHistory(event)` per event where `@nestjs/cqrs` expects the array: `TypeError: history.forEach is not a function`. Use `AggregateRehydrator` and take snapshots yourself.
- **Your store class is instantiated twice.** `driver: 'custom'` registers `eventStoreClass` both as itself and as `{ provide: AbstractEventStore, useClass: … }`, so `app.get(MyStore)` and `app.get(AbstractEventStore)` are different objects. Only the `AbstractEventStore` one is used by the library. Inject by the abstract token.
- **`SagaRegistry` subscribes nothing.** It is a `Map` with `register`/`get`/`getAll`/`has`/`count`. Sagas still reach the bus through `@Saga()` from `@nestjs/cqrs`.
- **`MaterializedViewManager` is a cache, not storage.** A process-local `Map` with an optional TTL. Nothing is persisted, nothing is shared between instances.
- **No in-memory store is exported.** The barrel exports 34 names; `InMemoryEventStore` is not one of them, despite existing in the source tree. Nor is the `ProcessedEvent` schema, which `ProcessedEventTracker` expects registered under the model name `ProcessedEvent`. The store in _Registering the store_ above is complete — copy it.

## Documentation

- [Repository README](../../README.md) — the repository layout and how to work on it from a clone.
- [BankAccount sample](../../src/bank-account/README.md) — a full aggregate, command handlers, projectors and a saga.
- [CHANGELOG](../../CHANGELOG.md) — what changed in `1.1.0`.
- [Versioning policy](../../docs/VERSIONING.md) — how releases are cut.

## Contributing

Issues and pull requests go to [nestjslatam/ddd-event-sourcing](https://github.com/nestjslatam/ddd-event-sourcing/issues); the limitations above are all open work, and a reproduction case is as useful as a fix. Commits follow Conventional Commits. On pushes and pull requests to `main` or `develop`, `ci.yml` runs ESLint, a job named "Type Check" that actually runs `npm run build`, and the Jest suite on Node 18 and 20 — 183 tests across 23 suites at the time of writing. A second workflow, `validate.yml`, triggers on the same events and adds `npm run build:lib`. Neither is enforced: `main` carries no branch protection.

## Licence

Contradictory, and unresolved. `libs/es/package.json` says `Apache-2.0`. [`LICENSE`](LICENSE) in this directory, the copy shipped in the published tarball, is MIT, as is the repository root `LICENSE`. The root `package.json` says `"Apache"`, which is not a valid SPDX identifier. This README does not pick a side; [ask a maintainer](https://github.com/nestjslatam/ddd-event-sourcing/issues).
