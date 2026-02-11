import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import {
    EsModule,
    EventCountSnapshotStrategy,
    EnhancedAggregateRehydrator,
    ProcessedEventTracker,
    SagaRegistry,
    MaterializedViewManager,
} from '@nestjslatam/es';
import { BankAccountController } from './infrastructure/bank-account.controller';
import {
    OpenAccountCommandHandler,
    DepositMoneyCommandHandler,
    WithdrawMoneyCommandHandler,
} from './application/commands';
import { BankAccountView, BankAccountViewSchema } from './infrastructure/read-model/schema/bank-account.schema';
import { BankAccountProjectors } from './infrastructure/read-model/bank-account.projector';
import { GetAccountQueryHandler } from './application/queries';
import { ProcessedEventSchema } from '../../libs/es/src/es-store/schemas/processed-event.schema';
import { AccountTransferSaga } from './application/sagas/account-transfer.saga';
import { AccountViewService } from './infrastructure/read-model/account-view.service';

@Module({
    imports: [
        CqrsModule,
        EsModule,
        MongooseModule.forFeature([
            { name: BankAccountView.name, schema: BankAccountViewSchema },
            { name: 'ProcessedEvent', schema: ProcessedEventSchema }, // For idempotent handlers
        ]),
    ],
    controllers: [BankAccountController],
    providers: [
        // Command Handlers
        OpenAccountCommandHandler,
        DepositMoneyCommandHandler,
        WithdrawMoneyCommandHandler,

        // Query Handlers
        GetAccountQueryHandler,

        // Projectors (Idempotent - Phase 1 feature)
        ...BankAccountProjectors,

        // Phase 1 Features
        {
            provide: 'SnapshotStrategy',
            useValue: new EventCountSnapshotStrategy(10), // Snapshot every 10 events
        },
        EnhancedAggregateRehydrator,
        ProcessedEventTracker,

        // Phase 2 Features
        SagaRegistry,
        MaterializedViewManager,
        AccountViewService,
        AccountTransferSaga,
    ],
    exports: [
        EnhancedAggregateRehydrator,
        ProcessedEventTracker,
        SagaRegistry,
        MaterializedViewManager,
    ],
})
export class BankAccountModule {
    constructor(
        private readonly sagaRegistry: SagaRegistry,
        private readonly transferSaga: AccountTransferSaga,
    ) {
        // Register sagas (Phase 2 feature)
        this.sagaRegistry.register('account-transfer', this.transferSaga);
    }
}
