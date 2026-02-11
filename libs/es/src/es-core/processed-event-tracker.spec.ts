import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProcessedEventTracker } from './processed-event-tracker.service';

describe('ProcessedEventTracker', () => {
    let tracker: ProcessedEventTracker;
    let mockModel: any;

    beforeEach(async () => {
        // Mock Mongoose model
        mockModel = {
            exists: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProcessedEventTracker,
                {
                    provide: getModelToken('ProcessedEvent'),
                    useValue: mockModel,
                },
            ],
        }).compile();

        tracker = module.get<ProcessedEventTracker>(ProcessedEventTracker);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isProcessed', () => {
        it('should return false for unprocessed event', async () => {
            mockModel.exists.mockResolvedValue(null);

            const result = await tracker.isProcessed('evt-1');

            expect(result).toBe(false);
            expect(mockModel.exists).toHaveBeenCalledWith({ eventId: 'evt-1' });
        });

        it('should return true for processed event', async () => {
            mockModel.exists.mockResolvedValue({ _id: 'some-id' });

            const result = await tracker.isProcessed('evt-1');

            expect(result).toBe(true);
            expect(mockModel.exists).toHaveBeenCalledWith({ eventId: 'evt-1' });
        });

        it('should check in-memory cache first', async () => {
            // Mark as processed
            await tracker.markProcessed('evt-1');

            // Check again - should not hit database
            mockModel.exists.mockClear();
            const result = await tracker.isProcessed('evt-1');

            expect(result).toBe(true);
            expect(mockModel.exists).not.toHaveBeenCalled();
        });

        it('should support handler-scoped tracking', async () => {
            mockModel.exists.mockResolvedValue(null);

            await tracker.isProcessed('evt-1', 'Handler1');

            expect(mockModel.exists).toHaveBeenCalledWith({
                eventId: 'evt-1',
                handlerName: 'Handler1',
            });
        });

        it('should cache handler-scoped results', async () => {
            mockModel.exists.mockResolvedValue({ _id: 'some-id' });

            // First call - hits database
            await tracker.isProcessed('evt-1', 'Handler1');
            expect(mockModel.exists).toHaveBeenCalledTimes(1);

            // Second call - uses cache
            mockModel.exists.mockClear();
            const result = await tracker.isProcessed('evt-1', 'Handler1');

            expect(result).toBe(true);
            expect(mockModel.exists).not.toHaveBeenCalled();
        });
    });

    describe('markProcessed', () => {
        it('should mark event as processed', async () => {
            mockModel.create.mockResolvedValue({});

            await tracker.markProcessed('evt-1');

            expect(mockModel.create).toHaveBeenCalledWith({
                eventId: 'evt-1',
                handlerName: 'default',
                processedAt: expect.any(Date),
            });
        });

        it('should add to in-memory cache', async () => {
            mockModel.create.mockResolvedValue({});
            mockModel.exists.mockResolvedValue(null);

            await tracker.markProcessed('evt-1');

            // Should be in cache now
            mockModel.exists.mockClear();
            const result = await tracker.isProcessed('evt-1');

            expect(result).toBe(true);
            expect(mockModel.exists).not.toHaveBeenCalled();
        });

        it('should support handler-scoped tracking', async () => {
            mockModel.create.mockResolvedValue({});

            await tracker.markProcessed('evt-1', 'Handler1');

            expect(mockModel.create).toHaveBeenCalledWith({
                eventId: 'evt-1',
                handlerName: 'Handler1',
                processedAt: expect.any(Date),
            });
        });

        it('should ignore duplicate key errors', async () => {
            const duplicateError = new Error('Duplicate key');
            (duplicateError as any).code = 11000;
            mockModel.create.mockRejectedValue(duplicateError);

            // Should not throw
            await expect(tracker.markProcessed('evt-1')).resolves.not.toThrow();
        });

        it('should work without persistent model', async () => {
            // Create tracker without model
            const trackerNoModel = new ProcessedEventTracker();

            await trackerNoModel.markProcessed('evt-1');
            const result = await trackerNoModel.isProcessed('evt-1');

            expect(result).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('should delete old processed events', async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            mockModel.deleteMany.mockResolvedValue({ deletedCount: 42 });

            const count = await tracker.cleanup(thirtyDaysAgo);

            expect(count).toBe(42);
            expect(mockModel.deleteMany).toHaveBeenCalledWith({
                processedAt: { $lt: thirtyDaysAgo },
            });
        });

        it('should return 0 without persistent model', async () => {
            const trackerNoModel = new ProcessedEventTracker();
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const count = await trackerNoModel.cleanup(thirtyDaysAgo);

            expect(count).toBe(0);
        });

        it('should handle cleanup of recent events', async () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            mockModel.deleteMany.mockResolvedValue({ deletedCount: 5 });

            const count = await tracker.cleanup(yesterday);

            expect(count).toBe(5);
        });
    });

    describe('integration scenarios', () => {
        it('should handle multiple events for same handler', async () => {
            mockModel.create.mockResolvedValue({});

            await tracker.markProcessed('evt-1', 'Handler1');
            await tracker.markProcessed('evt-2', 'Handler1');
            await tracker.markProcessed('evt-3', 'Handler1');

            mockModel.exists.mockClear();

            expect(await tracker.isProcessed('evt-1', 'Handler1')).toBe(true);
            expect(await tracker.isProcessed('evt-2', 'Handler1')).toBe(true);
            expect(await tracker.isProcessed('evt-3', 'Handler1')).toBe(true);
            expect(await tracker.isProcessed('evt-4', 'Handler1')).toBe(false);

            // Only evt-4 should hit database
            expect(mockModel.exists).toHaveBeenCalledTimes(1);
        });

        it('should handle same event for multiple handlers', async () => {
            mockModel.create.mockResolvedValue({});

            await tracker.markProcessed('evt-1', 'Handler1');
            await tracker.markProcessed('evt-1', 'Handler2');

            mockModel.exists.mockClear();

            expect(await tracker.isProcessed('evt-1', 'Handler1')).toBe(true);
            expect(await tracker.isProcessed('evt-1', 'Handler2')).toBe(true);
            expect(await tracker.isProcessed('evt-1', 'Handler3')).toBe(false);

            // Only Handler3 should hit database
            expect(mockModel.exists).toHaveBeenCalledTimes(1);
        });

        it('should handle mixed scoped and unscoped tracking', async () => {
            mockModel.create.mockResolvedValue({});

            await tracker.markProcessed('evt-1'); // Default scope
            await tracker.markProcessed('evt-1', 'Handler1'); // Handler1 scope

            mockModel.exists.mockClear();

            expect(await tracker.isProcessed('evt-1')).toBe(true);
            expect(await tracker.isProcessed('evt-1', 'Handler1')).toBe(true);
            expect(await tracker.isProcessed('evt-1', 'Handler2')).toBe(false);

            expect(mockModel.exists).toHaveBeenCalledTimes(1);
        });
    });
});
