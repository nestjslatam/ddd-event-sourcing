export class OpenAccountDto {
    accountId: string;
    holderName: string;
    initialAmount: number;
    currency: string;
}

export class DepositMoneyDto {
    amount: number;
}

export class WithdrawMoneyDto {
    amount: number;
}
