# Phase 1 CQRS Improvements - Implementation Guide

## Overview

This guide documents the Phase 1 CQRS improvements implemented in ES-Lib, including event versioning, snapshot strategies, and idempotent event handlers.

---

## 🎯 Features Implemented

### 1. Event Versioning Infrastructure

#### VersionedEvent Base Class
Location: `libs/es/src/es-core/versioned-event.base.ts`

```typescript
import { VersionedEvent } from '@nestjslatam/es';

export class AccountOpenedEventV2 extends VersionedEvent {
  readonly schemaVersion = 2;
  readonly eventType = 'AccountOpened';

  constructor(
    aggregateId: string,
    public readonly holderName: string,
    public readonly balance: number,
    public readonly currency: string = 'USD'
  ) {
    super({ aggregateId, aggregateType: 'BankAccount', aggregateVersion: 1, eventVersion: 2, timestamp: Date.now() } as any);
  }
}
```

#### EnhancedUpcasterRegistry
Location: `libs/es/src/es-core/enhanced-upcaster.registry.ts`

Provides automatic version tracking and sequential upcasting:

```typescript
import { EnhancedUpcasterRegistry, IEventUpcaster } from '@nestjslatam/es';

// Register an upcaster
registry.register('AccountOpened', 1, 2, {
  upcast: (event) => ({
    ...event,
    attributes: {
      ...event.attributes,
      currency: 'USD' // Add default currency
    },
    eventVersion: 2
  })
});

// Automatically upcast to latest version
const upcastedEvent = registry.upcast(oldEvent);
```

---

### 2. Snapshot Strategies

#### Available Strategies
Location: `libs/es/src/es-core/snapshot-strategy.interface.ts`

**EventCountSnapshotStrategy**: Snapshot every N events
```typescript
import { EventCountSnapshotStrategy } from '@nestjslatam/es';

const strategy = new EventCountSnapshotStrategy(10); // Snapshot every 10 events
```

**TimeBasedSnapshotStrategy**: Snapshot based on time intervals
```typescript
import { TimeBasedSnapshotStrategy } from '@nestjslatam/es';

const strategy = new TimeBasedSnapshotStrategy(
  3600000, // 1 hour in milliseconds
  5 // Minimum 5 events before first snapshot
);
```

**CompositeSnapshotStrategy**: Combine multiple strategies
```typescript
import { CompositeSnapshotStrategy, EventCountSnapshotStrategy, TimeBasedSnapshotStrategy } from '@nestjslatam/es';

const strategy = new CompositeSnapshotStrategy([
  new EventCountSnapshotStrategy(10),
  new TimeBasedSnapshotStrategy(3600000)
]);
```

#### EnhancedAggregateRehydrator
Location: `libs/es/src/es-enhanced-aggregate-rehydrator.ts`

Automatically manages snapshots based on configured strategy:

```typescript
import { EnhancedAggregateRehydrator, EventCountSnapshotStrategy } from '@nestjslatam/es';

@Module({
  providers: [
    {
      provide: 'SnapshotStrategy',
      useValue: new EventCountSnapshotStrategy(10)
    },
    EnhancedAggregateRehydrator
  ]
})
export class MyModule {}
```

---

### 3. Idempotent Event Handlers

#### ProcessedEventTracker
Location: `libs/es/src/es-core/processed-event-tracker.service.ts`

Tracks processed events to prevent duplicates:

```typescript
import { ProcessedEventTracker } from '@nestjslatam/es';

// Check if event was processed
const wasProcessed = await tracker.isProcessed(eventId, 'MyHandler');

// Mark event as processed
await tracker.markProcessed(eventId, 'MyHandler');

// Cleanup old records
await tracker.cleanup(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
```

#### IdempotentEventHandler Decorator
Location: `libs/es/src/es-decorators/idempotent-event-handler.decorator.ts`

Automatically prevents duplicate event processing:

```typescript
import { IdempotentEventHandler } from '@nestjslatam/es';
import { ProcessedEventTracker } from '@nestjslatam/es';

@IdempotentEventHandler(MoneyDepositedEvent)
export class MoneyDepositedHandler implements IEventHandler<MoneyDepositedEvent> {
  constructor(
    private readonly repository: Model<BankAccountView>,
    private readonly processedEvents: ProcessedEventTracker // Required!
  ) {}

  async handle(event: MoneyDepositedEvent): Promise<void> {
    // This logic will only execute once per event
    // Duplicate detection is automatic
    await this.repository.findByIdAndUpdate(
      event.aggregateId,
      { $inc: { balance: event.amount } }
    );
  }
}
```

---

## 📦 Module Configuration

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsModule, EventCountSnapshotStrategy, EnhancedAggregateRehydrator, ProcessedEventTracker } from '@nestjslatam/es';
import { ProcessedEventSchema } from '@nestjslatam/es/es-store/schemas/processed-event.schema';

@Module({
  imports: [
    // Configure ES Module
    EsModule.forRoot({
      driver: 'mongo',
      mongoUrl: 'mongodb://localhost:27017/event-store',
    }),

    // Register ProcessedEvent schema for idempotency
    MongooseModule.forFeature([
      { name: 'ProcessedEvent', schema: ProcessedEventSchema }
    ]),
  ],
  providers: [
    // Snapshot strategy
    {
      provide: 'SnapshotStrategy',
      useValue: new EventCountSnapshotStrategy(10)
    },

    // Enhanced rehydrator
    EnhancedAggregateRehydrator,

    // Processed event tracker
    ProcessedEventTracker,
  ],
  exports: [
    EnhancedAggregateRehydrator,
    ProcessedEventTracker,
  ],
})
export class MyModule {}
```

---

## 🔄 Migration Guide

### For Existing Applications

#### 1. Event Versioning (Optional)

If you want to use versioned events:

```typescript
// Before
export class AccountOpenedEvent extends DomainEvent {
  constructor(aggregateId: string, public readonly holderName: string) {
    super({ aggregateId, aggregateType: 'BankAccount', aggregateVersion: 1, eventVersion: 1, timestamp: Date.now() } as any);
  }
}

// After
import { VersionedEvent } from '@nestjslatam/es';

export class AccountOpenedEvent extends VersionedEvent {
  readonly schemaVersion = 1;
  readonly eventType = 'AccountOpened';

  constructor(aggregateId: string, public readonly holderName: string) {
    super({ aggregateId, aggregateType: 'BankAccount', aggregateVersion: 1, eventVersion: 1, timestamp: Date.now() } as any);
  }
}
```

#### 2. Snapshot Strategies (Recommended)

Replace `AggregateRehydrator` with `EnhancedAggregateRehydrator`:

```typescript
// Before
constructor(private readonly rehydrator: AggregateRehydrator) {}

// After
constructor(private readonly rehydrator: EnhancedAggregateRehydrator) {}

// Usage remains the same
const aggregate = await this.rehydrator.rehydrate(id, BankAccount);
```

#### 3. Idempotent Handlers (Recommended)

Update event handlers to use the decorator:

```typescript
// Before
@EventsHandler(MoneyDepositedEvent)
export class MoneyDepositedHandler implements IEventHandler<MoneyDepositedEvent> {
  async handle(event: MoneyDepositedEvent): Promise<void> {
    // Handler logic
  }
}

// After
@IdempotentEventHandler(MoneyDepositedEvent)
export class MoneyDepositedHandler implements IEventHandler<MoneyDepositedEvent> {
  constructor(
    private readonly processedEvents: ProcessedEventTracker // Add this!
  ) {}

  async handle(event: MoneyDepositedEvent): Promise<void> {
    // Same handler logic - idempotency is automatic
  }
}
```

---

## ✅ Benefits

### Event Versioning
- ✅ Safe schema evolution
- ✅ Backward compatibility
- ✅ Clear migration paths
- ✅ Explicit version tracking

### Snapshot Strategies
- ✅ Configurable performance optimization
- ✅ Automatic snapshot management
- ✅ Reduced event replay overhead
- ✅ Flexible strategies (count, time, composite)

### Idempotent Handlers
- ✅ Prevent duplicate processing
- ✅ Automatic duplicate detection
- ✅ Minimal code changes
- ✅ Safe event replays

---

## 🧪 Testing

All Phase 1 features are fully backward compatible. Existing tests should continue to pass without modification.

To test the new features:

```bash
npm test
npm run build
```

---

## 📚 API Reference

### Exports

All Phase 1 features are exported from `@nestjslatam/es`:

```typescript
import {
  // Event Versioning
  VersionedEvent,
  EnhancedUpcasterRegistry,
  IEventUpcaster,

  // Snapshot Strategies
  SnapshotStrategy,
  EventCountSnapshotStrategy,
  TimeBasedSnapshotStrategy,
  CompositeSnapshotStrategy,
  EnhancedAggregateRehydrator,

  // Idempotent Handlers
  ProcessedEventTracker,
  IdempotentEventHandler,
} from '@nestjslatam/es';
```

---

## 🚀 Next Steps

Phase 1 is complete! Consider implementing:

- **Phase 2**: Sagas, Materialized Views, Event Batching
- **Phase 3**: Testing Utilities, Debugging Tools, Performance Monitoring

See `cqrs_improvements.md` for the full roadmap.
