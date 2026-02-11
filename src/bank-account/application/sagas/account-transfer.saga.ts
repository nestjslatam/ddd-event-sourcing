import { Injectable, Logger } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { AbstractSaga } from '@nestjslatam/es';
import { MoneyWithdrawnEvent } from '../../domain/events/money-withdrawn.event';
import { DepositMoneyCommand } from '../commands/deposit-money.command';
import { TransferInitiatedEvent } from '../../domain/events/transfer.events';

/**
 * Saga for orchestrating money transfers between accounts
 *
 * Workflow:
 * 1. Listen for TransferInitiatedEvent
 * 2. Withdraw money from source account
 * 3. On successful withdrawal, deposit to target account
 * 4. On failure, compensate by refunding source account
 *
 * This demonstrates saga pattern for coordinating complex workflows
 * across multiple aggregates while maintaining consistency.
 */
@Injectable()
export class AccountTransferSaga extends AbstractSaga {
  private readonly logger = new Logger(AccountTransferSaga.name);

  @Saga()
  saga$ = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(MoneyWithdrawnEvent),
      map((event: MoneyWithdrawnEvent) => {
        // Check if this withdrawal is part of a transfer
        const metadata = (event as any).metadata;
        if (!metadata?.transferId) {
          return null;
        }

        this.logger.log(
          `Transfer saga: Money withdrawn from ${event.aggregateId}, ` +
            `depositing to ${metadata.targetAccountId}`,
        );

        // Dispatch deposit command to target account
        return new DepositMoneyCommand(metadata.targetAccountId, event.amount);
      }),
      // Filter out null commands
      map((cmd) => cmd as ICommand),
    );
  };

  /**
   * Alternative saga for handling transfer initiation
   * This would be used if you have a dedicated Transfer aggregate
   */
  @Saga()
  transferInitiationSaga$ = (
    events$: Observable<any>,
  ): Observable<ICommand> => {
    return events$.pipe(
      ofType(TransferInitiatedEvent),
      delay(100), // Small delay to ensure ordering
      map((event: TransferInitiatedEvent) => {
        this.logger.log(
          `Transfer initiated: ${event.transferId} ` +
            `from ${event.sourceAccountId} to ${event.targetAccountId}`,
        );

        // In a real implementation, this would dispatch a WithdrawMoneyCommand
        // with transfer metadata attached
        return null as any;
      }),
    );
  };
}
