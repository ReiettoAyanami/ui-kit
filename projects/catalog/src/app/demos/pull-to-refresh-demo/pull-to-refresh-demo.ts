import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { LenziPullToRefresh } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/**
 * The pull is a touch gesture: on a phone, pull this frame down from its top. With a mouse, "Pull"
 * plays the same touches.
 */
@Component({
  selector: 'app-pull-to-refresh-demo',
  imports: [LenziPullToRefresh, MatButtonModule],
  templateUrl: './pull-to-refresh-demo.html',
  styleUrl: './pull-to-refresh-demo.css',
})
export class PullToRefreshDemo {
  readonly values = input<Values>({});
  private readonly events = inject(DemoEvents);
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  protected readonly refreshed = signal(0);

  protected readonly refresh = () => {
    this.events.log('refreshing');
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        this.refreshed.update((count) => count + 1);
        this.events.log('refreshed');
        resolve();
      }, Number(this.values()['duration'] ?? 1200)),
    );
  };

  /** The touches of a pull past the threshold, as a finger would make them. */
  protected async pull(): Promise<void> {
    const area = this.area().nativeElement;
    const touch = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 200, clientY: y }] });
      area.dispatchEvent(event);
    };
    touch('touchstart', 0);
    for (let y = 12; y <= 190; y += 12) {
      touch('touchmove', y);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    touch('touchend', 190);
  }
}
