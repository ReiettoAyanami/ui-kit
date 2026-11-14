import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LenziColorChoice, LenziColorPicker } from '@lenzi/ui-kit';
import { LenziGlow, LenziLit, LenziSolid } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

type Kind = 'bulb' | 'button' | 'card' | 'block' | 'list' | 'chip' | 'toggles';

interface Item {
  kind: Kind;
  name: string;
  /** A lamp, switched on (a glass element only). */
  on: boolean;
  color: string;
  /** Solid (lenziSolid: it casts shadows) or glass (lenziGlow: lit, and a lamp when on). */
  solid: boolean;
}

/**
 * What the playground starts with: some lamps on, some surfaces only lit, one solid block; violets and
 * whites only (lenzi, 2026-11-14: "put from default only purplish/whiteish lights").
 */
const START: readonly Item[] = [
  { kind: 'bulb', name: 'Bulb', on: true, color: '#f4ecff', solid: false },
  { kind: 'button', name: 'Button', on: true, color: 'var(--mat-sys-primary)', solid: false },
  { kind: 'block', name: 'Block', on: false, color: '#ffffff', solid: true },
  { kind: 'card', name: 'Card', on: false, color: '#b388ff', solid: false },
  { kind: 'list', name: 'List', on: false, color: '#e6d6ff', solid: false },
  { kind: 'chip', name: 'Chip', on: true, color: '#9c6bff', solid: false },
  { kind: 'toggles', name: 'Toggles', on: false, color: '#d0b8ff', solid: false },
];

/**
 * Glowing elements on a dark floor, with nothing else giving light (lenzi, 2026-11-14: "Make a playground
 * with a dark background (so there are no other lights coming off off it) and let me move elements
 * around"): the kit's own elements, each glass (lit, and a lamp when switched on, in any colour) or solid
 * (it casts a faint hard shadow: "for if a solid component is interacting with light"). The floor is lit
 * too, under them, so the shadows fall on it. Drag them from anywhere; the bar above each has its colour,
 * its light switch and its material.
 */
@Component({
  selector: 'app-glow-demo',
  imports: [
    CdkDrag,
    LenziColorPicker,
    LenziGlow,
    LenziLit,
    LenziSolid,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    NgTemplateOutlet,
  ],
  templateUrl: './glow-demo.html',
  styleUrl: './glow-demo.css',
})
export class GlowDemo {
  readonly values = input<Values>({});

  protected readonly items = signal<Item[]>(START.map((item) => ({ ...item })));
  protected readonly all = computed(() => this.values()['lights'] !== false);
  protected readonly strength = computed(() => this.num('strength', 1));
  protected readonly reach = computed(() => this.num('reach', 220));

  protected readonly choices: LenziColorChoice[] = [
    { value: 'var(--mat-sys-primary)', label: 'Violet' },
    { value: '#9c6bff', label: 'Deep violet' },
    { value: '#b388ff', label: 'Lavender' },
    { value: '#d0b8ff', label: 'Lilac' },
    { value: '#e6d6ff', label: 'Pale lilac' },
    { value: '#f4ecff', label: 'Violet white' },
    { value: '#ffffff', label: 'White' },
    { value: 'var(--mat-sys-tertiary)', label: 'Cyan' },
    { value: '#ffb74d', label: 'Amber' },
    { value: '#ff4f8b', label: 'Pink' },
  ];

  /** When the last drag ended: the click that ends a drag is not a tap. */
  private droppedAt = 0;

  constructor() {
    // the amounts of the lamps' light and of the shadows are global variables: here they follow the parameters
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      root.style.setProperty('--lenzi-glow-veil', `${this.num('veil', 70)}%`);
      root.style.setProperty('--lenzi-glow-rim', `${this.num('rim', 100)}%`);
      root.style.setProperty('--lenzi-shadow', `${this.num('shadow', 60)}%`);
    });
    inject(DestroyRef).onDestroy(() => {
      for (const name of ['--lenzi-glow-veil', '--lenzi-glow-rim', '--lenzi-shadow']) root.style.removeProperty(name);
    });
  }

  protected dropped(): void {
    this.droppedAt = performance.now();
  }

  /** The bulb switches itself on and off at a tap. */
  protected tapped(index: number): void {
    if (performance.now() - this.droppedAt > 250) this.switch(index);
  }

  protected switch(index: number): void {
    this.change(index, (item) => ({ on: !item.on }));
  }

  protected solidify(index: number): void {
    this.change(index, (item) => ({ solid: !item.solid }));
  }

  protected paint(index: number, color: string): void {
    this.change(index, () => ({ color }));
  }

  private change(index: number, change: (item: Item) => Partial<Item>): void {
    this.items.update((items) => items.map((item, at) => (at === index ? { ...item, ...change(item) } : item)));
  }

  private num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }
}
