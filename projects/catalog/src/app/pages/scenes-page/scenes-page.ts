import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { KitServer } from '../../shared/kit-server';
import { HOME_PHONE_SCENE, HOME_SCENE } from '../../scenes';

/**
 * The Scenes tab (lenzi, 2026-11-14: "La scena dev'essere configurabile da una tab apposta"): it sends whoever
 * comes to the scene maker ("lo scene maker come ti ho descritto prima. gli utenti devono finire lí!"); the admin
 * also finds the scenes kept, the start of the gallery to come ("la sezione admin puó creare varie scene ... una
 * galleria").
 */
@Component({
  selector: 'app-scenes-page',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './scenes-page.html',
  styleUrl: './scenes-page.css',
})
export class ScenesPage {
  protected readonly server = inject(KitServer);

  /** The scenes kept, with the constant that holds each (the playground chooses them by it). */
  protected readonly kept = [
    { scene: HOME_SCENE, constant: 'HOME_SCENE' },
    { scene: HOME_PHONE_SCENE, constant: 'HOME_PHONE_SCENE' },
  ];

  protected fleetsOf(count: number): string {
    return count === 0 ? 'no fleets' : count === 1 ? '1 fleet' : `${count} fleets`;
  }
}
