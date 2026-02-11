import { Injectable } from '@nestjs/common';
import { ICommand } from '@nestjs/cqrs';
import { Observable } from 'rxjs';

/**
 * Base class for implementing sagas in Event Sourcing
 *
 * Sagas listen to domain events and dispatch commands in response,
 * enabling orchestration of complex workflows across multiple aggregates.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class AccountTransferSaga extends AbstractSaga {
 *   @Saga()
 *   transferSaga = (events$: Observable<any>): Observable<ICommand> => {
 *     return events$.pipe(
 *       ofType(MoneyWithdrawnEvent),
 *       filter(event => event.metadata?.transferId),
 *       map(event => new DepositMoneyCommand(
 *         event.metadata.targetAccountId,
 *         event.amount
 *       ))
 *     );
 *   };
 * }
 * ```
 */
@Injectable()
export abstract class AbstractSaga {
  /**
   * Define saga reactions to events
   * Must be decorated with @Saga() from @nestjs/cqrs
   * Returns an Observable of commands to execute
   */
  abstract saga$: (events$: Observable<any>) => Observable<ICommand>;
}
