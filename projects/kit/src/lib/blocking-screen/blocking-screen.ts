import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * A screen over everything that cannot be closed (substance-tracker `ui/update-notice`, "Update
 * required"): when the app cannot go on until the user does something outside it. A card in the
 * middle with an icon, a title, what happened and what to do, and one way out. Nothing behind it can
 * be reached. Only for what truly blocks: anything else is an info bar.
 */
@Component({
  selector: 'lenzi-blocking-screen',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './blocking-screen.html',
  styleUrl: './blocking-screen.css',
  host: { '[class.inline]': "placement() === 'inline'" },
})
export class LenziBlockingScreen {
  /** A Material icon: "system_update", "dns". */
  readonly icon = input<string | null>(null);
  /** What happened, in a few words: "Update required". */
  readonly title = input.required<string>();
  /** The way out, in whole words: "Download the update". */
  readonly actionLabel = input<string | null>(null);
  /** The way out is a link (a download): its address. Without it the action says `action`. */
  readonly actionHref = input<string | null>(null);
  /** flat: the way out the user should take; stroked: the only one there is, but not a good one. */
  readonly actionKind = input<'flat' | 'stroked'>('flat');
  /** fixed: over everything (the only place in an app); inline: inside its host (the catalog's demos). */
  readonly placement = input<'fixed' | 'inline'>('fixed');
  readonly action = output<void>();
}
