import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DomSanitizer } from '@angular/platform-browser';

import { KitDoc, Values } from '../../registry';
import { DemoEvents, FrameMessage } from '../demo-events';

/**
 * Where a demo runs: a frame of the catalog itself (`/frame/<id>`), as wide as a phone (390 px) or
 * the whole column, so a demo is seen at both sizes the kit is made for, and its fixed parts (a "+",
 * a screen over everything) stay inside it. The parameters go to the frame at every change; what
 * the demo says happened comes back and is listed under it.
 */
@Component({
  selector: 'app-demo-stage',
  imports: [MatButtonModule, MatButtonToggleModule],
  templateUrl: './demo-stage.html',
  styleUrl: './demo-stage.css',
})
export class DemoStage {
  readonly doc = input.required<KitDoc>();
  readonly values = input.required<Values>();

  protected readonly events = inject(DemoEvents);
  protected readonly width = signal<'phone' | 'desktop'>('desktop');
  /** A busy background behind the demo, to see what glass does. */
  protected readonly pattern = signal(false);

  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  private readonly sanitizer = inject(DomSanitizer);
  private ready = false;

  /** The frame's address: built once per demo (later values go by message, without reloading it). */
  protected readonly source = computed(() => {
    const doc = this.doc();
    const values = untracked(() => this.values());
    return this.sanitizer.bypassSecurityTrustResourceUrl(`frame/${doc.id}?v=${encodeURIComponent(JSON.stringify(values))}`);
  });

  constructor() {
    const listener = (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== window.location.origin || event.source !== this.frame()?.nativeElement.contentWindow) return;
      if (event.data?.type === 'kit-frame-ready') {
        this.ready = true;
        this.send();
      } else if (event.data?.type === 'kit-event') {
        this.events.add(event.data.text);
      }
    };
    window.addEventListener('message', listener);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', listener));

    effect(() => {
      this.doc();
      untracked(() => {
        this.ready = false;
        this.events.clear();
      });
    });
    effect(() => {
      this.values();
      this.pattern();
      untracked(() => this.send());
    });
  }

  private send(): void {
    const target = this.frame()?.nativeElement.contentWindow;
    if (!this.ready || !target) return;
    target.postMessage({ type: 'kit-values', values: this.values(), pattern: this.pattern() } satisfies FrameMessage, window.location.origin);
  }
}
