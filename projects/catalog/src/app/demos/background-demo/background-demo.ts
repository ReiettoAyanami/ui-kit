import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { LenziBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

/** A plain background behind this frame: a colour, a gradient over it, a picture under the gradient. */
@Component({
  selector: 'app-background-demo',
  imports: [LenziBackground, LenziLit, MatCardModule],
  templateUrl: './background-demo.html',
  styleUrl: './background-demo.css',
})
export class BackgroundDemo {
  readonly values = input<Values>({});

  protected num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }

  protected text(key: string, otherwise: string): string {
    return String(this.values()[key] ?? otherwise);
  }

  /** "none" is the GUI's word for no gradient. */
  protected gradient(): string {
    const gradient = this.text('gradient', 'none');
    return gradient === 'none' ? '' : gradient;
  }

  protected fit(): 'cover' | 'contain' | 'tile' {
    const fit = this.text('fit', 'cover');
    return fit === 'contain' || fit === 'tile' ? fit : 'cover';
  }
}
