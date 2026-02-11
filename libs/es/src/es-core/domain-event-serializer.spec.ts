import { DomainEventSerializer } from './domain-event-serializer';
import { DomainEvent } from '@nestjslatam/ddd-lib';

class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly testData: string,
    public readonly testNumber: number,
  ) {
    super({
      aggregateId,
      aggregateType: 'Test',
      aggregateVersion: 1,
      eventVersion: 1,
      timestamp: Date.now(),
    } as any);
  }
}

describe('DomainEventSerializer', () => {
  let serializer: DomainEventSerializer;

  beforeEach(() => {
    serializer = new DomainEventSerializer();
  });

  it('should serialize a domain event to infrastructure event', () => {
    const event = new TestDomainEvent('agg-123', 'test value', 42);

    const result = serializer.serialize(event);

    expect(result.aggregateId).toBe('agg-123');
    expect(result.eventName).toBe('TestDomainEvent');
    expect(result.attributes.testData).toBe('test value');
    expect(result.attributes.testNumber).toBe(42);
    expect(result.meta).toEqual({});
  });

  it('should use current date if occurredOn is not present', () => {
    const event = new TestDomainEvent('agg-789', 'data', 100);
    const beforeSerialization = new Date();

    const result = serializer.serialize(event);

    expect(result.occurredOn).toBeInstanceOf(Date);
    expect(result.occurredOn.getTime()).toBeGreaterThanOrEqual(
      beforeSerialization.getTime(),
    );
  });

  it('should extract event name from constructor', () => {
    const event = new TestDomainEvent('agg-111', 'test', 1);

    const result = serializer.serialize(event);

    expect(result.eventName).toBe('TestDomainEvent');
  });

  it('should include aggregateId', () => {
    const event = new TestDomainEvent('agg-222', 'value', 99);

    const result = serializer.serialize(event);

    expect(result.aggregateId).toBe('agg-222');
  });

  it('should extract payload attributes', () => {
    const event = new TestDomainEvent('agg-333', 'payload data', 777);

    const result = serializer.serialize(event);

    expect(result.attributes).toEqual({
      testData: 'payload data',
      testNumber: 777,
    });
  });
});
