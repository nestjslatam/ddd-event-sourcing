import { CommandHandler, ICommandHandler, ICommand } from '@nestjs/cqrs';
import { BankAccount } from '../../domain/bank-account.aggregate';
import { EnhancedAggregateRehydrator } from '@nestjslatam/ddd-es-lib';
import { EventStorePublisher } from '@nestjslatam/ddd-es-lib';

export class DepositMoneyCommand implements ICommand {
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
  ) {}
}

@CommandHandler(DepositMoneyCommand)
export class DepositMoneyCommandHandler implements ICommandHandler<DepositMoneyCommand> {
  constructor(
    // Using EnhancedAggregateRehydrator for automatic snapshot management
    private readonly rehydrator: EnhancedAggregateRehydrator,
    private readonly eventStorePublisher: EventStorePublisher,
  ) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    const { accountId, amount } = command;

    // Rehydrate aggregate (automatically manages snapshots)
    const account = await this.rehydrator.rehydrate(accountId, BankAccount);

    account.deposit(amount);
    account.commit();

    // commit() is synchronous and does not await the publisher, so without
    // this the handler returns while the events are still being written --
    // and the next command, reading the aggregate back, finds nothing. That
    // failed about one request in five.
    await this.eventStorePublisher.flush();
  }
}
