import { DomainEvent } from '@nestjslatam/ddd-lib';
import { ClassConstructor } from 'class-transformer';
// Si no quieres depender de class-transformer, usa el tipo 'Type' de @nestjs/common 
// o define tu propio tipo: export type ClassConstructor<T> = { new (...args: any[]): T };


export class DomainEventClsRegistry {
    // Mapa estático para almacenar la relación: "NombreDelEvento" -> ClaseConstructor
    private static readonly registry = new Map<string, ClassConstructor<DomainEvent>>();

    /**
     * Registra una clase de evento en el registro.
     * Se usa típicamente mediante un decorador al iniciar la aplicación.
     * @param eventCls El constructor de la clase del evento.
     */
    public static register(eventCls: ClassConstructor<DomainEvent>): void {
        const eventName = eventCls.name;

        // Evitamos registros duplicados para mantener el log limpio
        if (!this.registry.has(eventName)) {
            this.registry.set(eventName, eventCls);
            // Opcional: console.log(`[DomainEventRegistry] Registered: ${eventName}`);
        }
    }

    /**
     * Obtiene el constructor de la clase dado el nombre del evento.
     * Vital para el proceso de deserialización (Event Rehydration).
     * * @param eventName El nombre del evento (ej: "UserCreatedEvent")
     * @returns El constructor de la clase o undefined si no existe.
     */
    public static get(eventName: string): ClassConstructor<DomainEvent> | undefined {
        const eventCls = this.registry.get(eventName);

        if (!eventCls) {
            console.warn(`[DomainEventClsRegistry] WARNING: Event class not found for name: "${eventName}". Make sure the event is decorated with @RegisterDomainEvent()`);
        }

        return eventCls;
    }

    /**
     * Retorna todo el registro (útil para debugging o health checks).
     */
    public static getAll(): Map<string, ClassConstructor<DomainEvent>> {
        return new Map(this.registry);
    }

    /**
     * Limpia el registro. Útil para entornos de Test (evita contaminación entre tests).
     */
    public static clear(): void {
        this.registry.clear();
    }
}