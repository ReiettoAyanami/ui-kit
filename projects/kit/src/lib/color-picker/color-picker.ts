import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LenziHsv, hexToHsv, hsvToHex, parseHexColor, toHexColor } from './color';

/** A colour the selector offers under its own controls: one of an app's palette. */
export interface LenziColorChoice {
  /** Any CSS colour: a hex, a variable (`var(--mat-sys-primary)`). */
  value: string;
  /** Its name: what its tooltip and a screen reader say. */
  label: string;
}

/** Under the swatch, from its left edge or its right one; above it when there is no room under. */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

const clamp = (value: number, max = 1) => Math.min(max, Math.max(0, value));

/** The browser's own way of picking a colour from the screen (Chromium), where it exists. */
type EyeDropperWindow = Window & { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } };

/**
 * A colour you change from the colour itself (lenzi, 2026-11-12: "se mostri un colore o che, fammi
 * cliccare sul colore e mostrare un selector di colore"): a round swatch; a click opens the colour
 * selector under it, a glass panel like a menu's, with the shade (saturation and brightness), the
 * hue, the hex, a pick from the screen where the browser has one, and the colours the app offers.
 * The colour follows the selector at once (`[(value)]`); `picked` says the final one when the
 * selector closes. Its click never reaches what is around it (a card that opens on a tap).
 *
 * There is always a way back (lenzi, 2026-11-12: "Need a way to go back and put a snackbar asking sum
 * like "U sure?" because now i changed a color without a wai to go back"): in the selector, a button
 * goes back to the colour it opened with; when it closes with another colour, a snackbar asks to keep
 * it and its action goes back.
 */
@Component({
  selector: 'lenzi-color-picker',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
})
export class LenziColorPicker {
  /** The colour: any CSS colour comes in (a hex, `oklch()`, a variable); what is picked goes out as `#rrggbb`. */
  readonly value = model.required<string>();
  /** What the colour is, for a screen reader: "Shift colour". */
  readonly label = input.required<string>();
  /** The colours offered under the selector: the app's palette. None: only the selector. */
  readonly choices = input<readonly LenziColorChoice[]>([]);
  /** The swatch's diameter, in px. */
  readonly size = input(32);
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * When the selector closes with another colour, a snackbar asks to keep it and offers the way back.
   * Off only where the app gives its own way back.
   */
  readonly confirm = input(true, { transform: booleanAttribute });
  /** The colour when the selector closes, if it changed, and again when the snackbar goes back: the moment to save it. */
  readonly picked = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly snackBar = inject(MatSnackBar);
  private readonly swatch = viewChild.required<ElementRef<HTMLButtonElement>>('swatch');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly area = viewChild<ElementRef<HTMLElement>>('area');

  protected readonly positions = POSITIONS;
  protected readonly open = signal(false);
  protected readonly canSample = typeof window !== 'undefined' && 'EyeDropper' in window;

  /** The colour as the selector works with it. */
  protected readonly hex = computed(() => toHexColor(this.value(), this.host.nativeElement));
  /** The hex the selector itself wrote last: its own thumbs do not move when it comes back. */
  private own: string | null = null;
  /** Where the thumbs are. Kept while the colour is the selector's own (a hex loses the hue of a grey). */
  protected readonly hsv = linkedSignal<string, LenziHsv>({
    source: this.hex,
    computation: (hex, previous) => (previous && hex === this.own ? previous.value : hexToHsv(hex, previous?.value.h)),
  });
  /** The hex field: the colour, or what is being typed while it means the same colour. */
  protected readonly text = linkedSignal<string, string>({
    source: this.hex,
    computation: (hex, previous) => (previous && parseHexColor(previous.value) === hex ? previous.value : hex),
  });
  protected readonly wrong = computed(() => parseHexColor(this.text()) === null);
  protected readonly offered = computed(() => this.choices().map((choice) => ({ ...choice, hex: toHexColor(choice.value, this.host.nativeElement) })));

  /** The colour when the selector opened: where its "back" goes. */
  protected readonly before = signal('');
  private dragging: 'area' | 'hue' | null = null;
  /** The question on screen, if any; it leaves with the picker (its way back would lead nowhere). */
  private asked: MatSnackBarRef<TextOnlySnackBar> | null = null;
  private gone = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.gone = true;
      this.asked?.dismiss();
    });
  }

  protected percent(part: number): number {
    return Math.round(part * 100);
  }

  protected degrees(hue: number): number {
    return Math.round(hue);
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (this.open()) {
      this.close();
      return;
    }
    this.before.set(this.hex());
    this.open.set(true);
    afterNextRender(() => this.area()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * Closed by a click outside, Escape, or the swatch again: the focus goes back to the swatch; if the
   * colour is another one, it goes out and a snackbar asks to keep it.
   */
  protected close(): void {
    if (!this.open()) return;
    const active = document.activeElement;
    const insideOrNowhere = !active || active === document.body || this.panel()?.nativeElement.contains(active) === true;
    this.open.set(false);
    if (insideOrNowhere) this.swatch().nativeElement.focus();
    const before = this.before();
    const hex = this.hex();
    if (hex === before) return;
    this.picked.emit(hex);
    if (this.confirm()) this.ask(before, hex);
  }

  /** In the selector: back to the colour it opened with. */
  protected back(): void {
    this.choose(this.before());
  }

  /** "Keep it?": the action goes back to the colour before, unless the colour moved again meanwhile. */
  private ask(before: string, now: string): void {
    const asked = this.snackBar.open(`${this.label()} is now ${now}. Keep it?`, 'Go back', { duration: 8000 });
    this.asked = asked;
    asked.onAction().subscribe(() => {
      if (this.gone || this.hex() !== now) return;
      this.choose(before);
      this.picked.emit(before);
    });
    asked.afterDismissed().subscribe(() => {
      if (this.asked === asked) this.asked = null;
    });
  }

  protected press(part: 'area' | 'hue', event: PointerEvent): void {
    if (event.button !== 0) return;
    const element = event.currentTarget as HTMLElement;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is gone already: the colour still goes where it pressed.
    }
    event.preventDefault();
    element.focus();
    this.dragging = part;
    this.moveTo(part, event);
  }

  protected drag(part: 'area' | 'hue', event: PointerEvent): void {
    if (this.dragging === part) this.moveTo(part, event);
  }

  protected release(): void {
    this.dragging = null;
  }

  private moveTo(part: 'area' | 'hue', event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = clamp((event.clientX - box.left) / box.width);
    const y = clamp((event.clientY - box.top) / box.height);
    if (part === 'area') this.apply({ ...this.hsv(), s: x, v: 1 - y });
    else this.apply({ ...this.hsv(), h: x * 360 });
  }

  /** Arrows move the shade by 1%, with Shift by 10%: left and right the saturation, up and down the brightness. */
  protected keyArea(event: KeyboardEvent): void {
    const step = event.shiftKey ? 0.1 : 0.01;
    const { s, v } = this.hsv();
    const moved =
      event.key === 'ArrowLeft'
        ? { s: clamp(s - step) }
        : event.key === 'ArrowRight'
          ? { s: clamp(s + step) }
          : event.key === 'ArrowUp'
            ? { v: clamp(v + step) }
            : event.key === 'ArrowDown'
              ? { v: clamp(v - step) }
              : null;
    if (!moved) return;
    event.preventDefault();
    this.apply({ ...this.hsv(), ...moved });
  }

  /** Arrows move the hue by 1°, with Shift by 10°; Home and End go to its ends. */
  protected keyHue(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 1;
    const { h } = this.hsv();
    const hue =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? clamp(h - step, 360)
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? clamp(h + step, 360)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 360
              : null;
    if (hue === null) return;
    event.preventDefault();
    this.apply({ ...this.hsv(), h: hue });
  }

  /** Typed: a whole colour applies at once ("#f59" may still be the start of "#f59a00"). */
  protected typed(text: string): void {
    this.text.set(text);
    if (/^#?[0-9a-f]{6}$/i.test(text.trim())) this.choose(parseHexColor(text)!);
  }

  /**
   * Typing is over (Enter, or the field left): a short "#f59" counts, anything else goes back to the
   * colour. The field is written here too: typed and left before the page was drawn again, it would
   * keep what was typed.
   */
  protected settle(field: HTMLInputElement): void {
    const hex = parseHexColor(this.text());
    if (hex && hex !== this.hex()) this.choose(hex);
    this.text.set(this.hex());
    field.value = this.hex();
  }

  protected choose(hex: string): void {
    this.apply(hexToHsv(hex, this.hsv().h), hex);
  }

  protected async sample(): Promise<void> {
    try {
      const { sRGBHex } = await new (window as unknown as EyeDropperWindow).EyeDropper().open();
      this.choose(toHexColor(sRGBHex));
    } catch {
      // Closed without a colour.
    }
  }

  private apply(hsv: LenziHsv, hex = hsvToHex(hsv)): void {
    this.own = hex;
    this.hsv.set(hsv);
    this.value.set(hex);
  }
}
