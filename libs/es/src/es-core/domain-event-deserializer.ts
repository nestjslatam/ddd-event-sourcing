import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { DomainEventClsRegistry } from './domain-event-cls.registry';
import { InfrastructureEvent } from './infrastructure-event';

@Injectable()
export class DomainEventDeserializer {
  /**
   * Reconstruye una instancia de DomainEvent a partir de datos primitivos.
   * Utiliza el Registry para saber qué clase instanciar.
   * @param eventData Datos primitivos del evento (generalmente de la BD)
   * @returns Instancia tipada del evento (ej: UserCreatedEvent)
   */
  public static deserialize(eventData: InfrastructureEvent): DomainEvent {
    const { eventName, attributes, eventId, occurredOn, aggregateId } =
      eventData;

    // 1. Buscamos la clase en el registro usando el nombre del evento
    const EventClass = DomainEventClsRegistry.get(eventName);

    if (!EventClass) {
      throw new Error(
        `[DomainEventDeserializer] Event class not found for eventName: "${eventName}". 
         Make sure the event class is decorated with @RegisterDomainEvent().`,
      );
    }

    // 2. Prepare metadata for constructor including eventId and occurredOn
    const metadata = {
      aggregateId,
      eventId,
      occurredOn:
        typeof occurredOn === 'string' ? new Date(occurredOn) : occurredOn,
    };

    // 3. Create instance with metadata
    const instance = new EventClass(metadata);

    // 4. Assign custom properties from attributes
    Object.keys(attributes).forEach((key) => {
      (instance as any)[key] = (attributes as any)[key];
    });

    return instance;
  }

  public deserialize(eventData: InfrastructureEvent): DomainEvent {
    return DomainEventDeserializer.deserialize(eventData);
  }
}
