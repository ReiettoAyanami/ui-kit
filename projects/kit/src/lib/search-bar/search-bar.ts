import { Component, DestroyRef, inject, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * A search bar (RULES.md, "Search bars"; substance-tracker's substances search, lenzi 2026-09-30:
 * "come la barra di Chrome … non quadrato con i bordi smussati"): an elongated circle, a magnifier at
 * the left and what it looks for written inside it instead of a floating label. It searches as it
 * is typed, once the typing pauses (300 ms), with no button; a ✕ clears it at once. Only search bars
 * have this shape. Keeping the text in the page's URL (`?q=`, replacing the entry) is the page's job.
 */
@Component({
  selector: 'lenzi-search-bar',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class LenziSearchBar {
  /** What it looks for, written inside it: "Search substances and batches". */
  readonly placeholder = input.required<string>();
  /** The text in the bar; it changes at every key. */
  readonly value = model('');
  /** How long the typing must pause before it searches, in ms. */
  readonly debounce = input(300);
  /** The text to search for: after a pause in the typing, and at once when cleared. */
  readonly search = output<string>();

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  protected typed(text: string): void {
    this.value.set(text);
    this.cancel();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.search.emit(text.trim());
    }, this.debounce());
  }

  protected clear(input: HTMLInputElement): void {
    this.cancel();
    this.value.set('');
    this.search.emit('');
    input.focus();
  }

  private cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
