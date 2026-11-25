import { Component, inject, input, signal } from '@angular/core';
import { LenziGlassSwitch } from '@lenzi/ui-kit/backgrounds';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** LenziGlassSwitch over stripes of the theme's colours, so its glass has something to bend. */
@Component({
  selector: 'app-glass-switch-demo',
  imports: [LenziGlassSwitch],
  templateUrl: './glass-switch-demo.html',
  styleUrl: './glass-switch-demo.css',
})
export class GlassSwitchDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  protected readonly on = signal(true);

  protected switched(on: boolean): void {
    this.on.set(on);
    this.events.log(on ? 'on' : 'off');
  }
}
