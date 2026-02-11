import { Test, TestingModule } from '@nestjs/testing';
import { MaterializedViewManager } from './materialized-view.manager';

describe('MaterializedViewManager', () => {
  let manager: MaterializedViewManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterializedViewManager],
    }).compile();

    manager = module.get<MaterializedViewManager>(MaterializedViewManager);
  });

  afterEach(() => {
    manager.invalidateAll();
  });

  describe('getOrCreate', () => {
    it('should create view on first access', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await manager.getOrCreate('test-view', factory);

      expect(result).toEqual({ data: 'test' });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return cached view on subsequent access', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('test-view', factory);
      const result = await manager.getOrCreate('test-view', factory);

      expect(result).toEqual({ data: 'test' });
      expect(factory).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should respect TTL and recreate expired views', async () => {
      const factory = jest
        .fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });

      // Create with 100ms TTL
      await manager.getOrCreate('test-view', factory, 100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await manager.getOrCreate('test-view', factory, 100);

      expect(result).toEqual({ data: 'second' });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should handle different views independently', async () => {
      const factory1 = jest.fn().mockResolvedValue({ data: 'view1' });
      const factory2 = jest.fn().mockResolvedValue({ data: 'view2' });

      const result1 = await manager.getOrCreate('view-1', factory1);
      const result2 = await manager.getOrCreate('view-2', factory2);

      expect(result1).toEqual({ data: 'view1' });
      expect(result2).toEqual({ data: 'view2' });
      expect(factory1).toHaveBeenCalledTimes(1);
      expect(factory2).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific view', async () => {
      const factory = jest
        .fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });

      await manager.getOrCreate('test-view', factory);
      manager.invalidate('test-view');
      const result = await manager.getOrCreate('test-view', factory);

      expect(result).toEqual({ data: 'second' });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should not affect other views', async () => {
      const factory1 = jest.fn().mockResolvedValue({ data: 'view1' });
      const factory2 = jest.fn().mockResolvedValue({ data: 'view2' });

      await manager.getOrCreate('view-1', factory1);
      await manager.getOrCreate('view-2', factory2);

      manager.invalidate('view-1');

      await manager.getOrCreate('view-1', factory1);
      await manager.getOrCreate('view-2', factory2);

      expect(factory1).toHaveBeenCalledTimes(2); // Recreated
      expect(factory2).toHaveBeenCalledTimes(1); // Still cached
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate views matching pattern', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('account-123', factory);
      await manager.getOrCreate('account-456', factory);
      await manager.getOrCreate('user-789', factory);

      manager.invalidatePattern(/^account-/);

      const stats = manager.getStats();
      expect(stats.totalViews).toBe(1); // Only user-789 remains
    });
  });

  describe('invalidateAll', () => {
    it('should invalidate all views', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('view-1', factory);
      await manager.getOrCreate('view-2', factory);
      await manager.getOrCreate('view-3', factory);

      manager.invalidateAll();

      const stats = manager.getStats();
      expect(stats.totalViews).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('view-1', factory);
      await manager.getOrCreate('view-2', factory, 50);

      // Wait for one to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = manager.getStats();
      expect(stats.totalViews).toBe(2);
      expect(stats.expiredViews).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should remove expired views', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('view-1', factory, 50);
      await manager.getOrCreate('view-2', factory); // No TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = manager.cleanup();

      expect(removed).toBe(1);
      const stats = manager.getStats();
      expect(stats.totalViews).toBe(1);
    });

    it('should return 0 when no expired views', async () => {
      const factory = jest.fn().mockResolvedValue({ data: 'test' });

      await manager.getOrCreate('view-1', factory);

      const removed = manager.cleanup();
      expect(removed).toBe(0);
    });
  });
});
