import { NgTemplateOutlet } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

/** Surfaces over a background, lit by it or solid as they are without `lenziLit`: a card, a bar, buttons. */
@Component({
  selector: 'app-lit-surface-demo',
  imports: [LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziLit, MatButtonModule, MatCardModule, MatIconModule, NgTemplateOutlet],
  templateUrl: './lit-surface-demo.html',
  styleUrl: './lit-surface-demo.css',
})
export class LitSurfaceDemo {
  readonly values = input<Values>({});

  protected readonly behind = computed(() => String(this.values()['behind'] ?? 'blobs'));
  protected readonly lit = computed(() => this.values()['lit'] !== false);

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const values = this.values();
      root.classList.toggle('reduce-transparency', values['reduce'] === true);
      root.style.setProperty('--lenzi-lit-glass', `${values['glass'] ?? 46}%`);
      root.style.setProperty('--lenzi-lit-veil', `${values['veil'] ?? 34}%`);
      root.style.setProperty('--lenzi-lit-rim', `${values['rim'] ?? 80}%`);
    });
    inject(DestroyRef).onDestroy(() => {
      root.classList.remove('reduce-transparency');
      for (const name of ['--lenzi-lit-glass', '--lenzi-lit-veil', '--lenzi-lit-rim']) root.style.removeProperty(name);
    });
  }
}
