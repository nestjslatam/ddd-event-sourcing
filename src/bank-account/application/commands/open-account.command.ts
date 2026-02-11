import {
  CommandHandler,
  ICommandHandler,
  ICommand,
  EventPublisher,
} from '@nestjs/cqrs';
import { BankAccount } from '../../domain/bank-account.aggregate';
// Ideally via alias like @libs/es or something if tsconfig maps it.
// Using relative path for robustness now.

export class OpenAccountCommand implements ICommand {
  constructor(
    public readonly accountId: string,
    public readonly holderName: string,
    public readonly initialAmount: number,
    public readonly currency: string,
  ) {}
}

@CommandHandler(OpenAccountCommand)
export class OpenAccountCommandHandler
  implements ICommandHandler<OpenAccountCommand>
{
  constructor(
    private readonly publisher: EventPublisher,
    // We don't need rehydrator here as we are creating NEW aggregate
    // But we need to merge context if we want generic support,
    // however EventStorePublisher handles publication.
    // Standard NestJS CQRS uses mergeObjectContext on a factory.
  ) {}

  async execute(command: OpenAccountCommand): Promise<void> {
    const { accountId, holderName, initialAmount, currency } = command;

    const account = BankAccount.open(
      accountId,
      holderName,
      initialAmount,
      currency,
    );

    // Commit events
    // Since BankAccount extends DddAggregateRoot which extends AggregateRoot (CQRS),
    // it has a 'commit()' method but it needs an event publisher set OR we can manually publish.
    // The library setup (libs/es) aims to be compatible.
    // EventStorePublisher implements IEventPublisher.

    // We need to use 'publisher.mergeObjectContext' or manual publishing?
    // Reviewing EventStorePublisher: it implements IEventPublisher { publish, publishAll }
    // It does NOT implement mergeObjectContext/mergeClassContext which are on EventPublisher (NestJS CQRS).

    // WAIT. If EventStorePublisher implements IEventPublisher, it's meant to be replaced or used BY AggregateRoot?
    // AggregateRoot.commit() calls this.publish(event).
    // And 'this[PUBLISHER]' is set via 'mergeObjectContext'.

    // So we should inject standard 'EventPublisher' (from CQRS) IF we registered EventStorePublisher AS the publisher for it?
    // NestJS CQRS EventPublisher wraps the 'IEventPublisher'.
    // In our ES module, did we override the IEventPublisher provider?
    // In es-eventstore.publisher.ts:
    // "onApplicationBootstrap() { this.eventBus.publisher = this; }"
    // This sets the publisher ON THE EVENT BUS.
    // AggregateRoot.commit() -> this.publish() -> (if autoCommit) -> this.eventBus.publish(event)??
    // No. AggregateRoot.commit() -> calls uncommitted events -> for each event -> this[PUBLISHER].publish(event)

    // So 'mergeObjectContext' injects the publisher into the aggregate.
    // The publisher injected is the 'EventPublisher' service from CQRS.
    // EventPublisher.publish() -> calls 'this.eventBus.publish()'.

    // Our EventStorePublisher:
    // "implements IEventPublisher" -> publish(event) -> eventStore.persist(event).
    // And "this.eventBus.publisher = this".
    // This means existing EventBus will use OUR publisher to publish events?
    // No. EventBus has a 'publisher' property which is IEventPublisher.
    // If we set it, then when EventBus.publish() is called, it calls our publisher.

    // But AggregateRoot.commit uses the 'EventPublisher' service to get the publisher?
    // Let's verify standard flow.
    // 1. Handler: publisher.mergeObjectContext(aggregate)
    // 2. aggregate.commit()
    // 3. AggregateRoot iterates uncommitted events.
    // 4. Calls this.publish(event).
    // 5. this.publish calls this.context.publish(event) ? No.
    // NestJS AggregateRoot source:
    // commit() { this.getUncommittedEvents().forEach(event => this.publish(event)); ... }
    // publish(event) { } (Empty in base?? No, it's emitted via Stream? No)
    // Actually, mergeObjectContext returns an object where 'commit' is wrapped or 'publish' is wired.

    // Corrections:
    // EventPublisher (CQRS) has mergeObjectContext.
    // it returns an aggregate where 'publish' method effectively calls 'eventBus.publish'.
    // And since we replaced eventBus.publisher with EventStorePublisher...
    // flow: aggregate.commit() -> eventBus.publish() -> EventStorePublisher.publish() -> Mongo.

    // So we just need to use standard EventPublisher here!

    const accountWithContext = this.publisher.mergeObjectContext(account);
    // Wait, EventStorePublisher does NOT have mergeObjectContext.
    // We need strict 'EventPublisher' from @nestjs/cqrs.
    // BUT EventStorePublisher REPLACES the internal publisher of EventBus.

    // Let's inject standard EventPublisher.

    accountWithContext.commit(); // Events go to Mongo via EventStorePublisher logic
  }
}
