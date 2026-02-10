import { CommandHandler, ICommandHandler, ICommand } from '@nestjs/cqrs';
import { AggregateRehydrator } from '../../../../libs/es/src/es-aggregate-rehydrator';
import { BankAccount } from '../../domain/bank-account.aggregate';

export class DepositMoneyCommand implements ICommand {
    constructor(
        public readonly accountId: string,
        public readonly amount: number,
    ) { }
}

@CommandHandler(DepositMoneyCommand)
export class DepositMoneyCommandHandler implements ICommandHandler<DepositMoneyCommand> {
    constructor(
        private readonly rehydrator: AggregateRehydrator,
    ) { }

    async execute(command: DepositMoneyCommand): Promise<void> {
        const { accountId, amount } = command;

        const account = await this.rehydrator.rehydrate(accountId, BankAccount);

        account.deposit(amount);

        account.commit();
    }
}
