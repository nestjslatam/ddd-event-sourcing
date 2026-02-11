import { VersionedEvent } from './versioned-event.base';

describe('VersionedEvent', () => {
  class TestEventV1 extends VersionedEvent {
    readonly schemaVersion = 1;
    readonly eventType = 'TestEvent';

    constructor(
      aggregateId: string,
      public readonly data: string,
    ) {
      super({
        aggregateId,
        aggregateType: 'TestAggregate',
        aggregateVersion: 1,
        eventVersion: 1,
        timestamp: Date.now(),
      } as any);
    }
  }

  class TestEventV2 extends VersionedEvent {
    readonly schemaVersion = 2;
    readonly eventType = 'TestEvent';

    constructor(
      aggregateId: string,
      public readonly data: string,
      public readonly newField: string = 'default',
    ) {
      super({
        aggregateId,
        aggregateType: 'TestAggregate',
        aggregateVersion: 1,
        eventVersion: 2,
        timestamp: Date.now(),
      } as any);
    }
  }

  describe('schemaVersion', () => {
    it('should have explicit schema version', () => {
      const event = new TestEventV1('agg-1', 'test');
      expect(event.schemaVersion).toBe(1);
    });

    it('should support multiple versions', () => {
      const v1 = new TestEventV1('agg-1', 'test');
      const v2 = new TestEventV2('agg-1', 'test', 'new');

      expect(v1.schemaVersion).toBe(1);
      expect(v2.schemaVersion).toBe(2);
    });
  });

  describe('eventType', () => {
    it('should have explicit event type', () => {
      const event = new TestEventV1('agg-1', 'test');
      expect(event.eventType).toBe('TestEvent');
    });

    it('should maintain same event type across versions', () => {
      const v1 = new TestEventV1('agg-1', 'test');
      const v2 = new TestEventV2('agg-1', 'test', 'new');

      expect(v1.eventType).toBe(v2.eventType);
    });
  });

  describe('inheritance', () => {
    it('should extend DomainEvent', () => {
      const event = new TestEventV1('agg-1', 'test');
      expect(event.aggregateId).toBe('agg-1');
      expect(event.aggregateType).toBe('TestAggregate');
    });

    it('should support custom properties', () => {
      const event = new TestEventV1('agg-1', 'custom-data');
      expect(event.data).toBe('custom-data');
    });

    it('should support version-specific properties', () => {
      const event = new TestEventV2('agg-1', 'test', 'version-2-field');
      expect(event.data).toBe('test');
      expect(event.newField).toBe('version-2-field');
    });
  });

  describe('backward compatibility', () => {
    it('should support default values for new fields', () => {
      const event = new TestEventV2('agg-1', 'test');
      expect(event.newField).toBe('default');
    });
  });
});
