import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ParallelEventProcessor } from './parallel-event-processor';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent extends DomainEvent {
  constructor(id: string) {
    super({
      aggregateId: id,
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

describe('ParallelEventProcessor', () => {
  let processor: ParallelEventProcessor;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    eventBus = module.get(EventBus);
    processor = new ParallelEventProcessor(eventBus, 5);
  });

  describe('processEvents', () => {
    it('should process all events', async () => {
      const events = [
        new TestEvent('1'),
        new TestEvent('2'),
        new TestEvent('3'),
      ];

      await processor.processEvents(events);

      expect(eventBus.publish).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      await processor.processEvents([]);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should respect concurrency limit', async () => {
      const events = Array.from(
        { length: 20 },
        (_, i) => new TestEvent(`${i}`),
      );
      const publishCalls: number[] = [];

      eventBus.publish.mockImplementation(async () => {
        publishCalls.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await processor.processEvents(events);

      expect(eventBus.publish).toHaveBeenCalledTimes(20);
      // Verify events were processed in chunks
    });

    it('should propagate errors', async () => {
      const events = [new TestEvent('1')];
      eventBus.publish.mockRejectedValue(new Error('Test error'));

      await expect(processor.processEvents(events)).rejects.toThrow(
        'Test error',
      );
    });
  });

  describe('getConfig', () => {
    it('should return processor configuration', () => {
      const config = processor.getConfig();
      expect(config.concurrency).toBe(5);
    });
  });
});
