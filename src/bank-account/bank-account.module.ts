import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EsModule } from '../../libs/es/src/es.module'; // Adjust import
import { BankAccountController } from './infrastructure/bank-account.controller';
import {
    OpenAccountCommandHandler,
    DepositMoneyCommandHandler,
    WithdrawMoneyCommandHandler,
} from './application/commands';

import { MongooseModule } from '@nestjs/mongoose';
import { BankAccountView, BankAccountViewSchema } from './infrastructure/read-model/schema/bank-account.schema';
import { BankAccountProjector } from './infrastructure/read-model/bank-account.projector';
import { GetAccountQueryHandler } from './application/queries';

@Module({
    imports: [
        CqrsModule,
        EsModule,
        MongooseModule.forFeature([{ name: BankAccountView.name, schema: BankAccountViewSchema }]),
    ],
    controllers: [BankAccountController],
    providers: [
        // Command Handlers
        OpenAccountCommandHandler,
        DepositMoneyCommandHandler,
        WithdrawMoneyCommandHandler,

        // Query Handlers
        GetAccountQueryHandler,

        // Projectors
        BankAccountProjector,
    ],
})
export class BankAccountModule { }
