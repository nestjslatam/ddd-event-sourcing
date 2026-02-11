import { Injectable } from '@nestjs/common';
import { IEventUpcaster } from './upcaster.interface';

@Injectable()
export class UpcasterRegistry {
  private upcasters: IEventUpcaster[] = [];

  register(upcaster: IEventUpcaster): void {
    this.upcasters.push(upcaster);
  }

  getUpcastersFor(eventName: string): IEventUpcaster[] {
    return this.upcasters.filter((u) => u.supports(eventName));
  }
}
