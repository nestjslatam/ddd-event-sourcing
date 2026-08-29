<div align="center">

# `@nestjslatam/ddd-es-lib`

**Event sourcing and CQRS for [`@nestjslatam/ddd-lib`](https://github.com/nestjslatam/ddd)** — event store, snapshots, upcasting, sagas and materialised views, on NestJS.

[![npm](https://img.shields.io/npm/v/%40nestjslatam%2Fddd-es-lib?color=1e73be&label=ddd-es-lib)](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib)
[![CI](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml/badge.svg)](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml)
[![tests](https://img.shields.io/badge/tests-183%20passing%20·%20no%20DB%20needed-00d084)](#running-the-tests)
[![license](https://img.shields.io/badge/license-MIT-575760)](LICENSE)

[Read this first](#read-this-first) · [What it does](#what-it-does) · [FAQ](#faq) · [Known limitations](#known-limitations) · [Contributing](#contributing)

</div>

---

> [!CAUTION]
> **Do not ship this yet.** The public API is unstable, **only the `custom` driver boots**, and **committed events never reach your `@EventsHandler` projectors** — `EventStorePublisher` installs itself as the CQRS publisher and its `publish()` only persists, so read models are never updated. The 183 tests are green and the building blocks are real, but the wiring between them has gaps. Read [Known limitations](#known-limitations) in full before adopting it, and pin an exact version.

## Read this first

This README does not oversell the library, and that is deliberate. Every limitation below was reproduced by running it, and the [`libs/es/README.md`](libs/es/README.md) shipped to npm carries the same catalogue with the exact error text and the root cause read from source for each one.

If you want event sourcing in production today, use something mature. If you want to _learn_ how an event-sourced aggregate, an upcaster and a snapshot strategy fit together in NestJS — or you want a well-scoped bug to fix — you are in the right place.

## What it does

```bash
npm install @nestjslatam/ddd-es-lib @nestjslatam/ddd-lib
```

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Event store** | Append-only persistence, MongoDB or your own driver                |
| **Snapshots**   | `EventCount`, `TimeBased` and `Composite` strategies               |
| **Upcasting**   | `VersionedEvent` + `EnhancedUpcasterRegistry` for schema evolution |
| **Rehydration** | `EnhancedAggregateRehydrator`, auto-snapshotting                   |
| **Sagas**       | `AbstractSaga`, `SagaRegistry`                                     |
| **Read models** | `MaterializedViewManager`, invalidation strategies                 |
| **Throughput**  | `BatchedEventStorePublisher`, `ParallelEventProcessor`             |

`DddAggregateRoot` from `ddd-lib` is the aggregate you replay; this library supplies everything around it.

## Running the tests

```bash
npm install
npm test        # 23 suites, 183 tests, ~5s
```

**No Docker and no MongoDB required** — the suite runs entirely in memory. That is the cheapest way to see the building blocks work, and it is why the failing sample below is a self-contained bug rather than an environment problem.

## Known limitations

Each was reproduced by running it.

**In the library**

- **Committed events do not reach `@EventsHandler` projectors.** `EventStorePublisher`'s constructor sets `this.eventBus.publisher = this`, and its `publish()` only calls `eventStore.persist(...)`. Events are stored and never dispatched, so projections never update and any endpoint reading a projection returns 404 forever.
- **Only the `custom` driver boots.** `EsModule.forRoot({ driver: 'mongo' })` is not usable as-is; supply your own store via `driver: 'custom'`.
- **The public API is unstable.** It has moved in every release so far. Pin exactly.

**In the sample application**

- **It does not bootstrap.** `src/bank-account/bank-account.module.ts` imports the bare `EsModule` class, whose static `@Module` declares no providers, so no `AbstractEventStore` is bound in that module's injector — only `AppModule` calls `EsModule.forRoot(...)`. `npm run start` fails at `EnhancedAggregateRehydrator`.
- **Account ids must be UUID v4.** `BankAccount.open` passes the id to `IdValueObject.load`, which throws `InvalidFormatException` on anything else. Nothing in the controller or DTOs enforces or documents it, and the controller tests use `'acc-123'` against a mocked command bus, so they never reach the aggregate.
- **`src/bank-account/README.md` documents two routes that do not exist** — `GET /bank-accounts/:id/summary` and `/statistics`.

**In the repository**

- **The PostgreSQL container in `docker-compose.yml` is dead weight.** Nothing in `src/` or `libs/` references Postgres, TypeORM or port 5432.
- **`docs/CI_CD_SETUP.md` names a `release.yml`** that does not exist; the release workflow is `cd.yml`.
- **The generated docs site tells readers to install `@nestjslatam/es`**, which is not a package on npm.

## FAQ

<details>
<summary><b>Four <code>@nestjslatam</code> packages — which do I need?</b></summary>

[`ddd-lib`](https://github.com/nestjslatam/ddd) is the foundation and is always required. **This package is only for event sourcing**, and it hard-requires `mongoose` and `@nestjs/mongoose` as peers even if you use a custom driver. [`ddd-valueobjects`](https://github.com/nestjslatam/ddd-valueobjects) is optional value objects; [`ddd-cli`](https://github.com/nestjslatam/ddd-cli) is a dev tool.
</details>

<details>
<summary><b>Is it production-ready?</b></summary>

**No, and that answer is about this package specifically.** See the caution at the top: committed events never reach your projectors, and only the `custom` driver boots. Two wiring gaps that bite on day one.

Worth separating from the foundation it sits on. `@nestjslatam/ddd-lib@4.0.0` is the first release with tests on the classes you extend — 1017 of them, 98.6% coverage — and its remaining risk is API churn rather than correctness. **That progress has not happened here.** This package's 183 tests cover its building blocks, not the wiring between them, which is precisely where its defects live.
</details>

<details>
<summary><b>Do I need MongoDB to get started?</b></summary>

Not for the tests — 183 of them run in memory with no database. You need one to run the sample, and even then the sample does not currently bootstrap.
</details>

<details>
<summary><b>I registered an <code>@EventsHandler</code> and <code>commit()</code> never calls it. My bug?</b></summary>

**No, ours.** `EventStorePublisher` replaces the CQRS event bus's publisher and only persists. This is the single most impactful thing to fix in the repository — see [Contributing](#contributing).
</details>

<details>
<summary><b>My replayed aggregate comes back with the wrong id, or a second replay returns nothing.</b></summary>

Check that the id is a **UUID v4** — `IdValueObject.load` rejects anything else, and the sample's own tests never exercise that path because they mock the command bus.
</details>

<details>
<summary><b>What does this give me over writing the event store myself?</b></summary>

The parts that are tedious and easy to get subtly wrong: upcasting for schema evolution, three composable snapshot strategies, and saga orchestration. The append-and-read core is the easy part; those three are not.
</details>

<details>
<summary><b>Will the CLI scaffold my event-sourcing code?</b></summary>

Not yet. [`ddd-cli`](https://github.com/nestjslatam/ddd-cli) reads and scaffolds `ddd-lib` stereotypes — aggregates, value objects, validators. Event-sourcing stereotypes are not among its templates, which makes them a good contribution to _that_ repository.
</details>

<details>
<summary><b>Which NestJS, Node and Mongoose versions?</b></summary>

NestJS 10 or 11, Node `>=20.11`, mongoose `^8 || ^9`, and `ddd-lib` `^2.0.0 || ^3.0.0 || ^4.0.0` — each new major verified by re-running the full suite against it before the range was widened, which for `4.0.0` meant packing its tarball locally and testing against it before it was published. Ten peer dependencies in all, none optional; the manifest has the exact ranges.
</details>

## Contributing

Everything below is diagnosed, reproducible and self-contained — the best kind of first contribution.

1. **Make committed events reach projectors.** The highest-value fix here. `EventStorePublisher.publish()` persists and stops; it needs to forward to the CQRS subscribers too. Everything downstream — projections, read models, materialised views — is dead until it does.
2. **Fix the sample's bootstrap.** `bank-account.module.ts` imports the bare `EsModule`; it needs the configured one. One import, and `npm run start` works.
3. **Validate account ids at the edge.** A UUID v4 check in the DTO turns an `InvalidFormatException` from deep in the aggregate into a `400`.
4. **Make the `mongo` driver boot,** so the library is usable without writing your own store.
5. **Delete the dead PostgreSQL container** and fix the two stale doc references above.

Before opening a PR:

```bash
npm run lint && npm test
```

CI runs lint, a type check, the build, and the suite on Node 18 and 20. Commits follow [Conventional Commits](https://www.conventionalcommits.org/); `main` carries no branch protection, so the checks are advisory — please read them anyway.

## Repository layout

|                                          |                                                       |
| ---------------------------------------- | ----------------------------------------------------- |
| `libs/es/`                               | The published library — this is the product           |
| `src/bank-account/`                      | A sample application (currently does not bootstrap)   |
| [`libs/es/README.md`](libs/es/README.md) | The npm-facing README, with the full defect catalogue |
| [`CHANGELOG.md`](CHANGELOG.md)           | Every release and why                                 |

Publishing: `npm run build:lib` compiles with `tsc` and derives the manifest; the package is published from `dist/libs/es`.

> [!TIP]
> **[The CLI's full guide →](https://github.com/nestjslatam/ddd-cli/blob/main/docs/GUIDE.md)** — every command and flag, walked through by building a complete domain from nothing into ten type-checking files. Worth reading even if you never install the CLI: it is the clearest write-up of this library's idiom anywhere, because every claim in it was produced by running the tool.

## Who is behind this

Built and maintained by **[BeyondNet Tech](https://beyondnet.info/)** with the [NestJS Latam](https://nestjslatam.dev/) community.

- **[Evolith](https://github.com/beyondnetcode/evolith_arch32)** — executable architecture governance: a CLI, MCP server and REST API that check a repository against Rego/OPA rules, and report a rule they could not evaluate as a failure rather than a silent pass.
- **[Shell.ddd](https://github.com/beyondnetcode/Shell.ddd)** — the .NET counterpart of `ddd-lib`.

## License

MIT — see [LICENSE](LICENSE). `1.1.0` and earlier declared `Apache-2.0` in the manifest over this same MIT file; a published manifest cannot be amended in place, so upgrade rather than relying on the licence field of an older release.

---

<div align="center">

**Powered by [BeyondNetCode](https://beyondnet.info/)**

[Website](https://beyondnet.info/) · [GitHub](https://github.com/beyondnetcode) · [NestJS Latam](https://nestjslatam.dev/)

</div>
