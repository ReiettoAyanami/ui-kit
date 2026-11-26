import { Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

/**
 * One tile of a `LenziBento`: a panel of the page (`.lenzi-surface`: in an app of Liquid Glass it is glass, its edge lit
 * by what is under it). `span` columns of twelve and `rows` rows where the grid is wide; where it is medium, the whole
 * row for a wide tile (six columns or more), half the columns for the others (rounded up); the whole width and its own height on a phone. On an `<a>` (`a[lenziBentoTile]`) the whole tile is
 * the link.
 */
@Component({
  selector: 'lenzi-bento-tile, a[lenziBentoTile]',
  imports: [],
  templateUrl: './bento-tile.html',
  styleUrl: './bento-tile.css',
  host: {
    class: 'lenzi-surface lenzi-bento-tile',
    '[class.lenzi-bento-tile-flat]': 'flat()',
    '[style.--lenzi-tile-span]': 'columns()',
    '[style.--lenzi-tile-span-medium]': 'mediumColumns()',
    '[style.--lenzi-tile-rows]': 'height()',
  },
})
export class LenziBentoTile {
  /** Columns of twelve it takes where the grid is wide (1 to 12). */
  readonly span = input(4, { transform: numberAttribute });
  /** Rows it takes (1 or more); on a phone its own height. */
  readonly rows = input(1, { transform: numberAttribute });
  /** No panel of its own (no fill, border or padding): a tile whose content is its own panel or a picture. */
  readonly flat = input(false, { transform: booleanAttribute });

  protected readonly columns = computed(() => Math.min(12, Math.max(1, Math.round(this.span() || 1))));
  /** Where the grid is medium (six columns): a wide tile (six or more) the whole row, the others half, rounded up. */
  protected readonly mediumColumns = computed(() => (this.columns() >= 6 ? 6 : Math.ceil(this.columns() / 2)));
  protected readonly height = computed(() => Math.max(1, Math.round(this.rows() || 1)));
}
