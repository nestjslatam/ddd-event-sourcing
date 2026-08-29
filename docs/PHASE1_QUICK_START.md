# Phase 1 CQRS Improvements - Quick Reference

## 🎯 New Features

### 1. Event Versioning

Safe schema evolution with automatic upcasting.

### 2. Snapshot Strategies

Automatic snapshot management for performance optimization.

### 3. Idempotent Event Handlers

Automatic duplicate prevention for projectors.

---

## 📖 Quick Start

### Event Versioning

```typescript
import { VersionedEvent, EnhancedUpcasterRegistry } from '@nestjslatam/ddd-es-lib';

// Version 1
export class AccountOpenedEventV1 extends VersionedEvent {
  readonly schemaVersion = 1;
  readonly eventType = 'AccountOpened';

  constructor(
    aggregateId: string,
    public readonly holderName: string,
    public readonly balance: number,
  ) {
    super({...});
  }
}

// Version 2 - Added currency
export class AccountOpenedEventV2 extends VersionedEvent {
  readonly schemaVersion = 2;
  readonly eventType = 'AccountOpened';

  constructor(
    aggregateId: string,
    public readonly holderName: string,
    public readonly balance: number,
    public readonly currency: string = 'USD',
  ) {
    super({...});
  }
}

// Register upcaster
registry.register('AccountOpened', 1, 2, {
  upcast: (event) => ({
    ...event,
    attributes: { ...event.attributes, currency: 'USD' },
    eventVersion: 2,
  }),
});
```

### Snapshot Strategies

```typescript
import {
  EventCountSnapshotStrategy,
  TimeBasedSnapshotStrategy,
  CompositeSnapshotStrategy,
  EnhancedAggregateRehydrator,
} from '@nestjslatam/ddd-es-lib';

@Module({
  providers: [
    // Snapshot every 10 events
    {
      provide: 'SnapshotStrategy',
      useValue: new EventCountSnapshotStrategy(10),
    },
    EnhancedAggregateRehydrator,
  ],
})
export class MyModule {}

// In command handler
@CommandHandler(DepositMoneyCommand)
export class DepositMoneyHandler {
  constructor(private readonly rehydrator: EnhancedAggregateRehydrator) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    // Automatically manages snapshots!
    const account = await this.rehydrator.rehydrate(
      command.accountId,
      BankAccount,
    );
    account.deposit(command.amount);
    account.commit();
  }
}
```

**Performance**: 10x-100x faster rehydration with snapshots!

### Idempotent Event Handlers

```typescript
import {
  IdempotentEventHandler,
  ProcessedEventTracker,
} from '@nestjslatam/ddd-es-lib';
import { ProcessedEventSchema } from '@nestjslatam/ddd-es-lib';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ProcessedEvent', schema: ProcessedEventSchema },
    ]),
  ],
  providers: [ProcessedEventTracker],
})
export class MyModule {}

@IdempotentEventHandler(MoneyDepositedEvent)
export class MoneyDepositedProjector {
  constructor(
    private readonly repository: Model<BankAccountView>,
    private readonly processedEvents: ProcessedEventTracker, // Required!
  ) {}

  async handle(event: MoneyDepositedEvent): Promise<void> {
    // Idempotency is automatic - safe to replay!
    await this.repository.findByIdAndUpdate(event.aggregateId, {
      $inc: { balance: event.amount },
    });
  }
}
```

---

## 📚 Full Documentation

- [PHASE1_IMPLEMENTATION.md](./PHASE1_IMPLEMENTATION.md) - Complete API reference
- [PHASE1_EXAMPLES.md](./PHASE1_EXAMPLES.md) - Practical examples with before/after
- [Main README.md](../README.md) - Full library documentation

---

## 🧪 Testing

```bash
# Run Phase 1 tests
npm test -- --testPathPattern="versioned-event|snapshot-strategy|processed-event-tracker"

# All tests: 35 passing
```

---

## 🚀 Migration Guide

### From AggregateRehydrator to EnhancedAggregateRehydrator

```typescript
// Before
constructor(private readonly rehydrator: AggregateRehydrator) {}

// After
constructor(private readonly rehydrator: EnhancedAggregateRehydrator) {}
```

### From Regular to Idempotent Handlers

```typescript
// Before
@EventsHandler(MoneyDepositedEvent)
export class MoneyDepositedHandler {
  async handle(event: MoneyDepositedEvent) {
    // Not idempotent!
  }
}

// After
@IdempotentEventHandler(MoneyDepositedEvent)
export class MoneyDepositedHandler {
  constructor(private readonly processedEvents: ProcessedEventTracker) {}

  async handle(event: MoneyDepositedEvent) {
    // Idempotency automatic!
  }
}
```

---

## ✨ Sample Application

Check `src/bank-account/` for complete working examples of all Phase 1 features!
