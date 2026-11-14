import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { BoidShape, BoidsFollow, DEFAULT_BOIDS, LenziFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

/** A flock behind this frame, following the pointer, with a lit card over it: every parameter is the GUI's. */
@Component({
  selector: 'app-flock-background-demo',
  imports: [LenziFlockBackground, LenziLit, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './flock-background-demo.html',
  styleUrl: './flock-background-demo.css',
})
export class FlockBackgroundDemo {
  readonly values = input<Values>({});

  protected readonly standard = DEFAULT_BOIDS;

  protected num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }

  protected text(key: string, otherwise: string): string {
    return String(this.values()[key] ?? otherwise);
  }

  protected shape(): BoidShape {
    const shape = this.text('shape', 'dart');
    return shape === 'dot' || shape === 'drop' ? shape : 'dart';
  }

  protected follow(): BoidsFollow {
    const follow = this.text('follow', 'near');
    return follow === 'none' || follow === 'target' || follow === 'flee' ? follow : 'near';
  }
}
