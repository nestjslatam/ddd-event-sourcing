import { CommandHandler, ICommandHandler, ICommand } from '@nestjs/cqrs';
import { BankAccount } from '../../domain/bank-account.aggregate';
import { EnhancedAggregateRehydrator } from '@nestjslatam/es';

export class DepositMoneyCommand implements ICommand {
    constructor(
        public readonly accountId: string,
        public readonly amount: number,
    ) { }
}

@CommandHandler(DepositMoneyCommand)
export class DepositMoneyCommandHandler implements ICommandHandler<DepositMoneyCommand> {
    constructor(
        // Using EnhancedAggregateRehydrator for automatic snapshot management
        private readonly rehydrator: EnhancedAggregateRehydrator,
    ) { }

    async execute(command: DepositMoneyCommand): Promise<void> {
        const { accountId, amount } = command;

        // Rehydrate aggregate (automatically manages snapshots)
        const account = await this.rehydrator.rehydrate(accountId, BankAccount);

        account.deposit(amount);
        account.commit();
    }
}
