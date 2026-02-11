import { DomainEventClsRegistry } from './domain-event-cls.registry';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestEvent1 extends DomainEvent {
  constructor(aggregateId: string) {
    super({
      aggregateId,
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

class TestEvent2 extends DomainEvent {
  constructor(aggregateId: string) {
    super({
      aggregateId,
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

describe('DomainEventClsRegistry', () => {
  beforeEach(() => {
    DomainEventClsRegistry.clear();
  });

  afterEach(() => {
    DomainEventClsRegistry.clear();
  });

  describe('register', () => {
    it('should register an event class', () => {
      DomainEventClsRegistry.register(TestEvent1);

      const result = DomainEventClsRegistry.get('TestEvent1');

      expect(result).toBe(TestEvent1);
    });

    it('should not register duplicate event classes', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      DomainEventClsRegistry.register(TestEvent1);
      DomainEventClsRegistry.register(TestEvent1);

      const allEvents = DomainEventClsRegistry.getAll();
      expect(allEvents.size).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should register multiple different event classes', () => {
      DomainEventClsRegistry.register(TestEvent1);
      DomainEventClsRegistry.register(TestEvent2);

      expect(DomainEventClsRegistry.get('TestEvent1')).toBe(TestEvent1);
      expect(DomainEventClsRegistry.get('TestEvent2')).toBe(TestEvent2);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered event', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = DomainEventClsRegistry.get('NonExistentEvent');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Event class not found for name: "NonExistentEvent"',
        ),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return registered event class', () => {
      DomainEventClsRegistry.register(TestEvent1);

      const result = DomainEventClsRegistry.get('TestEvent1');

      expect(result).toBe(TestEvent1);
    });

    it('should warn when event class not found', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      DomainEventClsRegistry.get('UnknownEvent');

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getAll', () => {
    it('should return all registered events', () => {
      DomainEventClsRegistry.register(TestEvent1);
      DomainEventClsRegistry.register(TestEvent2);

      const all = DomainEventClsRegistry.getAll();

      expect(all.size).toBe(2);
      expect(all.get('TestEvent1')).toBe(TestEvent1);
      expect(all.get('TestEvent2')).toBe(TestEvent2);
    });

    it('should return empty map when no events registered', () => {
      const all = DomainEventClsRegistry.getAll();

      expect(all.size).toBe(0);
    });

    it('should return a copy of the registry', () => {
      DomainEventClsRegistry.register(TestEvent1);

      const all = DomainEventClsRegistry.getAll();
      all.clear();

      // Original registry should still have the event
      expect(DomainEventClsRegistry.get('TestEvent1')).toBe(TestEvent1);
    });
  });

  describe('clear', () => {
    it('should clear all registered events', () => {
      DomainEventClsRegistry.register(TestEvent1);
      DomainEventClsRegistry.register(TestEvent2);

      DomainEventClsRegistry.clear();

      const all = DomainEventClsRegistry.getAll();
      expect(all.size).toBe(0);
    });

    it('should allow re-registration after clear', () => {
      DomainEventClsRegistry.register(TestEvent1);
      DomainEventClsRegistry.clear();
      DomainEventClsRegistry.register(TestEvent1);

      const result = DomainEventClsRegistry.get('TestEvent1');
      expect(result).toBe(TestEvent1);
    });
  });
});
