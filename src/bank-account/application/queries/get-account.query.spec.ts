import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GetAccountQueryHandler, GetAccountQuery } from './get-account.query';
import { BankAccountView } from '../../infrastructure/read-model/schema/bank-account.schema';

describe('GetAccountQueryHandler', () => {
    let handler: GetAccountQueryHandler;
    let repository: any;

    beforeEach(async () => {
        const mockRepository = {
            findById: jest.fn().mockReturnThis(),
            exec: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetAccountQueryHandler,
                {
                    provide: getModelToken(BankAccountView.name),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        handler = module.get<GetAccountQueryHandler>(GetAccountQueryHandler);
        repository = module.get(getModelToken(BankAccountView.name));
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    it('should retrieve account by id', async () => {
        const mockAccount = {
            _id: 'acc-123',
            holderName: 'John Doe',
            balance: 1000,
            currency: 'USD',
        };

        repository.exec.mockResolvedValue(mockAccount);

        const query = new GetAccountQuery('acc-123');
        const result = await handler.execute(query);

        expect(repository.findById).toHaveBeenCalledWith('acc-123');
        expect(result).toEqual(mockAccount);
    });

    it('should return null for non-existent account', async () => {
        repository.exec.mockResolvedValue(null);

        const query = new GetAccountQuery('non-existent');
        const result = await handler.execute(query);

        expect(result).toBeNull();
    });

    it('should handle multiple queries', async () => {
        const mockAccount1 = { _id: 'acc-1', holderName: 'User 1', balance: 100, currency: 'USD' };
        const mockAccount2 = { _id: 'acc-2', holderName: 'User 2', balance: 200, currency: 'EUR' };

        repository.exec
            .mockResolvedValueOnce(mockAccount1)
            .mockResolvedValueOnce(mockAccount2);

        const result1 = await handler.execute(new GetAccountQuery('acc-1'));
        const result2 = await handler.execute(new GetAccountQuery('acc-2'));

        expect(result1).toEqual(mockAccount1);
        expect(result2).toEqual(mockAccount2);
    });

    it('should call repository methods in correct order', async () => {
        repository.exec.mockResolvedValue({});

        await handler.execute(new GetAccountQuery('acc-456'));

        expect(repository.findById).toHaveBeenCalledBefore(repository.exec);
    });
});
