import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BankAccountView } from '../../infrastructure/read-model/schema/bank-account.schema';

export class GetAccountQuery {
  constructor(public readonly accountId: string) {}
}

@QueryHandler(GetAccountQuery)
export class GetAccountQueryHandler implements IQueryHandler<GetAccountQuery> {
  constructor(
    @InjectModel(BankAccountView.name)
    private readonly repository: Model<BankAccountView>,
  ) {}

  async execute(query: GetAccountQuery): Promise<BankAccountView> {
    return this.repository.findById(query.accountId).exec();
  }
}
