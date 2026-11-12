import { Component, ElementRef, booleanAttribute, computed, inject, input, output } from '@angular/core';

/** Any CSS colour (a variable, oklch, rgb) as the #rrggbb a colour picker takes; black when it cannot tell. */
export function toHex(css: string, host?: HTMLElement): string {
  if (/^#[0-9a-f]{6}$/i.test(css)) return css.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(css)) return css.slice(0, 7).toLowerCase();
  if (typeof document === 'undefined') return '#000000';
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = css.startsWith('--') ? `var(${css})` : css;
  (host ?? document.body).appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return '#000000';
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A colour you can click (lenzi, 2026-11-12: "se mostri un colore o che, fammi cliccare sul colore e
 * mostrare un selector di colore"): a round swatch of the colour; a click opens the browser's colour
 * selector (a gradient, the hue, an eyedropper, the hex), and what is picked goes out as #rrggbb.
 * Without `editable` it only shows the colour.
 */
@Component({
  selector: 'app-color-swatch',
  imports: [],
  templateUrl: './color-swatch.html',
  styleUrl: './color-swatch.css',
})
export class ColorSwatch {
  /** The colour shown: any CSS colour, or a variable's name (`--mat-sys-primary`). */
  readonly color = input.required<string>();
  /** What the colour is, for a screen reader: "Primary". */
  readonly label = input.required<string>();
  readonly editable = input(true, { transform: booleanAttribute });
  /** The swatch's size, in px. */
  readonly size = input(32);
  readonly picked = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly background = computed(() => (this.color().startsWith('--') ? `var(${this.color()})` : this.color()));
  protected readonly hex = computed(() => toHex(this.color(), this.host.nativeElement));
}
