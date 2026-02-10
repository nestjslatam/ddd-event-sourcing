import { CommandHandler, ICommandHandler, ICommand } from '@nestjs/cqrs';
import { AggregateRehydrator } from '../../../../libs/es/src/es-aggregate-rehydrator';
import { BankAccount } from '../../domain/bank-account.aggregate';

export class WithdrawMoneyCommand implements ICommand {
    constructor(
        public readonly accountId: string,
        public readonly amount: number,
    ) { }
}

@CommandHandler(WithdrawMoneyCommand)
export class WithdrawMoneyCommandHandler implements ICommandHandler<WithdrawMoneyCommand> {
    constructor(
        private readonly rehydrator: AggregateRehydrator,
    ) { }

    async execute(command: WithdrawMoneyCommand): Promise<void> {
        const { accountId, amount } = command;

        const account = await this.rehydrator.rehydrate(accountId, BankAccount);

        account.withdraw(amount);

        account.commit();
    }
}
