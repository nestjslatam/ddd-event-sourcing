# @nestjslatam/es

**Event Sourcing Library for NestJS** - A powerful extension for [@nestjslatam/ddd-lib](https://www.npmjs.com/package/@nestjslatam/ddd-lib) that adds comprehensive Event Sourcing capabilities to your NestJS applications.

[![npm version](https://badge.fury.io/js/%40nestjslatam%2Fes-lib.svg)](https://www.npmjs.com/package/@nestjslatam/es-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Features

- ✅ **Event Sourcing** - Store application state as immutable event streams
- ✅ **DDD Integration** - Built on top of DDD-Lib with full support for Aggregates
- ✅ **CQRS Support** - Seamless integration with @nestjs/cqrs
- ✅ **Pluggable Repositories** - MongoDB, In-Memory, or custom implementations
- ✅ **Type-Safe Serialization** - Automatic event serialization/deserialization
- ✅ **Aggregate Rehydration** - Rebuild aggregate state from events
- ✅ **Event Upcasting** - Handle event schema evolution
- ✅ **Snapshot Support** - Optional snapshots for performance

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

## 🏃 Quick Start

### 1. Configure the Module

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

### 2. Define Domain Events

```typescript
import { DddDomainEvent } from '@nestjslatam/ddd-lib';
import { EsAutowiredEvent } from '@nestjslatam/es';

@EsAutowiredEvent
export class AccountOpenedEvent extends DddDomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly holderName: string,
    public readonly initialBalance: number,
  ) {
    super({ aggregateId: accountId });
  }
}
```

### 3. Create Event-Sourced Aggregates

```typescript
import { DddAggregateRoot } from '@nestjslatam/ddd-lib';

export class BankAccount extends DddAggregateRoot<BankAccount, BankAccountProps> {
  static open(id: string, holderName: string, initialBalance: number): BankAccount {
    const account = new BankAccount({ holderName, balance: initialBalance });
    account.apply(new AccountOpenedEvent(id, holderName, initialBalance));
    return account;
  }

  deposit(amount: number): void {
    this.apply(new MoneyDepositedEvent(this.id.toString(), amount));
  }

  // Event handlers (called automatically)
  private onAccountOpenedEvent(event: AccountOpenedEvent): void {
    this.props.holderName = event.holderName;
    this.props.balance = event.initialBalance;
  }

  private onMoneyDepositedEvent(event: MoneyDepositedEvent): void {
    this.props.balance += event.amount;
  }
}
```

### 4. Use in Command Handlers

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventStorePublisher, AggregateRehydrator } from '@nestjslatam/es';

@CommandHandler(OpenAccountCommand)
export class OpenAccountHandler implements ICommandHandler<OpenAccountCommand> {
  constructor(
    private readonly publisher: EventStorePublisher,
    private readonly rehydrator: AggregateRehydrator,
  ) {}

  async execute(command: OpenAccountCommand): Promise<void> {
    // Create new aggregate
    const account = BankAccount.open(
      command.accountId,
      command.holderName,
      command.initialBalance
    );
    
    // Persist events to event store
    await this.publisher.publish(account);
  }
}

@CommandHandler(DepositMoneyCommand)
export class DepositMoneyHandler implements ICommandHandler<DepositMoneyCommand> {
  constructor(
    private readonly publisher: EventStorePublisher,
    private readonly rehydrator: AggregateRehydrator,
  ) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    // Rehydrate aggregate from event stream
    const account = await this.rehydrator.rehydrate(BankAccount, command.accountId);
    
    // Execute business logic
    account.deposit(command.amount);
    
    // Persist new events
    await this.publisher.publish(account);
  }
}
```

---

## 🔧 Configuration Options

### MongoDB Repository (Production)

```typescript
EsModule.forRoot({
  driver: 'mongo',
  mongoUrl: 'mongodb://localhost:27017/event-store',
})
```

**Features:**
- Transaction support
- Optimistic concurrency control
- Event versioning
- Snapshot support

### In-Memory Repository (Testing)

```typescript
import { InMemoryEventStore } from '@nestjslatam/es';

EsModule.forRoot({
  driver: 'custom',
  eventStoreClass: InMemoryEventStore,
})
```

**Features:**
- No external dependencies
- Fast for unit testing
- Simple setup

### Custom Repository

Implement your own event store:

```typescript
import { Injectable } from '@nestjs/common';
import { AbstractEventStore, DomainEventDeserializer } from '@nestjslatam/es';
import { ISerializable } from '@nestjslatam/ddd-lib';

@Injectable()
export class MyCustomEventStore implements AbstractEventStore {
  constructor(
    private readonly eventDeserializer: DomainEventDeserializer,
  ) {}

  async persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void> {
    // Your implementation
  }

  async getEventsByStreamId(streamId: string, fromVersion?: number): Promise<ISerializable[]> {
    // Your implementation
  }
}
```

Configure it:

```typescript
EsModule.forRoot({
  driver: 'custom',
  eventStoreClass: MyCustomEventStore,
  snapshotStoreClass: MyCustomSnapshotStore, // Optional
})
```

---

## 📖 API Reference

### Core Services

#### `EventStorePublisher`

Publishes aggregate events to the event store and event bus.

```typescript
await this.publisher.publish(aggregate);
```

#### `AggregateRehydrator`

Rebuilds aggregates from their event streams.

```typescript
const aggregate = await this.rehydrator.rehydrate(AggregateClass, aggregateId);
```

#### `DomainEventSerializer`

Serializes domain events to JSON.

```typescript
const json = this.serializer.serialize(event);
```

#### `DomainEventDeserializer`

Deserializes JSON back to domain events.

```typescript
const event = this.deserializer.deserialize(infraEvent);
```

#### `UpcasterRegistry`

Manages event upcasters for schema evolution.

```typescript
this.upcasterRegistry.register(eventName, upcaster);
```

### Decorators

#### `@EsAutowiredEvent`

Registers domain events for automatic serialization/deserialization.

```typescript
@EsAutowiredEvent
export class MyEvent extends DddDomainEvent {
  // ...
}
```

### Interfaces

#### `AbstractEventStore`

```typescript
abstract class AbstractEventStore {
  abstract persist(eventOrEvents: ISerializable | ISerializable[]): Promise<void>;
  abstract getEventsByStreamId(streamId: string, fromVersion?: number): Promise<ISerializable[]>;
}
```

#### `AbstractSnapshotStore`

```typescript
abstract class AbstractSnapshotStore {
  abstract saveSnapshot(streamId: string, snapshot: any, version: number): Promise<void>;
  abstract getSnapshot(streamId: string): Promise<any>;
}
```

#### `EsOptions`

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

---

## 🏗️ Architecture

### Event Flow

```
Command → Command Handler → Aggregate → Domain Events → Event Store → Event Bus → Projectors
```

### Core Components

1. **Event Store** - Persists events with optimistic concurrency control
2. **Aggregate Rehydrator** - Rebuilds aggregate state from events
3. **Event Serializer/Deserializer** - Handles type-safe serialization
4. **Event Publisher** - Publishes events to NestJS event bus
5. **Upcaster Registry** - Manages event schema migrations

---

## 🎯 Best Practices

### 1. Always Use the Decorator

```typescript
@EsAutowiredEvent  // ✅ Required for serialization
export class MyEvent extends DddDomainEvent {
  // ...
}
```

### 2. Keep Events Immutable

```typescript
@EsAutowiredEvent
export class AccountOpenedEvent extends DddDomainEvent {
  constructor(
    public readonly accountId: string,  // ✅ readonly
    public readonly holderName: string,
  ) {
    super({ aggregateId: accountId });
  }
}
```

### 3. Use Factory Methods

```typescript
export class BankAccount extends DddAggregateRoot<BankAccount, BankAccountProps> {
  static open(id: string, holderName: string): BankAccount {  // ✅ Factory method
    const account = new BankAccount({ holderName });
    account.apply(new AccountOpenedEvent(id, holderName));
    return account;
  }
}
```

### 4. Handle Events with Private Methods

```typescript
export class BankAccount extends DddAggregateRoot<BankAccount, BankAccountProps> {
  // Event handler naming convention: on{EventName}
  private onAccountOpenedEvent(event: AccountOpenedEvent): void {  // ✅ Private handler
    this.props.holderName = event.holderName;
  }
}
```

---

## 🧪 Testing

### Unit Testing with In-Memory Store

```typescript
import { Test } from '@nestjs/testing';
import { EsModule, InMemoryEventStore } from '@nestjslatam/es';

describe('BankAccount', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EsModule.forRoot({
          driver: 'custom',
          eventStoreClass: InMemoryEventStore,
        }),
      ],
      providers: [OpenAccountHandler, DepositMoneyHandler],
    }).compile();
  });

  it('should open account', async () => {
    const handler = module.get(OpenAccountHandler);
    await handler.execute(new OpenAccountCommand('acc-1', 'John', 1000));
    // assertions...
  });
});
```

---

## 📚 Examples

See the [sample BankAccount application](https://github.com/nestjslatam/ddd-event-sourcing) for a complete working example demonstrating:

- Event-sourced aggregates
- Command handlers
- Query handlers
- Event projectors
- Read models with CQRS
- REST API integration

---

## 🔗 Related Libraries

- [@nestjslatam/ddd-lib](https://www.npmjs.com/package/@nestjslatam/ddd-lib) - DDD primitives for NestJS
- [@nestjs/cqrs](https://www.npmjs.com/package/@nestjs/cqrs) - CQRS module for NestJS

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/nestjslatam/ddd-event-sourcing/issues)
- **Website**: [nestjslatam.org](http://nestjslatam.org/)
- **Author**: Alberto Arroyo Raygada

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!
