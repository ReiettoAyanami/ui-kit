import { FlexibleConnectedPositionStrategy } from '@angular/cdk/overlay';
import { Component, ElementRef, booleanAttribute, computed, inject, input, output } from '@angular/core';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

import { identityColor } from '../identity-dot/identity-color';

/** One segment of the bar. */
export interface LenziSegment {
  id: number | string;
  /** How much of the whole it is: a number, or the API's decimal string ("264.000"). */
  value: number | string;
  /** Its colour (CSS). Default: the identity colour of a numeric id (with the bar's offset). */
  color?: string;
  /** Its name: the tooltip's first line and what a screen reader hears. */
  label?: string | null;
  /** The tooltip's second line: "€0.35/capsula". */
  detail?: string | null;
}

/** One segment drawn alone, out of a whole of its own (what is left of what was bought of it). */
export interface LenziOnlySegment {
  id: number | string;
  value: number | string;
  max: number | string;
}

/** MatTooltip's default delay before a long press shows the tooltip. */
const LONG_PRESS_MS = 500;

/**
 * A bar split in segments (RULES.md, "Segmented bar"; substance-tracker's stock bar, one segment per
 * batch, and its batch bar): the whole track is the maximum, each segment is as wide as its value,
 * in its identity colour, a thin separator between two, and a least width so a tiny one does not
 * vanish. Hovering a segment (a long press on touch) shows its name and a detail, just above the
 * pointer and following it. Given `only`, it draws that segment alone out of its own whole: the
 * others shrink away and it grows to its share, animated. Selectable, a tap on a segment (or just
 * above or below it) says which. It computes nothing: the numbers are the API's.
 */
@Component({
  selector: 'lenzi-segmented-bar',
  imports: [MatTooltipModule],
  templateUrl: './segmented-bar.html',
  styleUrl: './segmented-bar.css',
  host: { '[class.selectable]': 'selectable()', '(click)': 'tapped($event)' },
})
export class LenziSegmentedBar {
  readonly segments = input.required<readonly LenziSegment[]>();
  /** The whole track: what the segments are a share of. */
  readonly max = input.required<number | string>();
  /** What the bar says to a screen reader: "Stock: 272 capsula". */
  readonly label = input('');
  /** Only this segment, out of its own whole; null: every segment, out of the maximum. */
  readonly only = input<LenziOnlySegment | null>(null);
  /** Its segments can be tapped: a tap says which (`segmentSelect`) and goes no further. */
  readonly selectable = input(false, { transform: booleanAttribute });
  /** Where the segments' identity colours start in the band (0.5: a second kind of entity, as batches). */
  readonly colorOffset = input(0);
  /** What a segment without a name is called. */
  readonly unnamed = input('Unnamed');
  /** The segment tapped: its id. */
  readonly segmentSelect = output<number | string>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  /** When the current touch began; null for a mouse. */
  private touchedAt: number | null = null;

  protected readonly bars = computed(() => {
    const only = this.only();
    const max = Number(only ? only.max : this.max());
    return this.segments().map((segment, index) => {
      const shown = only === null || segment.id === only.id;
      const value = only !== null && shown ? only.value : segment.value;
      const name = segment.label ?? this.unnamed();
      return {
        index,
        id: segment.id,
        name,
        shown,
        widthPercent: shown && max > 0 ? (Number(value) / max) * 100 : 0,
        color: segment.color ?? (typeof segment.id === 'number' ? identityColor(segment.id, this.colorOffset()) : 'var(--mat-sys-primary)'),
        tooltip: segment.detail ? `${name}\n${segment.detail}` : name,
      };
    });
  });

  /**
   * The tooltip follows the mouse. MatTooltip only anchors it where the mouse came in
   * (matTooltipPositionAtOrigin), so this moves that anchor. `_overlayRef` is a Material internal:
   * if it changes, the tooltip stays where the mouse came in (and the spec says so).
   */
  protected follow(event: MouseEvent, tooltip: MatTooltip): void {
    const overlay = tooltip._overlayRef;
    const strategy = overlay?.getConfig().positionStrategy;
    if (overlay && strategy instanceof FlexibleConnectedPositionStrategy) {
      strategy.setOrigin({ x: event.clientX, y: event.clientY });
      overlay.updatePosition();
    }
  }

  protected pointerDown(event: PointerEvent): void {
    this.touchedAt = event.pointerType === 'mouse' ? null : event.timeStamp;
  }

  /**
   * A long press only shows the tooltip. Some browsers follow it with a click on release, which
   * must not reach the parent: a card would open its page over the tooltip. A tap still does.
   */
  protected segmentClick(event: MouseEvent): void {
    if (this.touchedAt !== null && event.timeStamp - this.touchedAt >= LONG_PRESS_MS) event.stopPropagation();
    this.touchedAt = null;
  }

  /** A tap on the bar: on a segment, or above or below one, it is that segment's. */
  protected tapped(event: MouseEvent): void {
    if (!this.selectable()) return;
    let segment = (event.target as Element | null)?.closest<HTMLElement>('.segment');
    if (!segment) {
      // In the room above or below the track: the segment at the same x, in the track's middle.
      const track = this.host.nativeElement.querySelector('.track')!.getBoundingClientRect();
      segment = document.elementFromPoint?.(event.clientX, track.top + track.height / 2)?.closest<HTMLElement>('.segment') ?? null;
    }
    const bar = segment ? this.bars()[Number(segment.dataset['index'])] : undefined;
    if (!bar) return; // the part not covered by segments: the parent's tap
    event.stopPropagation();
    this.segmentSelect.emit(bar.id);
  }

  /** Enter or Space on a segment, from the keyboard. */
  protected pressed(event: Event, id: number | string): void {
    if (!this.selectable()) return;
    event.preventDefault();
    event.stopPropagation();
    this.segmentSelect.emit(id);
  }
}
