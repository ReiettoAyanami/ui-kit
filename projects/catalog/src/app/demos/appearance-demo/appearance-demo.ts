import { Component, inject } from '@angular/core';
import { LenziGlassSwitch } from '@lenzi/ui-kit/backgrounds';

import { LenziAppearance } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';

/** Reduce transparency, as an app's settings page offers it: every glass solid, remembered by this browser. */
@Component({
  selector: 'app-appearance-demo',
  imports: [LenziGlassSwitch],
  templateUrl: './appearance-demo.html',
  styleUrl: './appearance-demo.css',
})
export class AppearanceDemo {
  protected readonly appearance = inject(LenziAppearance);
  private readonly events = inject(DemoEvents);

  protected set(reduce: boolean): void {
    this.appearance.setReduceTransparency(reduce);
    this.events.log(reduce ? 'transparency reduced (the whole catalog follows, this browser remembers)' : 'glass back');
  }
}
