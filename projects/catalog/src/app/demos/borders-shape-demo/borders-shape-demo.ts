import { Component, DOCUMENT, DestroyRef, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Values } from '../../registry';

/** Every kind of border the kit sets, at the width chosen: corners as thick as the sides. */
@Component({
  selector: 'app-borders-shape-demo',
  imports: [MatButtonModule, MatButtonToggleModule, MatCardModule, MatChipsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './borders-shape-demo.html',
  styleUrl: './borders-shape-demo.css',
})
export class BordersShapeDemo {
  readonly values = input<Values>({});

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.style.setProperty('--kit-border', `${this.values()['border'] ?? 2}px`));
    inject(DestroyRef).onDestroy(() => root.style.removeProperty('--kit-border'));
  }
}
