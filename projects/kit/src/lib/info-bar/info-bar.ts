import { Component, booleanAttribute, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * A bar that stands out from every page, never in glass (RULES.md, "Bars"; substance-tracker's
 * offline bar, "Viewing as" bar and update bar, the same shape three times): an icon, a sentence,
 * at most one action. It cannot be closed: it goes when what it says stops being true. In the app
 * shell it sits above the top bar (`lenziShellBanner`: "Viewing as") or under it (`lenziShellBelow`:
 * "Offline · data from 14:32", "A new version is available").
 */
@Component({
  selector: 'lenzi-info-bar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './info-bar.html',
  styleUrl: './info-bar.css',
})
export class LenziInfoBar {
  /** A Material icon: "cloud_off", "visibility", "system_update". */
  readonly icon = input<string | null>(null);
  /**
   * neutral: a state of the app (offline); secondary: news (an update);
   * tertiary: something unusual the user must not forget (acting as someone else).
   */
  readonly tone = input<'neutral' | 'secondary' | 'tertiary'>('neutral');
  /** The action's label, a whole word: "Exit", "Download". None: no action. */
  readonly actionLabel = input<string | null>(null);
  /** The action is a link out (a download): its address. Without it the action says `action`. */
  readonly actionHref = input<string | null>(null);
  /** The action is running: disabled (no double tap). */
  readonly actionDisabled = input(false, { transform: booleanAttribute });
  readonly action = output<void>();
}
