import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { BLOB_MATERIALS, BLOB_SHAPE_NAMES, BlobMaterial, DEFAULT_BLOB_SHAPES, LenziBlobBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';

import { Value, Values } from '../../registry';

/** A list of materials as the code writes it ("'lamp', 'glass'"); the ones it does not know are left out. */
export function materialsOf(value: Value | undefined): BlobMaterial[] {
  const list = String(value ?? "'lamp'")
    .split(',')
    .map((word) => word.trim().replace(/'/g, ''))
    .filter((word): word is BlobMaterial => (BLOB_MATERIALS as readonly string[]).includes(word));
  return list.length ? list : ['lamp'];
}

/** The blobs behind this frame, with a lit card over them: every parameter is the GUI's. */
@Component({
  selector: 'app-blob-background-demo',
  imports: [LenziBlobBackground, LenziLit, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './blob-background-demo.html',
  styleUrl: './blob-background-demo.css',
})
export class BlobBackgroundDemo {
  readonly values = input<Values>({});

  /** "mixed": the kit's own choice of shapes; a name: only that shape. */
  protected readonly shapes = computed(() => {
    const chosen = String(this.values()['shapes'] ?? 'mixed');
    return chosen === 'mixed' ? DEFAULT_BLOB_SHAPES : chosen === 'all' ? BLOB_SHAPE_NAMES : [chosen];
  });

  /** The blobs' materials: the list as the code writes it ("'lamp', 'glass'"). */
  protected readonly materials = computed(() => materialsOf(this.values()['blobMaterials']));

  protected num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }

  protected text(key: string, otherwise: string): string {
    return String(this.values()[key] ?? otherwise);
  }
}
