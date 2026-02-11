import { CommandHandler, ICommandHandler, ICommand } from '@nestjs/cqrs';
import { BankAccount } from '../../domain/bank-account.aggregate';
import { EnhancedAggregateRehydrator } from '@nestjslatam/es';

export class WithdrawMoneyCommand implements ICommand {
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
  ) {}
}

@CommandHandler(WithdrawMoneyCommand)
export class WithdrawMoneyCommandHandler
  implements ICommandHandler<WithdrawMoneyCommand>
{
  constructor(
    // Using EnhancedAggregateRehydrator for automatic snapshot management
    private readonly rehydrator: EnhancedAggregateRehydrator,
  ) {}

  async execute(command: WithdrawMoneyCommand): Promise<void> {
    const { accountId, amount } = command;

    // Rehydrate aggregate (automatically manages snapshots)
    const account = await this.rehydrator.rehydrate(accountId, BankAccount);

    account.withdraw(amount);
    account.commit();
  }
}
