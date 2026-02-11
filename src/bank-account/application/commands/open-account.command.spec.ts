import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import {
  OpenAccountCommandHandler,
  OpenAccountCommand,
} from './open-account.command';
import { BankAccount } from '../../domain/bank-account.aggregate';

describe('OpenAccountCommandHandler', () => {
  let handler: OpenAccountCommandHandler;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const mockEventPublisher = {
      mergeObjectContext: jest.fn((aggregate) => {
        // Return aggregate with commit method that does nothing in test
        return {
          ...aggregate,
          commit: jest.fn(),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAccountCommandHandler,
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    handler = module.get<OpenAccountCommandHandler>(OpenAccountCommandHandler);
    eventPublisher = module.get(EventPublisher) as jest.Mocked<EventPublisher>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should open a new bank account', async () => {
    const command = new OpenAccountCommand(
      '550e8400-e29b-41d4-a716-446655440123',
      'John Doe',
      1000,
      'USD',
    );

    await handler.execute(command);

    expect(eventPublisher.mergeObjectContext).toHaveBeenCalled();
    const mergedAggregate =
      eventPublisher.mergeObjectContext.mock.results[0].value;
    expect(mergedAggregate.commit).toHaveBeenCalled();
  });

  it('should create account with correct properties', async () => {
    const command = new OpenAccountCommand(
      '550e8400-e29b-41d4-a716-446655440456',
      'Jane Smith',
      2500,
      'EUR',
    );

    await handler.execute(command);

    const callArg = eventPublisher.mergeObjectContext.mock
      .calls[0][0] as BankAccount;
    expect(callArg).toBeInstanceOf(BankAccount);
    expect(callArg.id.toString()).toBe('550e8400-e29b-41d4-a716-446655440456');
    expect(callArg.props.holderName).toBe('Jane Smith');
    expect(callArg.props.balance.amount).toBe(2500);
    expect(callArg.props.balance.currency).toBe('EUR');
  });

  it('should generate AccountOpenedEvent', async () => {
    const command = new OpenAccountCommand(
      '550e8400-e29b-41d4-a716-446655440789',
      'Bob Johnson',
      500,
      'GBP',
    );

    await handler.execute(command);

    const aggregate = eventPublisher.mergeObjectContext.mock.calls[0][0];
    const events = aggregate.getUncommittedEvents();

    expect(events).toHaveLength(1);
    expect(events[0].constructor.name).toBe('AccountOpenedEvent');
  });

  it('should handle multiple account creations', async () => {
    const command1 = new OpenAccountCommand(
      '550e8400-e29b-41d4-a716-446655440001',
      'User 1',
      100,
      'USD',
    );
    const command2 = new OpenAccountCommand(
      '550e8400-e29b-41d4-a716-446655440002',
      'User 2',
      200,
      'USD',
    );

    await handler.execute(command1);
    await handler.execute(command2);

    expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(2);
  });
});
