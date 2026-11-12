import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/**
 * An address that does not exist (substance-tracker and vtiger-reader `not-found-page`): an old
 * address, a typo, a page of someone else all look the same, a card in the middle of the page with
 * one way out. Route it as the app's `**`. A second action, if the app needs one, goes inside it.
 */
@Component({
  selector: 'kit-not-found',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class KitNotFound {
  /** The way out, in whole words: "Go to the tickets", "Sign in". */
  readonly linkLabel = input.required<string>();
  /** Where it goes: a router link. */
  readonly link = input.required<string | readonly unknown[]>();
  // As a route's component (`{ path: '**', component: KitNotFound }`), the router binds every input it
  // has no data for to undefined: the defaults hold then too.
  readonly code = input('404', { transform: (value: string | undefined) => value ?? '404' });
  readonly title = input('Page not found', { transform: (value: string | undefined) => value ?? 'Page not found' });
  readonly text = input('There is nothing at this address.', {
    transform: (value: string | undefined) => value ?? 'There is nothing at this address.',
  });
}
