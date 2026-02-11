import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountOpenedProjector,
  MoneyDepositedProjector,
  MoneyWithdrawnProjector,
} from './bank-account.projector';
import { getModelToken } from '@nestjs/mongoose';
import { BankAccountView } from './schema/bank-account.schema';
import {
  AccountOpenedEvent,
  MoneyDepositedEvent,
  MoneyWithdrawnEvent,
} from '../../domain/events';
import { ProcessedEventTracker } from '@nestjslatam/es';

describe('BankAccount Projectors', () => {
  let model: any;
  let processedEvents: jest.Mocked<ProcessedEventTracker>;

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    processedEvents = {
      isProcessed: jest.fn().mockResolvedValue(false),
      markProcessed: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('AccountOpenedProjector', () => {
    let projector: AccountOpenedProjector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AccountOpenedProjector,
          {
            provide: getModelToken(BankAccountView.name),
            useValue: model,
          },
          {
            provide: ProcessedEventTracker,
            useValue: processedEvents,
          },
        ],
      }).compile();

      projector = module.get<AccountOpenedProjector>(AccountOpenedProjector);
    });

    it('should create view on AccountOpenedEvent', async () => {
      const event = new AccountOpenedEvent('123', 'John Doe', 100, 'USD');
      (event as any).occurredOn = new Date();

      await projector.handle(event);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: '123',
          holderName: 'John Doe',
          balance: 100,
          currency: 'USD',
        }),
      );
    });
  });

  describe('MoneyDepositedProjector', () => {
    let projector: MoneyDepositedProjector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MoneyDepositedProjector,
          {
            provide: getModelToken(BankAccountView.name),
            useValue: model,
          },
          {
            provide: ProcessedEventTracker,
            useValue: processedEvents,
          },
        ],
      }).compile();

      projector = module.get<MoneyDepositedProjector>(MoneyDepositedProjector);
    });

    it('should update balance on MoneyDepositedEvent', async () => {
      const event = new MoneyDepositedEvent('123', 50, 'USD');
      (event as any).occurredOn = new Date();

      await projector.handle(event);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          $inc: { balance: 50 },
        }),
      );
    });
  });

  describe('MoneyWithdrawnProjector', () => {
    let projector: MoneyWithdrawnProjector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MoneyWithdrawnProjector,
          {
            provide: getModelToken(BankAccountView.name),
            useValue: model,
          },
          {
            provide: ProcessedEventTracker,
            useValue: processedEvents,
          },
        ],
      }).compile();

      projector = module.get<MoneyWithdrawnProjector>(MoneyWithdrawnProjector);
    });

    it('should update balance on MoneyWithdrawnEvent', async () => {
      const event = new MoneyWithdrawnEvent('123', 30, 'USD');
      (event as any).occurredOn = new Date();

      await projector.handle(event);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          $inc: { balance: -30 },
        }),
      );
    });
  });
});
