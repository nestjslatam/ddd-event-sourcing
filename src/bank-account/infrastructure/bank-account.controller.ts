import { Body, Controller, Post, Get, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { OpenAccountCommand, DepositMoneyCommand, WithdrawMoneyCommand } from '../application/commands';
import { OpenAccountDto, DepositMoneyDto, WithdrawMoneyDto } from './dtos'; // Assuming DTOs exist
import { GetAccountQuery } from '../application/queries';
import { BankAccountView } from './read-model/schema/bank-account.schema';

@Controller('bank-accounts')
export class BankAccountController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) { }

    @Post()
    async openAccount(@Body() dto: OpenAccountDto) {
        if (!dto.holderName) throw new BadRequestException('Holder name is required');
        /* ... validation ... */

        // In a real app, generate ID here or let the command do it?
        // The command expects an ID. Let's say the client provides it or we generate it.
        // For simplicity, let's assume DTO includes ID or we generate a UUID.
        // But OpenAccountCommand constructor expects (id, holderName, amount, currency).

        // We need to ensure we have an ID.
        const id = dto.accountId; // Assume DTO has it for now, or generate one.

        await this.commandBus.execute(
            new OpenAccountCommand(id, dto.holderName, dto.initialAmount, dto.currency),
        );
        return { id };
    }

    @Post(':id/deposit')
    async deposit(@Param('id') id: string, @Body() dto: DepositMoneyDto) {
        await this.commandBus.execute(new DepositMoneyCommand(id, dto.amount));
    }

    @Post(':id/withdraw')
    async withdraw(@Param('id') id: string, @Body() dto: WithdrawMoneyDto) {
        await this.commandBus.execute(new WithdrawMoneyCommand(id, dto.amount));
    }

    @Get(':id')
    async getAccount(@Param('id') id: string): Promise<BankAccountView> {
        const account = await this.queryBus.execute(new GetAccountQuery(id));
        if (!account) {
            throw new NotFoundException(`Account with id ${id} not found`);
        }
        return account;
    }
}
