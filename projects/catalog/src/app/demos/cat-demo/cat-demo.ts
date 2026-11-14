import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, input, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { LenziColorChoice, LenziColorPicker } from '@lenzi/ui-kit';
import { LenziBackground, LenziBlobBackground, LenziFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { LenziCat, LenziCatMaterial, LenziCatMood } from '@lenzi/ui-kit/svgs';

import { Values } from '../../registry';

interface Item {
  mood: LenziCatMood;
  name: string;
  material: LenziCatMaterial;
  color: string;
}

/** What the playground starts with: one cat of each kind, two of them lamps, one glass, one solid. */
const START: readonly Item[] = [
  { mood: 'happy', name: 'Happy', material: 'lamp', color: '#b388ff' },
  { mood: 'sleepy', name: 'Sleepy', material: 'glass', color: '#e6d6ff' },
  { mood: 'sad', name: 'Sad', material: 'solid', color: '#d0b8ff' },
  { mood: 'back', name: 'From behind', material: 'plain', color: '#9c6bff' },
  { mood: 'builder', name: 'Builder', material: 'lamp', color: '#f4ecff' },
];

/**
 * lenzi's cats on a dark floor (2026-11-14: "fammi una pagina dove posso vedere gli effetti dei materiali
 * sulle varie icone"): each one in a material of the kit, changed from the bar above it, and moved by
 * dragging, so the lamps light the others and the solid ones cast their shadow on the floor.
 */
@Component({
  selector: 'app-cat-demo',
  imports: [CdkDrag, LenziBackground, LenziBlobBackground, LenziCat, LenziColorPicker, LenziFlockBackground, LenziLit, MatButtonToggleModule, MatIconModule],
  templateUrl: './cat-demo.html',
  styleUrl: './cat-demo.css',
})
export class CatDemo {
  readonly values = input<Values>({});

  protected readonly items = signal<Item[]>(START.map((item) => ({ ...item })));
  protected readonly size = computed(() => this.num('size', 120));
  protected readonly animated = computed(() => this.values()['animated'] !== false);
  protected readonly strength = computed(() => this.num('strength', 1));
  protected readonly reach = computed(() => this.num('reach', 220));
  protected readonly behind = computed(() => String(this.values()['behind'] ?? 'dark'));

  protected readonly materials: readonly { value: LenziCatMaterial; label: string }[] = [
    { value: 'plain', label: 'Plain' },
    { value: 'glass', label: 'Glass' },
    { value: 'lamp', label: 'Lamp' },
    { value: 'solid', label: 'Solid' },
  ];

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

  protected make(index: number, material: LenziCatMaterial): void {
    this.change(index, { material });
  }

  protected paint(index: number, color: string): void {
    this.change(index, { color });
  }

  private change(index: number, change: Partial<Item>): void {
    this.items.update((items) => items.map((item, at) => (at === index ? { ...item, ...change } : item)));
  }

  private num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }
}
