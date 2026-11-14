import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { BoidShape, BoidsFollow, DEFAULT_BOIDS, DEFAULT_BLOBS, LenziBlobFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { LenziCat } from '@lenzi/ui-kit/svgs';

import { Values } from '../../registry';

/**
 * Blobs and a flock flying round them behind this frame, a lit card over them, and the cat watching: the
 * pointer, or the nearest boid when the pointer is out of the frame. Every parameter is the GUI's.
 */
@Component({
  selector: 'app-blob-flock-background-demo',
  imports: [LenziBlobFlockBackground, LenziCat, LenziLit, MatCardModule],
  templateUrl: './blob-flock-background-demo.html',
  styleUrl: './blob-flock-background-demo.css',
})
export class BlobFlockBackgroundDemo {
  readonly values = input<Values>({});

  protected readonly boids = DEFAULT_BOIDS;
  protected readonly blobs = DEFAULT_BLOBS;

  protected num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }

  protected text(key: string, otherwise: string): string {
    return String(this.values()[key] ?? otherwise);
  }

  protected shape(otherwise: BoidShape): BoidShape {
    const shape = this.text('shape', otherwise);
    return shape === 'dot' || shape === 'dart' || shape === 'drop' ? shape : otherwise;
  }

  protected follow(): BoidsFollow {
    const follow = this.text('follow', 'near');
    return follow === 'none' || follow === 'target' || follow === 'flee' ? follow : 'near';
  }
}
