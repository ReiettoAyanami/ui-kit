import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * A card whose top is a preview of what it opens (lenzi, 2026-11-14: a gallery "con una scheda che poi va
 * aggiunta ... usa questa di youtube come base, paddin ai lati leggermente meno, al posto della thumbnail metti
 * iframe della scena, ma fai partire solo la simulazione di quella on hover"): YouTube's video card. The preview
 * (a picture, a frame) in a rounded box, under it the title, bold, and its facts one a line; an icon in a round
 * well before them when given; the card's ⋮ (`LenziCardMenu`) beside the title. The whole card opens on a tap,
 * the menu apart. It says when it is pointed at or the keyboard is on it (`active`), so the page starts the
 * preview only then.
 */
@Component({
  selector: 'lenzi-preview-card',
  imports: [MatIconModule],
  templateUrl: './preview-card.html',
  styleUrl: './preview-card.css',
  host: {
    '[class.active]': 'active()',
    '(pointerenter)': 'set("pointed", true)',
    '(pointerleave)': 'set("pointed", false)',
    '(focusin)': 'set("focused", keyboardOn($event))',
    '(focusout)': 'set("focused", false)',
  },
})
export class LenziPreviewCard {
  /** What it opens: bold, two lines at most. */
  readonly title = input.required<string>();
  /** Its facts, one a line ("6 blobs", "Saved on 15 November"): never two joined on one line. */
  readonly lines = input<readonly string[]>([]);
  /** A Material icon in a round well before the title (YouTube's channel picture); none by default. */
  readonly icon = input<string | null>(null);
  /** The preview's shape, width to height (CSS `aspect-ratio`). */
  readonly ratio = input('16 / 9');
  /** The card was tapped (or Enter on it): the page opens what it shows. */
  readonly opened = output<void>();
  /** The pointer came over it or left, the keyboard came on it or left: when to start and stop the preview. */
  readonly activeChange = output<boolean>();

  protected readonly pointed = signal(false);
  protected readonly focused = signal(false);
  /** Pointed at, or the keyboard on it. */
  readonly active = computed(() => this.pointed() || this.focused());

  protected set(which: 'pointed' | 'focused', on: boolean): void {
    const before = this.active();
    this[which].set(on);
    if (this.active() !== before) this.activeChange.emit(this.active());
  }

  /** Focus that came from the keyboard: a tap leaves focus on the card too, and that is not looking at it. */
  protected keyboardOn(event: FocusEvent): boolean {
    try {
      return (event.target as Element).matches(':focus-visible');
    } catch {
      return true;
    }
  }
}
