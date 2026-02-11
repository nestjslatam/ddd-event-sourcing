import { DomainEventClsRegistry } from '../es-core/domain-event-cls.registry';

export const EsAutowiredEvent: ClassDecorator = (target: any) => {
  DomainEventClsRegistry.register(target);
};
