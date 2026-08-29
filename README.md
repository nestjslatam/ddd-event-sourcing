# ddd-event-sourcing

The source of `@nestjslatam/ddd-es-lib` and a BankAccount sample application that exercises it.

[![CI](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml/badge.svg)](https://github.com/nestjslatam/ddd-event-sourcing/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/%40nestjslatam%2Fddd-es-lib.svg)](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib)

> [!WARNING]
> **The sample application does not start.** `npm run start` fails during dependency resolution with `Nest can't resolve dependencies of the EnhancedAggregateRehydrator (?, EventPublisher, AbstractSnapshotStore, Object)`. The library and the 183 tests are unaffected; the sample's module wiring is what is broken. See [Known limitations](#known-limitations).

## The library

```bash
npm install @nestjslatam/ddd-es-lib
```

Peer dependencies, configuration and the API are documented in [`libs/es/README.md`](libs/es/README.md).

## What the sample looks like

An aggregate is a `DddAggregateRoot` that applies domain events; the `on<EventName>` methods fold them back into state. Abridged from [`src/bank-account/domain/bank-account.aggregate.ts`](src/bank-account/domain/bank-account.aggregate.ts):

```typescript
export class BankAccount extends DddAggregateRoot<
  BankAccount,
  BankAccountProps
> {
  constructor(props: BankAccountProps, id?: IdValueObject) {
    super(props, id ? { id } : undefined);
  }

  static open(
    id: string,
    holderName: string,
    initialAmount: number,
    currency: string,
  ): BankAccount {
    const account = new BankAccount(
      { holderName, balance: Money.create(initialAmount, currency) },
      IdValueObject.load(id), // throws unless `id` is a UUID v4
    );
    account.apply(
      new AccountOpenedEvent(id, holderName, initialAmount, currency),
    );
    return account;
  }

  deposit(amount: number): void {
    this.apply(
      new MoneyDepositedEvent(
        this.id.toString(),
        amount,
        this.props.balance.currency,
      ),
    );
  }

  private onAccountOpenedEvent(event: AccountOpenedEvent): void {
    this.props.holderName = event.holderName;
    this.props.balance = Money.create(event.initialBalance, event.currency);
  }

  private onMoneyDepositedEvent(event: MoneyDepositedEvent): void {
    this.props.balance = this.props.balance.add(
      Money.create(event.amount, event.currency),
    );
  }
}
```

Run against that class:

```typescript
const account = BankAccount.open(
  '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  'Ada Lovelace',
  100,
  'USD',
);
account.deposit(50);

account.getUncommittedEvents(); // [AccountOpenedEvent, MoneyDepositedEvent]
account.props.balance; // 150 USD -- `props` is a public getter on
// DddAggregateRoot; only its setter is private
```

`commit()` hands the uncommitted events to the publisher, which appends them to the store. Command handlers in [`src/bank-account/application/commands`](src/bank-account/application/commands) rehydrate an aggregate, call a method on it and commit.

## What is in this repository

| Path                | What it is                                                                                                                                                                                                                                                 | Published                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `libs/es`           | The event sourcing library: event store, aggregate rehydration, snapshots, upcasting, sagas, materialized views.                                                                                                                                           | Yes, as `@nestjslatam/ddd-es-lib` |
| `src`               | The BankAccount sample application — a NestJS app that opens, credits and debits an account through commands, events and a projected read model.                                                                                                           | No                                |
| `docs`              | Versioning and release notes, the CI/CD setup, and older Phase 1 / Phase 2 implementation notes. Some of it is stale: `CI_CD_SETUP.md` describes a `release.yml` workflow that does not exist.                                                             | No                                |
| `scripts`           | `event-store-mongoinit.js`, which runs `rs.initiate()` inside the event-store MongoDB container.                                                                                                                                                           | No                                |
| `.github/workflows` | `ci.yml` and `validate.yml` on pushes and pull requests targeting `main` or `develop`; `cd.yml` on `es-lib-v*` tags and on manual dispatch; `docs.yml` on published releases, on manual dispatch, and on pushes to `main` touching `docs/` or `README.md`. | No                                |

## Running the sample

It does not currently boot — see the warning above. What the setup would be:

```bash
docker compose up -d
npm install
EVENT_STORE_URL=mongodb://localhost:27018/event-store npm run start:dev
```

`docker-compose.yml` starts three containers: MongoDB on `27017` for the read model, a single-node MongoDB replica set on `27018` for the event store, and PostgreSQL on `5432` that nothing in this repository connects to. The event store needs the replica set because `MongoEventStore.persist` opens a session and writes inside a transaction, and MongoDB only permits transactions on a replica set.

`src/app.module.ts` reads `MONGODB_URI` for the read model and `EVENT_STORE_URL` for the event store, defaulting both to `localhost:27017` — which is why the event store URL is set explicitly above. The checked-in `.env` defines `MONGODB_ES_URL` and `MONGODB_URL` instead, and no code reads either name.

`src/main.ts` listens on <http://localhost:3000>, and `BankAccountController` exposes four routes:

| Route                              | Body                                                   | Result                                  |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `POST /bank-accounts`              | `accountId`, `holderName`, `initialAmount`, `currency` | Opens an account, returns `{ id }`      |
| `POST /bank-accounts/:id/deposit`  | `amount`                                               | Applies `MoneyDepositedEvent`           |
| `POST /bank-accounts/:id/withdraw` | `amount`                                               | Applies `MoneyWithdrawnEvent`           |
| `GET /bank-accounts/:id`           | —                                                      | The projected `BankAccountView`, or 404 |

## Repository layout

```
.
├── libs/es/src              # the published library
│   ├── es-core              # store and snapshot base classes, serializers, upcasting, snapshot strategies
│   ├── es-decorators        # EsAutowiredEvent, IdempotentEventHandler
│   ├── es-query             # materialized views and invalidation strategies
│   ├── es-sagas             # saga base class and registry
│   └── es-store             # Mongo and in-memory event stores, batching, Mongoose schemas
├── src/bank-account         # the sample application
│   ├── application          # command handlers, query handlers, saga
│   ├── domain               # aggregate, domain events, value objects
│   └── infrastructure       # controller, DTOs, projectors, read-model schema
├── docs                     # versioning, release, CI/CD and Phase 1 / Phase 2 notes
├── scripts                  # MongoDB replica-set init script for docker-compose
└── .github/workflows        # CI, validation, publish and docs pipelines
```

## Development

Node 20.11 or newer (`engines` in `package.json`), and Docker if you want the databases.

```bash
npm install
npm test            # Jest over src/ and libs/ — 23 suites, 183 tests
npm run type-check  # tsc --noEmit
npm run build       # nest build — compiles the sample application
npm run build:lib   # tsc over libs/es, then copy.sh stages the manifest, README and LICENSE into dist/libs/es
npm run validate    # lint:fix, then type-check, then test
```

`npm run build:lib` runs `rimraf dist` first, so it erases anything `npm run build` put there. Run it second, not first.

The sample imports the library as `@nestjslatam/es`. That is a TypeScript path alias declared in `tsconfig.json` and mapped again in the Jest config; it points at `libs/es/src`, not at a package on npm. What you install is `@nestjslatam/ddd-es-lib`.

## Known limitations

- **The sample does not bootstrap.** `src/bank-account/bank-account.module.ts` imports the bare `EsModule` class, whose static `@Module` declares no providers, so no `AbstractEventStore` is bound in that module's injector — only `AppModule` calls `EsModule.forRoot({ driver: 'mongo', ... })`. `npm run start` therefore fails at `EnhancedAggregateRehydrator`.
- **Account ids must be UUID v4.** `BankAccount.open` passes the id to `IdValueObject.load`, which throws `InvalidFormatException: value has an invalid format. Expected: valid UUID v4` on anything else. Nothing in the controller or the DTOs enforces or documents this, and the controller tests use `'acc-123'` with a mocked command bus, so they never reach the aggregate.
- **`src/bank-account/README.md` documents routes that do not exist.** It shows `GET /bank-accounts/:id/summary` and `GET /bank-accounts/:id/statistics`; `BankAccountController` implements neither.
- **The PostgreSQL container in `docker-compose.yml` is dead weight.** No source file in `src/` or `libs/` references Postgres, TypeORM or port 5432.
- **`docs/` is partly stale.** `CI_CD_SETUP.md` documents a `.github/workflows/release.yml`; the release workflow is `cd.yml`.
- **The generated documentation site tells readers to install the wrong package.** `docs.yml` writes a `gh-pages/index.html` containing `npm install @nestjslatam/es`, which is not a package on npm.

## Contributing

Branch from `main`. The workflows also name `develop` in their triggers, but no `develop` branch exists on the remote.

Commit messages pass through commitlint with `@commitlint/config-conventional` and a fixed type list (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`, `build`). The husky `pre-commit` hook runs lint-staged and then `npm run build`, so a commit that does not compile is rejected locally.

A pull request triggers both `ci.yml` and `validate.yml`, though `main` carries no branch protection, so nothing blocks a merge on a red run. Between them they run ESLint, a job named "Type Check" that actually runs `npm run build` rather than `npm run type-check`, the Jest suite on Node 18 and 20, the application build, and `npm run build:lib`. ESLint runs with `continue-on-error`, so lint failures do not block a merge, and the test matrix still includes Node 18 although `engines` requires 20.11 or newer.

There is no `CONTRIBUTING.md` — raise questions on the [issues page](https://github.com/nestjslatam/ddd-event-sourcing/issues).

## The ecosystem

| Package                                                                                               | What it is                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`@nestjslatam/ddd-lib`](https://www.npmjs.com/package/@nestjslatam/ddd-lib)                          | DDD building blocks: aggregates, value objects, validators, broken rules, state tracking                                    |
| [`@nestjslatam/ddd-cli`](https://www.npmjs.com/package/@nestjslatam/ddd-cli)                          | Inventory the stereotypes, scaffold them, subclass them, audit your code. Runs as an MCP server so an AI agent can drive it |
| [`@nestjslatam/ddd-valueobjects`](https://www.npmjs.com/package/@nestjslatam/ddd-valueobjects)        | Ready-made value objects: email, phone number, money, date range, document id                                               |
| **[`@nestjslatam/ddd-es-lib`](https://www.npmjs.com/package/@nestjslatam/ddd-es-lib)** — you are here | Event sourcing: event store, snapshots, upcasting, sagas, materialised views                                                |

## License

MIT. All four declarations now agree: [`LICENSE`](LICENSE), `libs/es/LICENSE` (the copy `copy.sh` ships in the npm tarball), `libs/es/package.json` and `package.json`.

They did not until this was settled — the manifests claimed `Apache-2.0` (and, at the root, a bare `"Apache"`, which is not a valid SPDX identifier) over an MIT `LICENSE` file. `@nestjslatam/ddd-es-lib@1.1.0` was published under that contradiction and still carries the `Apache-2.0` field; the next release corrects it.
