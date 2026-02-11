# ES-Lib

[![npm version](https://badge.fury.io/js/@nestjslatam%2Fes.svg)](https://www.npmjs.com/package/@nestjslatam/es)
[![CI](https://github.com/nestjslatam/ddd-event-sourcing/workflows/Validate/badge.svg)](https://github.com/nestjslatam/ddd-event-sourcing/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)

**ES-Lib** is a powerful Event Sourcing library for NestJS that extends [@nestjslatam/ddd-lib](https://www.npmjs.com/package/@nestjslatam/ddd-lib) with comprehensive Event Sourcing capabilities. It provides a clean, modular architecture for building robust and scalable applications using Domain-Driven Design (DDD), Event Sourcing, and CQRS patterns.

## 🚀 Key Features

- **Event Sourcing Support** - Store application state as a sequence of immutable events
- **DDD Integration** - Built on top of DDD-Lib with full support for Aggregates, Entities, and Value Objects
- **CQRS Ready** - Seamless integration with NestJS CQRS module
- **Pluggable Repositories** - Support for MongoDB, In-Memory, and custom event store implementations
- **Event Serialization/Deserialization** - Automatic event serialization with type safety
- **Aggregate Rehydration** - Rebuild aggregate state from event streams
- **Event Upcasting** - Handle event schema evolution gracefully
- **Snapshot Support** - Optional snapshot storage for performance optimization

### ✨ Phase 1 CQRS Improvements (NEW!)

- **Event Versioning** - Safe schema evolution with automatic upcasting via `VersionedEvent` and `EnhancedUpcasterRegistry`
- **Snapshot Strategies** - Flexible snapshot policies (`EventCount`, `TimeBased`, `Composite`) for 10x-100x performance gains
- **Idempotent Event Handlers** - Automatic duplicate prevention with `@IdempotentEventHandler` decorator
- **Enhanced Rehydration** - Auto-snapshot management with `EnhancedAggregateRehydrator`

> 📚 **[Phase 1 Quick Start Guide](docs/PHASE1_QUICK_START.md)** | **[Complete Documentation](docs/PHASE1_IMPLEMENTATION.md)** | **[Examples](docs/PHASE1_EXAMPLES.md)**

### 🚀 Phase 2 Advanced Features (NEW!)

- **Saga Support** - Orchestrate complex workflows across aggregates with `AbstractSaga` and `SagaRegistry`
- **Materialized Views** - Pre-computed query caching with `MaterializedViewManager` for 50x-500x faster queries
- **Event Batching** - Improved throughput with `BatchedEventStorePublisher` and `ParallelEventProcessor` (10x-50x faster)
- **View Invalidation** - Automatic cache invalidation strategies for data consistency

> 📚 **[Phase 2 Implementation Guide](docs/PHASE2_IMPLEMENTATION.md)** | **[Walkthrough](docs/phase2_walkthrough.md)**

---

## 📦 Installation

```bash
npm install @nestjslatam/es
```

### Peer Dependencies

```bash
npm install @nestjslatam/ddd-lib @nestjs/cqrs @nestjs/common @nestjs/core reflect-metadata
```

For MongoDB support:

```bash
npm install @nestjs/mongoose mongoose
```

---

## 🏗️ Architecture

ES-Lib follows a clean architecture approach with clear separation of concerns:

### Core Components

1. **AbstractEventStore** - Abstract base class for event persistence
2. **AggregateRehydrator** - Rebuilds aggregates from event streams
3. **DomainEventSerializer/Deserializer** - Handles event serialization
4. **EventStorePublisher** - Publishes events to the NestJS event bus
5. **UpcasterRegistry** - Manages event schema migrations

### Event Flow

```
Command → Aggregate → Domain Events → Event Store → Event Bus → Projectors/Read Models
```

---

## 🔧 Configuration

ES-Lib supports three repository implementations: **MongoDB** (production), **In-Memory** (testing), and **Custom** (your own implementation).

### Option 1: MongoDB Repository (Production)

The MongoDB repository provides a production-ready event store with transaction support and optimistic concurrency control.

```typescript
import { Module } from '@nestjs/common';
import { EsModule } from '@nestjslatam/es';

@Module({
  imports: [
    EsModule.forRoot({
      driver: 'mongo',
      mongoUrl: 'mongodb://localhost:27017/event-store',
    }),
  ],
})
export class AppModule {}
```

**Features:**

- ✅ Transaction support for atomic event persistence
- ✅ Optimistic concurrency control
- ✅ Event versioning
- ✅ Snapshot support

### Option 2: In-Memory Repository (Testing/Development)

The in-memory repository is perfect for testing and development environments.

```typescript
import { Module } from '@nestjs/common';
import { EsModule } from '@nestjslatam/es';
import { InMemoryEventStore } from '@nestjslatam/es';

@Module({
  imports: [
    EsModule.forRoot({
      driver: 'custom',
      eventStoreClass: InMemoryEventStore,
    }),
  ],
})
export class AppModule {}
```

**Features:**

- ✅ No external dependencies
- ✅ Fast for unit testing
- ✅ Simple setup

### Option 3: Custom Repository

Implement your own event store by extending `AbstractEventStore`.

```typescript
import { Injectable } from '@nestjs/common';
import { AbstractEventStore, DomainEventDeserializer } from '@nestjslatam/es';
import { ISerializable } from '@nestjslatam/ddd-lib';

@Injectable()
export class MyCustomEventStore implements AbstractEventStore {
  constructor(private readonly eventDeserializer: DomainEventDeserializer) {}

  async persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void> {
    // Your custom persistence logic
  }

  async getEventsByStreamId(
    streamId: string,
    fromVersion?: number,
  ): Promise<ISerializable[]> {
    // Your custom retrieval logic
  }
}
```

Then configure it:

```typescript
@Module({
  imports: [
    EsModule.forRoot({
      driver: 'custom',
      eventStoreClass: MyCustomEventStore,
      snapshotStoreClass: MyCustomSnapshotStore, // Optional
    }),
  ],
})
export class AppModule {}
```

---

## 📚 Sample Application: BankAccount

The repository includes a complete BankAccount sample application demonstrating Event Sourcing patterns.

### Project Structure

```
src/bank-account/
├── domain/
│   ├── bank-account.aggregate.ts      # Event-sourced aggregate
│   ├── events/
│   │   ├── account-opened.event.ts
│   │   ├── money-deposited.event.ts
│   │   └── money-withdrawn.event.ts
│   └── value-objects/
│       └── money.vo.ts
├── application/
│   ├── commands/                      # Command handlers
│   │   ├── open-account.command.ts
│   │   ├── deposit-money.command.ts
│   │   └── withdraw-money.command.ts
│   └── queries/                       # Query handlers
│       └── get-account.query.ts
└── infrastructure/
    ├── bank-account.controller.ts     # REST API
    └── read-model/
        ├── bank-account.projector.ts  # Event projector
        └── schema/
            └── bank-account.schema.ts # Read model schema
```

### Domain Layer

**Aggregate Root:**

```typescript
import { DddAggregateRoot } from '@nestjslatam/ddd-lib';
import { AccountOpenedEvent, MoneyDepositedEvent } from './events';

export class BankAccount extends DddAggregateRoot<
  BankAccount,
  BankAccountProps
> {
  static open(
    id: string,
    holderName: string,
    initialAmount: number,
    currency: string,
  ): BankAccount {
    const account = new BankAccount({
      holderName,
      balance: Money.create(initialAmount, currency),
    });
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

  // Event handlers automatically called by the framework
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

**Domain Events:**

```typescript
import { DddDomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '@nestjslatam/es';

@EsAutowiredEvent
export class AccountOpenedEvent extends DddDomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly holderName: string,
    public readonly initialBalance: number,
    public readonly currency: string,
  ) {
    super({ aggregateId: accountId });
  }
}
```

> [!IMPORTANT]
> Use the `@EsAutowiredEvent` decorator on all domain events to enable automatic serialization/deserialization.

### Running the Sample Application

1. **Start MongoDB:**

```bash
docker-compose up -d
```

2. **Install dependencies:**

```bash
npm install
```

3. **Start the application:**

```bash
npm run start:dev
```

### API Endpoints

#### Open a new account

```bash
POST http://localhost:3000/bank-accounts
Content-Type: application/json

{
  "accountId": "acc-123",
  "holderName": "John Doe",
  "initialAmount": 1000,
  "currency": "USD"
}
```

#### Deposit money

```bash
POST http://localhost:3000/bank-accounts/acc-123/deposit
Content-Type: application/json

{
  "amount": 500
}
```

#### Withdraw money

```bash
POST http://localhost:3000/bank-accounts/acc-123/withdraw
Content-Type: application/json

{
  "amount": 200
}
```

#### Get account details

```bash
GET http://localhost:3000/bank-accounts/acc-123
```

**Response:**

```json
{
  "id": "acc-123",
  "holderName": "John Doe",
  "balance": 1300,
  "currency": "USD"
}
```

---

## 🎯 Usage Guide

### 1. Define Domain Events

```typescript
import { DddDomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '@nestjslatam/es';

@EsAutowiredEvent
export class UserRegisteredEvent extends DddDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {
    super({ aggregateId: userId });
  }
}
```

### 2. Create Event-Sourced Aggregates

```typescript
import { DddAggregateRoot } from '@nestjslatam/ddd-lib';

export class User extends DddAggregateRoot<User, UserProps> {
  static register(id: string, email: string): User {
    const user = new User({ email });
    user.apply(new UserRegisteredEvent(id, email));
    return user;
  }

  private onUserRegisteredEvent(event: UserRegisteredEvent): void {
    this.props.email = event.email;
  }
}
```

### 3. Persist and Rehydrate Aggregates

```typescript
import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventStorePublisher, AggregateRehydrator } from '@nestjslatam/es';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand>
{
  constructor(
    private readonly publisher: EventStorePublisher,
    private readonly rehydrator: AggregateRehydrator,
  ) {}

  async execute(command: RegisterUserCommand): Promise<void> {
    // Create new aggregate
    const user = User.register(command.userId, command.email);

    // Persist events
    await this.publisher.publish(user);
  }
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    private readonly publisher: EventStorePublisher,
    private readonly rehydrator: AggregateRehydrator,
  ) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    // Rehydrate aggregate from events
    const user = await this.rehydrator.rehydrate(User, command.userId);

    // Execute business logic
    user.updateEmail(command.newEmail);

    // Persist new events
    await this.publisher.publish(user);
  }
}
```

---

## 📖 API Reference

### EsModule.forRoot(options)

Configure the ES module with your preferred event store.

**Options:**

```typescript
// MongoDB configuration
interface EsMongoOptions {
  driver: 'mongo';
  mongoUrl: string;
}

// Custom configuration
interface EsCustomOptions {
  driver: 'custom';
  eventStoreClass: Type<AbstractEventStore>;
  snapshotStoreClass?: Type<AbstractSnapshotStore>;
}

type EsOptions = EsMongoOptions | EsCustomOptions;
```

### AbstractEventStore

Interface for implementing custom event stores.

```typescript
abstract class AbstractEventStore {
  abstract persist(
    eventOrEvents: ISerializable | ISerializable[],
  ): Promise<void>;
  abstract getEventsByStreamId(
    streamId: string,
    fromVersion?: number,
  ): Promise<ISerializable[]>;
}
```

### Key Decorators

- `@EsAutowiredEvent` - Register domain events for automatic serialization

### Core Services

- `EventStorePublisher` - Publish aggregate events to the event store
- `AggregateRehydrator` - Rebuild aggregates from event streams
- `DomainEventSerializer` - Serialize domain events to JSON
- `DomainEventDeserializer` - Deserialize JSON to domain events
- `UpcasterRegistry` - Register event upcasters for schema evolution

---

## 🔗 Dependencies

| Package                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `@nestjslatam/ddd-lib` | DDD primitives (Aggregates, Entities, Value Objects) |
| `@nestjs/cqrs`         | CQRS support (Commands, Queries, Events)             |
| `@nestjs/common`       | NestJS core framework                                |
| `@nestjs/mongoose`     | MongoDB integration (optional)                       |
| `mongoose`             | MongoDB ODM (optional)                               |
| `reflect-metadata`     | Decorator metadata support                           |

---

## 📄 License

Apache License 2.0

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

For issues and questions, please use the [GitHub Issues](https://github.com/nestjslatam/ddd-event-sourcing/issues) page.
