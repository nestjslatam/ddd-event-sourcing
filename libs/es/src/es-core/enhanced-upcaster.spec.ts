import { EnhancedUpcasterRegistry } from './enhanced-upcaster.registry';
import { InfrastructureEvent } from './infrastructure-event';

describe('EnhancedUpcasterRegistry', () => {
  let registry: EnhancedUpcasterRegistry;

  beforeEach(() => {
    registry = new EnhancedUpcasterRegistry();
  });

  describe('register', () => {
    it('should register an upcaster', () => {
      const upcaster = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 2,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        eventVersion: 1,
        attributes: {},
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast.eventVersion).toBe(2);
    });

    it('should track latest version', () => {
      const upcaster1to2 = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 2,
        }),
      };

      const upcaster2to3 = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 3,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster1to2);
      registry.register('TestEvent', 2, 3, upcaster2to3);

      expect(registry.getLatestVersion('TestEvent')).toBe(3);
    });

    it('should support multiple event types', () => {
      const upcaster = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 2,
        }),
      };

      registry.register('EventA', 1, 2, upcaster);
      registry.register('EventB', 1, 2, upcaster);

      expect(registry.getLatestVersion('EventA')).toBe(2);
      expect(registry.getLatestVersion('EventB')).toBe(2);
    });
  });

  describe('upcast', () => {
    it('should upcast from v1 to v2', () => {
      const upcaster = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          attributes: {
            ...event.attributes,
            newField: 'added',
          },
          eventVersion: 2,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        eventVersion: 1,
        attributes: { oldField: 'value' },
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast.eventVersion).toBe(2);
      expect(upcast.attributes.newField).toBe('added');
      expect(upcast.attributes.oldField).toBe('value');
    });

    it('should upcast sequentially through multiple versions', () => {
      const upcaster1to2 = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          attributes: {
            ...event.attributes,
            fieldV2: 'v2',
          },
          eventVersion: 2,
        }),
      };

      const upcaster2to3 = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          attributes: {
            ...event.attributes,
            fieldV3: 'v3',
          },
          eventVersion: 3,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster1to2);
      registry.register('TestEvent', 2, 3, upcaster2to3);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        eventVersion: 1,
        attributes: { fieldV1: 'v1' },
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast.eventVersion).toBe(3);
      expect(upcast.attributes.fieldV1).toBe('v1');
      expect(upcast.attributes.fieldV2).toBe('v2');
      expect(upcast.attributes.fieldV3).toBe('v3');
    });

    it('should return event unchanged if already at latest version', () => {
      const upcaster = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 2,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        eventVersion: 2,
        attributes: {},
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast).toBe(event);
    });

    it('should return event unchanged if no upcasters registered', () => {
      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'UnknownEvent',
        eventVersion: 1,
        attributes: {},
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast).toBe(event);
    });
  });

  describe('getLatestVersion', () => {
    it('should return 1 for unregistered events', () => {
      expect(registry.getLatestVersion('UnknownEvent')).toBe(1);
    });

    it('should return latest version for registered events', () => {
      const upcaster1to2 = { upcast: (e: any) => ({ ...e, eventVersion: 2 }) };
      const upcaster2to3 = { upcast: (e: any) => ({ ...e, eventVersion: 3 }) };
      const upcaster3to4 = { upcast: (e: any) => ({ ...e, eventVersion: 4 }) };

      registry.register('TestEvent', 1, 2, upcaster1to2);
      registry.register('TestEvent', 2, 3, upcaster2to3);
      registry.register('TestEvent', 3, 4, upcaster3to4);

      expect(registry.getLatestVersion('TestEvent')).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('should handle missing eventVersion gracefully', () => {
      const upcaster = {
        upcast: (event: InfrastructureEvent) => ({
          ...event,
          eventVersion: 2,
        }),
      };

      registry.register('TestEvent', 1, 2, upcaster);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        attributes: {},
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast.eventVersion).toBe(2);
    });

    it('should handle non-sequential version registration', () => {
      const upcaster1to2 = { upcast: (e: any) => ({ ...e, eventVersion: 2 }) };
      const upcaster3to4 = { upcast: (e: any) => ({ ...e, eventVersion: 4 }) };
      const upcaster2to3 = { upcast: (e: any) => ({ ...e, eventVersion: 3 }) };

      // Register out of order
      registry.register('TestEvent', 1, 2, upcaster1to2);
      registry.register('TestEvent', 3, 4, upcaster3to4);
      registry.register('TestEvent', 2, 3, upcaster2to3);

      const event: InfrastructureEvent = {
        aggregateId: 'agg-1',
        aggregateVersion: 1,
        eventId: 'evt-1',
        occurredOn: new Date(),
        eventName: 'TestEvent',
        eventVersion: 1,
        attributes: {},
        meta: {},
      };

      const upcast = registry.upcast(event);
      expect(upcast.eventVersion).toBe(4);
    });
  });
});
