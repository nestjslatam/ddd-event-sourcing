# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## es-lib 1.5.0 (2026-08-29)

### The sample runs

It did not start, and behind that stood five more defects — each hidden by the one before it, which is why none had ever been seen.

**The sample**

- **It did not bootstrap.** `BankAccountModule` imported the bare `EsModule` class. `forRoot` returns a _dynamic_ module and Nest does not hoist its providers, so the feature module got the static `@Module` — no providers, nothing exported. `forRoot` now returns a **global** module, the shape NestJS uses for root-configured infrastructure; importing it again per feature would open a second connection.
- **Every import named a package that does not exist.** The alias was `@nestjslatam/es`; the published package is `@nestjslatam/ddd-es-lib`. Ten source files, the Jest mapping, three docs and the generated docs site all told readers to install something npm has never had. A sample teaches by being copied.
- **Ids are validated at the edge.** `BankAccount.open` passes the id to `IdValueObject.load`, which refuses anything that is not a UUID — `'acc-123'` used to surface as an exception from deep inside the aggregate. `@IsUUID()` and `ParseUUIDPipe` make it a `400` naming the field. No version is pinned, because `ddd-lib` accepts any RFC 4122 version and a mismatch there is exactly what makes a sample teach the wrong lesson.

**The library, all reached through the sample**

- **`EnhancedAggregateRehydrator` had never replayed an aggregate.** It called `loadFromHistory` once per event; the method takes the whole array and iterates internally, so the first event threw `TypeError: history.forEach is not a function`. The plain `AggregateRehydrator` beside it always called it correctly.
- **It also built the aggregate wrong.** `new Cls(aggregateId)` puts the id in the props slot, so the first event handler to assign a field threw `Cannot create property 'holderName' on string`.
- **Commands returned before their events were durable.** `AggregateRoot.commit()` is synchronous and does not await the publisher, so a handler returned while the write was still in flight and the next command found nothing — about one request in five. `EventStorePublisher.flush()` resolves once every started write has settled, and the handlers await it.

### `npm run verify:sample`

[`scripts/verify-sample.js`](scripts/verify-sample.js) boots the sample against a throwaway MongoDB and drives its HTTP surface: open, deposit, read the projected view, and the malformed requests that must be rejected.

Worth recording how the race was diagnosed, because it nearly was not. Adding instrumentation to inspect the event store made the failure disappear — the extra latency was masking it. Only after removing the instrumentation and re-measuring did it show up again, at one in five. A fix confirmed by a run that also changed the timing is not confirmed.

## es-lib 1.4.0 (2026-08-29)

### The `mongo` driver boots

It had **five** defects, and not one was reachable by the 184-test suite — because nothing in it ever booted the module. Found by doing exactly that, against a real throwaway MongoDB.

1. **The models were never registered.** `forRoot` opened the connection with `MongooseModule.forRoot` but never called `forFeature`, so `MongoEventStore`, `MongoSnapshotStore` and `EventsBridge` — all three taking an `@InjectModel` — could not be constructed. The connection existed; the models did not, and the driver did not boot at all.

2. **Every read threw.** `getEventsByStreamId` queried `{ streamId }`, a field the schema does not declare. The parameter is named `streamId`; the field it corresponds to is `aggregateId`, which is what `persist` writes and what the in-memory store already filtered on. So every read answered "Aggregate does not exist" no matter how many events were stored.

3. **Errors were destroyed by the handler meant to report them.** `persist`'s catch called `session.abortTransaction()` unconditionally, so anything failing _after_ a successful commit produced `Cannot call abortTransaction after calling commitTransaction` — and that replaced the real error, which was never seen. It aborts only while a transaction is actually open now.

4. **The first write to a fresh database always failed.** MongoDB will not create a collection inside a multi-document transaction, and `persist` opens one immediately: `Collection namespace 'x.events' is already in use`. An empty database is exactly what every new deployment starts with. The collection is now created up front, once.

5. **One bad document took the process down.** `EventsBridge` left its change-stream callback unguarded, so a document the deserializer could not build surfaced as an unhandled `error` event. A document written by an older schema, or one whose event class was renamed, is a reason to skip it and keep the stream alive — not to stop the application. The stream's own `error` channel is handled too.

### `npm run verify:mongo`

The check that found all five, kept as [`scripts/verify-mongo-driver.js`](scripts/verify-mongo-driver.js). It boots the module against a throwaway MongoDB and exercises the write and read paths.

It is a script rather than a Jest spec deliberately: under Jest, `mongodb-memory-server` fails its handshake with `Missing required sub-document 'driver' in the client metadata document`, an incompatibility with the bundled mongodb driver and nothing to do with this library. Mocking the very thing that was missing would have proved nothing.

### Fixed on the way

The deserializer's error messages told readers to use `@RegisterDomainEvent()`, **which does not exist** — the decorator is `@EsAutowiredEvent`. And `DomainEventClsRegistry`, which that decorator writes to and the deserializer reads from, was not exported, so nothing outside the package could register an event class directly. Both corrected.

## es-lib 1.3.0 (2026-08-29)

### Committed events reach your projectors

The single most consequential defect in this library, and the reason its README told you not to ship it.

`EventStorePublisher.onApplicationBootstrap` assigns `eventBus.publisher = this`. That **replaces** the publisher CQRS uses to feed `@EventsHandler` subscribers — it does not wrap it — and `publish()` only called `eventStore.persist(...)`. Events were stored correctly and nothing downstream ever ran: no projector, no read model, no materialised view. `commit()` returned cleanly, every handler was silently skipped, and any endpoint reading a projection answered `404` forever. `@IdempotentEventHandler` and `ProcessedEventTracker` were unreachable through this path entirely.

Nothing failed loudly, which is why 183 passing tests never noticed.

It now captures the publisher it displaces — reading `eventBus.publisher` **before** the assignment, since afterwards the original is unreachable — and hands each event on once the write has succeeded.

**Persist first, then dispatch.** If persistence fails the event did not durably happen, and dispatching it anyway would let a projection describe a state the event store never recorded. Conversely a subscriber that throws does **not** fail the write: the event is already stored, a projector's bug is not the command's problem, and propagating it would roll back nothing while failing a request that actually succeeded.

`BatchedEventStorePublisher` routes everything through `super.publish`, so it is fixed by the same change.

Six tests pin the behaviour, and reverting the dispatch turns two of them red. They cover the capture-before-replace ordering, the store-and-forward path, the batch path, the failed-write case, the throwing-subscriber case, and a publisher that was never bootstrapped.

## es-lib 1.2.0 (2026-08-29)

### Accepts `@nestjslatam/ddd-lib` 4.x

The peer range becomes `^2.0.0 || ^3.0.0 || ^4.0.0`.

**Verified rather than assumed**, and before `ddd-lib@4.0.0` was published rather than after: the 4.0.0 tarball was packed locally, installed into this repository, and the full suite re-run — **23 suites, 183 tests**, all passing, with `npm run build:lib` clean.

4.0.0 changes observable behaviour in eight places and the compiler catches none of them, so this range was widened only once the suite had actually run against it.

## es-lib 1.1.1 (2026-08-28)

Published as `@nestjslatam/ddd-es-lib@1.1.1`. No public API change.

### Accepts `@nestjslatam/ddd-lib` 3.x

The peer range was `^2.0.0`. `ddd-lib` 3.0.0 is published, so anyone on the current library got an unmet-peer warning from this package and had no supported way to resolve it.

The range is now `^2.0.0 || ^3.0.0`. **Verified rather than assumed**: `ddd-lib@3.0.0` was installed into this repository and the full suite re-run — 23 suites, 183 tests, all passing, and `npm run build:lib` clean. The 3.0.0 breaking change is `isValid` becoming a getter on `DddAggregateRoot`, and this library never reads it; the 25 import sites take `DddAggregateRoot`, `DomainEvent`, `IdValueObject`, the store abstractions and the module, none of which changed.

### The tarball no longer ships a build cache

`tsconfig.lib.tsbuildinfo` was published inside the package — **293 kB, two thirds of the unpacked bytes**, a TypeScript incremental-build cache of no use whatsoever to a consumer. `rimraf dist` wiped it before every build, so it was not even serving its own purpose locally.

`tsBuildInfoFile` now points outside the output directory, which removes it from the tarball and makes incremental builds actually work:

|          | 1.1.0    | 1.1.1        |
| -------- | -------- | ------------ |
| packed   | 93.2 kB  | **31.5 kB**  |
| unpacked | 436.5 kB | **143.5 kB** |

### The licence is MIT

It was declared four different, disagreeing ways. `LICENSE` at the root and `libs/es/LICENSE` — the copy `copy.sh` ships inside the npm tarball — were both MIT, while `libs/es/package.json` claimed `Apache-2.0` and the root `package.json` claimed a bare `"Apache"`, which is not a valid SPDX identifier at all.

Both manifests now say `MIT`, matching the two `LICENSE` files. The READMEs no longer warn about the contradiction, and instead record that **`1.1.0`, the version on npm, still carries the `Apache-2.0` field** — that one is already published and cannot be amended in place, so the correction lands with the next release.

## es-lib 1.1.0 (2026-08-28)

Published as `@nestjslatam/ddd-es-lib@1.1.0`. No public API change.

### 🐛 Bug Fixes

- **package:** declare every peer dependency the library imports ([73a5488](https://github.com/nestjslatam/ddd-event-sourcing/commit/73a5488)) — `require('@nestjslatam/ddd-es-lib')` crashed with `Cannot find module '@nestjs/mongoose'`. Five packages were imported but never declared:
  - `@nestjs/mongoose` — required at runtime by 7 compiled files
  - `@nestjs/config` — required at runtime by 1 compiled file
  - `class-transformer` — type-only, but leaks into an emitted `.d.ts`
  - `mongodb` — type-only, but leaks into an emitted `.d.ts`
- **mongoose:** `BankAccountView` declared `_id: string` while extending `Document`, whose first type parameter defaults to `ObjectId`. Broke the type check and three test suites ([d9e6a22](https://github.com/nestjslatam/ddd-event-sourcing/commit/d9e6a22)).
- **package:** declare `mongodb` explicitly — it was imported directly but only present transitively through mongoose ([f837e9b](https://github.com/nestjslatam/ddd-event-sourcing/commit/f837e9b)).
- **ci:** pin `@commitlint` to 20.x — 21 requires Node >=22.12 and produced a lockfile `npm ci` could not reproduce, which turned CI red ([89680db](https://github.com/nestjslatam/ddd-event-sourcing/commit/89680db)).

### ⬆️ Dependencies

- Align on NestJS 11.2.3. Library peer ranges widened to `^10 || ^11`, mongoose to `^8 || ^9`.
- Remove four dependencies with zero import sites: `typeorm`, `@nestjs/typeorm`, `pg`, `@nestjs/mapped-types`.
- Toolchain: TypeScript 5.9, ESLint 10 flat config, Jest 30, supertest 7.

### 🧹 Chores

- Pin line endings to LF. `.editorconfig` declared CRLF against an all-LF tree while `lint` ran with `--fix` ([0357c5a](https://github.com/nestjslatam/ddd-event-sourcing/commit/0357c5a)).
- Remove dead code flagged by ESLint: a stray `0;` in `events-bridge.ts` and a redundant initialiser in `es-aggregate-rehydrator.ts`.

## 2.0.0 (2026-02-11)

### ✨ Features

- **es:** implement DomainEventSerializer and align EventStorePublisher and cleanup alarms ([2ce97a5](https://github.com/nestjslatam/ddd-event-sourcing/commit/2ce97a5a231190d7e4e64d105c4fd30619ac0a97))
- implement event upcasting, read models/projections, and configurable repository pattern ([15bb0dc](https://github.com/nestjslatam/ddd-event-sourcing/commit/15bb0dc324530c00b7696b8bec3b5532a52bc578))

### 📚 Documentation

- add comprehensive README documentation for ES-Lib library ([85f7342](https://github.com/nestjslatam/ddd-event-sourcing/commit/85f7342ac287da2e2ffb89696db841f669b3d3b0))

### 🐛 Bug Fixes

- correct ProcessedEventTracker mock method names in projector tests ([26f69b6](https://github.com/nestjslatam/ddd-event-sourcing/commit/26f69b635b0df5154c92e69387545afbfa0febfe))
- Initial Release ([2b93582](https://github.com/nestjslatam/ddd-event-sourcing/commit/2b935826041216ddf204a952dee648ddebe8a2bf))
- resolve all test failures and lint errors ([c3b128c](https://github.com/nestjslatam/ddd-event-sourcing/commit/c3b128cd1a88fcfc1073ee176e4ebae685194b03))
- resolve test failures and lint errors for v1.0.0 release ([492fc92](https://github.com/nestjslatam/ddd-event-sourcing/commit/492fc92a1488f4051f50e0e6f26c80c9cd844ded))
- resolve test failures, lint errors, and CI deprecations ([4bc65c8](https://github.com/nestjslatam/ddd-event-sourcing/commit/4bc65c85d26e5e12645e1705f027d28261dd569c))
- resolve test failures, lint errors, and CI deprecations ([8381738](https://github.com/nestjslatam/ddd-event-sourcing/commit/8381738ae6612f7d23e97fee1dbed97b27986aa1))
- update release verison ([1c29b62](https://github.com/nestjslatam/ddd-event-sourcing/commit/1c29b62d95f633f7aa68dc816e8e0e1e7bf2c3c1))

## [1.0.0] - 2026-02-11

### ✨ Features

#### Phase 1: Foundation

- **Event Versioning** - Safe schema evolution with `VersionedEvent` and `EnhancedUpcasterRegistry`
- **Snapshot Strategies** - Flexible snapshot policies (`EventCount`, `TimeBased`, `Composite`)
- **Idempotent Event Handlers** - Automatic duplicate prevention with `@IdempotentEventHandler`
- **Enhanced Rehydration** - Auto-snapshot management with `EnhancedAggregateRehydrator`

#### Phase 2: Advanced Features

- **Saga Support** - Workflow orchestration with `AbstractSaga` and `SagaRegistry`
- **Materialized Views** - Query caching with `MaterializedViewManager`
- **Event Batching** - Improved throughput with `BatchedEventStorePublisher`
- **Parallel Processing** - Concurrent event processing with `ParallelEventProcessor`
- **View Invalidation** - Automatic cache invalidation strategies

### ⚡ Performance Improvements

- **Snapshots**: 10x-100x faster aggregate rehydration
- **Materialized Views**: 50x-500x faster queries
- **Event Batching**: 10x-50x better write throughput

### 📚 Documentation

- Complete API reference for Phase 1 and Phase 2
- Quick start guides
- BankAccount sample application
- CI/CD setup guide
- Migration guides

### ✅ Tests

- 183 passing tests (100% pass rate)
- Comprehensive unit test coverage
- Integration tests for sample application

### 🐛 Bug Fixes

- Fixed 8 test failures in snapshot strategy and deserializer
- Fixed 17 ESLint errors across 13 files
- Updated GitHub Actions upload-artifact from v3 to v4
- Resolved DomainEvent deserialization issues
- Fixed snapshot strategy test expectations

### 🔧 Infrastructure

- Husky pre-commit hooks
- GitHub Actions CI/CD
- Automated releases
- Documentation deployment

---

## Release Notes

This is the first production release of ES-Lib, featuring:

- Complete Event Sourcing implementation
- CQRS patterns with saga support
- High-performance query optimization
- Enterprise-grade reliability features
- Comprehensive documentation
- Production-ready sample application

**Tested with:**

- Node.js 18.x, 20.x
- TypeScript 5.x
- NestJS 10.x
- MongoDB 8.x

**Installation:**

```bash
npm install @nestjslatam/es
```

**Documentation:**

- [Quick Start](docs/PHASE1_QUICK_START.md)
- [Phase 1 Guide](docs/PHASE1_IMPLEMENTATION.md)
- [Phase 2 Guide](docs/PHASE2_IMPLEMENTATION.md)
- [Sample Application](src/bank-account/README.md)
