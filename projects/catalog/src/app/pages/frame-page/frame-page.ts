import { NgComponentOutlet } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, Type, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { LenziStatusMessage } from '@lenzi/ui-kit';

import { FrameMessage } from '../../shared/demo-events';
import { Values, defaults, docById } from '../../registry';

/**
 * A demo alone, inside the frame of its component page (`/frame/<id>`): the shell around it is gone
 * (route data `bare`). It starts with the values in the address and follows the page's messages: the
 * values, and how much of the frame is under the window's edge (styles.css keeps a snackbar above it).
 */
@Component({
  selector: 'app-frame-page',
  imports: [LenziStatusMessage, NgComponentOutlet],
  templateUrl: './frame-page.html',
  styleUrl: './frame-page.css',
})
export class FramePage {
  readonly id = input.required<string>();
  /** The values the demo starts with (JSON), from the address. */
  readonly v = input<string | undefined>(undefined);

  private readonly document = inject(DOCUMENT);

  protected readonly doc = computed(() => docById(this.id()));
  protected readonly demo = signal<Type<unknown> | null>(null);
  protected readonly values = signal<Values>({});
  protected readonly inputs = computed(() => ({ values: this.values() }));

  constructor() {
    // The address's values when the frame starts with its demo, and only then: a link followed inside the demo (its
    // navigation list's) leaves them out of the address, and the demo keeps the ones the page sent since.
    effect(() => {
      const doc = this.doc();
      if (!doc) return;
      let start: Values = defaults(doc);
      try {
        start = { ...start, ...(JSON.parse(untracked(() => this.v()) ?? '{}') as Values) };
      } catch {
        // a broken address: the defaults
      }
      this.values.set(start);
      void doc.demo().then((type) => this.demo.set(type));
    });

    const listener = (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'kit-values') {
        this.values.set(event.data.values);
        this.document.body.classList.toggle('catalog-pattern', event.data.pattern);
      } else if (event.data?.type === 'kit-frame-cut') {
        this.document.documentElement.style.setProperty('--catalog-frame-cut', `${event.data.bottom}px`);
      }
    };
    window.addEventListener('message', listener);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', listener));
    this.document.body.classList.add('catalog-frame');
    window.parent?.postMessage({ type: 'kit-frame-ready' } satisfies FrameMessage, window.location.origin);
  }
}
