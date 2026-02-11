import { InfrastructureEvent } from '../infrastructure-event';

export interface IEventUpcaster {
  upcast(event: InfrastructureEvent): InfrastructureEvent;
  supports(eventName: string): boolean;
}
