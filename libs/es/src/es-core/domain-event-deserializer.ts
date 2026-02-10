import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@nestjslatam/ddd-lib';
import { DomainEventClsRegistry } from './domain-event-cls.registry';
import { plainToInstance } from 'class-transformer'; // npm install class-transformer
import { InfrastructureEvent } from './infrastructure-event';


@Injectable()
export class DomainEventDeserializer {
    /**
     * Reconstruye una instancia de DomainEvent a partir de datos primitivos.
     * Utiliza el Registry para saber qué clase instanciar.
     * * @param eventData Datos primitivos del evento (generalmente de la BD)
     * @returns Instancia tipada del evento (ej: UserCreatedEvent)
     */
    public static deserialize(eventData: InfrastructureEvent): DomainEvent {
        const { eventName, attributes, eventId, occurredOn, meta } = eventData;

        // 1. Buscamos la clase en el registro usando el nombre del evento
        const EventClass = DomainEventClsRegistry.get(eventName);

        if (!EventClass) {
            throw new Error(
                `[DomainEventDeserializer] Event class not found for eventName: "${eventName}". 
         Make sure the event class is decorated with @RegisterDomainEvent().`
            );
        }

        // 2. Preparamos el objeto plano para la hidratación
        // Fusionamos los atributos del dominio con los metadatos base (id, fecha)
        const plainObject = {
            ...attributes,
            eventId,
            occurredOn: new Date(occurredOn), // Aseguramos que sea objeto Date
            eventName,
            meta,
        };

        // 3. Magia: Convertimos el JSON plano a una instancia real de la clase
        // Esto permite que el evento tenga métodos y pase validaciones de tipo
        const instance = plainToInstance(EventClass, plainObject);

        return instance;
    }

    public deserialize(eventData: InfrastructureEvent): DomainEvent {
        return DomainEventDeserializer.deserialize(eventData);
    }
}