import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountProjector } from './bank-account.projector';
import { getModelToken } from '@nestjs/mongoose';
import { BankAccountView } from './schema/bank-account.schema';
import { AccountOpenedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../../domain/events';

describe('BankAccountProjector', () => {
    let projector: BankAccountProjector;
    let model: any;

    beforeEach(async () => {
        model = {
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BankAccountProjector,
                {
                    provide: getModelToken(BankAccountView.name),
                    useValue: model,
                },
            ],
        }).compile();

        projector = module.get<BankAccountProjector>(BankAccountProjector);
    });

    it('should create view on AccountOpenedEvent', async () => {
        const event = new AccountOpenedEvent('123', 'John Doe', 100, 'USD');
        // Manually set occurredOn if needed, or rely on default
        (event as any).occurredOn = new Date();

        await projector.handle(event);

        expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
            _id: '123',
            holderName: 'John Doe',
            balance: 100,
            currency: 'USD',
        }));
    });

    it('should update balance on MoneyDepositedEvent', async () => {
        const event = new MoneyDepositedEvent('123', 50, 'USD');
        (event as any).occurredOn = new Date();

        await projector.handle(event);

        expect(model.findByIdAndUpdate).toHaveBeenCalledWith('123', expect.objectContaining({
            $inc: { balance: 50 },
        }));
    });

    it('should update balance on MoneyWithdrawnEvent', async () => {
        const event = new MoneyWithdrawnEvent('123', 30, 'USD');
        (event as any).occurredOn = new Date();

        await projector.handle(event);

        expect(model.findByIdAndUpdate).toHaveBeenCalledWith('123', expect.objectContaining({
            $inc: { balance: -30 },
        }));
    });
});
