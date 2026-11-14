import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { BLOB_SHAPE_NAMES, DEFAULT_BLOB_SHAPES, LenziBlobBackground, LenziLit } from '@lenzi/ui-kit/backgrounds';

import { Values } from '../../registry';

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

  protected num(key: string, otherwise: number): number {
    const value = Number(this.values()[key] ?? otherwise);
    return Number.isFinite(value) ? value : otherwise;
  }

  protected text(key: string, otherwise: string): string {
    return String(this.values()[key] ?? otherwise);
  }
}
