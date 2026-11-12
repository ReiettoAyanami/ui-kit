import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

/** One action of a card's menu. */
export interface KitMenuAction {
  /** Which action it is: what `action` says. */
  id: string;
  /** Whole words: "Edit", "Delete", "Details". */
  label: string;
  /** A Material icon before the label. */
  icon?: string;
  /** It destroys something: in the error colour (and it asks first: KitConfirmDialog). */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * The ⋮ of a card (RULES.md, "Cards"; substance-tracker's substance, consumption and user cards):
 * three vertical dots at the card's top right, opening a Material menu of the card's actions (Edit,
 * Delete, Details). Its taps never reach the card, which opens its page or its details on a tap.
 * Delete always asks first, and is in the error colour.
 */
@Component({
  selector: 'kit-card-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './card-menu.html',
  styleUrl: './card-menu.css',
})
export class KitCardMenu {
  readonly actions = input.required<readonly KitMenuAction[]>();
  /** The button's accessible name: what the card is ("Actions for Birra"). */
  readonly label = input('More actions');
  /** The action chosen: its id. */
  readonly action = output<string>();

  protected stop(event: Event): void {
    event.stopPropagation();
  }
}
