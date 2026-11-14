import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { BoidShape, BoidsFollow, DEFAULT_BOIDS, DEFAULT_BLOBS, LenziBlobFlock, LenziBlobFlockBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';
import { LenziCat } from '@lenzi/ui-kit/svgs';

import { Values } from '../../registry';
import { materialsOf } from '../blob-background-demo/blob-background-demo';

/**
 * Blobs of lamps and glass (and solid) and flocks flying round them behind this frame: the boids, and
 * fleets of blob-boids of each material that melt into their own and fly round the rest; a lit card over
 * them, and the cat watching. Every parameter is the GUI's.
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

  /** The blobs' materials: the list as the code writes it. */
  protected readonly materials = computed(() => materialsOf(this.values()['blobMaterials'] ?? "'lamp', 'glass'"));

  /** One fleet of blob-boids for each material that has some. */
  protected readonly fleets = computed<LenziBlobFlock[]>(() =>
    (['lamp', 'glass', 'solid'] as const)
      .map((material) => ({ material, count: this.num(`${material}Boids`, material === 'solid' ? 0 : 16), colonies: 2 }))
      .filter((fleet) => fleet.count > 0),
  );

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
