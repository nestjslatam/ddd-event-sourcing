import { Test, TestingModule } from '@nestjs/testing';
import { SagaRegistry } from './saga.registry';
import { AbstractSaga } from './saga.base';
import { Injectable } from '@nestjs/common';
import { ICommand } from '@nestjs/cqrs';
import { Observable, of } from 'rxjs';

// Mock saga for testing
@Injectable()
class TestSaga extends AbstractSaga {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  saga$ = (_events$: Observable<any>): Observable<ICommand> => {
    return of({} as ICommand);
  };
}

describe('SagaRegistry', () => {
  let registry: SagaRegistry;
  let testSaga: TestSaga;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SagaRegistry, TestSaga],
    }).compile();

    registry = module.get<SagaRegistry>(SagaRegistry);
    testSaga = module.get<TestSaga>(TestSaga);
  });

  describe('register', () => {
    it('should register a saga', () => {
      registry.register('test-saga', testSaga);
      expect(registry.has('test-saga')).toBe(true);
    });

    it('should allow registering multiple sagas', () => {
      const saga2 = new TestSaga();
      registry.register('saga-1', testSaga);
      registry.register('saga-2', saga2);

      expect(registry.count()).toBe(2);
    });
  });

  describe('get', () => {
    it('should retrieve a registered saga', () => {
      registry.register('test-saga', testSaga);
      const retrieved = registry.get('test-saga');

      expect(retrieved).toBe(testSaga);
    });

    it('should return undefined for unregistered saga', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered sagas', () => {
      const saga2 = new TestSaga();
      registry.register('saga-1', testSaga);
      registry.register('saga-2', saga2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(testSaga);
      expect(all).toContain(saga2);
    });

    it('should return empty array when no sagas registered', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for registered saga', () => {
      registry.register('test-saga', testSaga);
      expect(registry.has('test-saga')).toBe(true);
    });

    it('should return false for unregistered saga', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(registry.count()).toBe(0);

      registry.register('saga-1', testSaga);
      expect(registry.count()).toBe(1);

      registry.register('saga-2', new TestSaga());
      expect(registry.count()).toBe(2);
    });
  });
});
