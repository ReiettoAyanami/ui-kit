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
 * the demo says happened comes back and is listed under it. The frame is also told how much of it is
 * under the window's bottom edge, so a snackbar it opens is seen without scrolling to its end.
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
  /** The part of the frame under the window's edge, as last sent (px). */
  private cut = -1;
  private measuring = 0;

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
        this.cut = -1;
        this.send();
        this.sendCut();
      } else if (event.data?.type === 'kit-event') {
        this.events.add(event.data.text);
      }
    };
    // Whatever scrolls (the window, the shell's content) or resizes moves the frame against the window's edge.
    const moved = () => {
      cancelAnimationFrame(this.measuring);
      this.measuring = requestAnimationFrame(() => this.sendCut());
    };
    window.addEventListener('message', listener);
    window.addEventListener('resize', moved);
    document.addEventListener('scroll', moved, { capture: true, passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('message', listener);
      window.removeEventListener('resize', moved);
      document.removeEventListener('scroll', moved, { capture: true });
      cancelAnimationFrame(this.measuring);
    });

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

  /** Says how much of the frame is under the window's bottom edge (never all of it: 96 px stay for what opens there). */
  private sendCut(): void {
    const frame = this.frame()?.nativeElement;
    if (!this.ready || !frame?.contentWindow) return;
    const box = frame.getBoundingClientRect();
    const cut = Math.round(Math.min(Math.max(0, box.bottom - window.innerHeight), Math.max(0, box.height - 96)));
    if (cut === this.cut) return;
    this.cut = cut;
    frame.contentWindow.postMessage({ type: 'kit-frame-cut', bottom: cut } satisfies FrameMessage, window.location.origin);
  }

  private send(): void {
    const target = this.frame()?.nativeElement.contentWindow;
    if (!this.ready || !target) return;
    target.postMessage({ type: 'kit-values', values: this.values(), pattern: this.pattern() } satisfies FrameMessage, window.location.origin);
  }
}
