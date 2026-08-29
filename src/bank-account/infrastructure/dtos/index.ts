import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

/**
 * Transport contracts for the bank account endpoints.
 *
 * The `@IsUUID()` is the one that earns its place. `BankAccount.open` passes
 * the id straight to `IdValueObject.load`, which refuses anything that is not
 * a UUID -- so `'acc-123'` used to surface as an `InvalidFormatException`
 * thrown from deep inside the aggregate, with nothing at the edge to say the
 * format was the problem. It is a 400 naming the field now.
 *
 * No version is specified because `@nestjslatam/ddd-lib` accepts any RFC 4122
 * version. It is worth stating both ways round: pinning `'4'` here would
 * reject ids the library would have taken, and that mismatch is precisely the
 * kind of thing that makes a sample teach the wrong lesson.
 *
 * The amounts carry `@Min(0.01)`; whether a withdrawal is affordable is the
 * aggregate's business, not the transport's.
 */
export class OpenAccountDto {
  @IsUUID()
  accountId: string;

  @IsString()
  holderName: string;

  @IsNumber()
  @Min(0)
  initialAmount: number;

  @IsString()
  currency: string;
}

export class DepositMoneyDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class WithdrawMoneyDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
