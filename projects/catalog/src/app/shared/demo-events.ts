import { Injectable, signal } from '@angular/core';

/** What a demo did: "pressed", "search: birra". */
export interface DemoEvent {
  at: string;
  text: string;
}

/** The messages between a component page and the frame of its demo (same origin). */
export type FrameMessage =
  | { type: 'kit-frame-ready' }
  | { type: 'kit-values'; values: Record<string, string | number | boolean>; pattern: boolean }
  | { type: 'kit-event'; text: string };

/**
 * What the demos say happened (an output fired, a dialog closed): inside a demo's frame each event
 * goes to the component page, which lists them under the demo.
 */
@Injectable({
  providedIn: 'root',
})
export class DemoEvents {
  readonly events = signal<DemoEvent[]>([]);

  /** In a demo: says what happened. */
  log(text: string): void {
    const parent = window.parent;
    if (parent && parent !== window) parent.postMessage({ type: 'kit-event', text } satisfies FrameMessage, window.location.origin);
    else this.add(text);
  }

  /** On the component page: an event came from the frame. */
  add(text: string): void {
    const at = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
    this.events.update((events) => [{ at, text }, ...events].slice(0, 8));
  }

  clear(): void {
    this.events.set([]);
  }
}
