import { Component } from '@angular/core';

/**
 * A bento grid (lenzi, 2026-11-26, choosing proposal A for the catalog's overview: "vai con la a"): tiles of different
 * sizes in one grid, the size saying how much each matters (the bento grids of Apple's product pages and Atlassian
 * Design's home). Twelve columns where it is wide, six where it is medium, one on a phone; its tiles
 * (`LenziBentoTile`) say how many columns and rows they take. The grid measures itself, not the window: it works
 * beside a side bar or inside a panel.
 */
@Component({
  selector: 'lenzi-bento',
  imports: [],
  templateUrl: './bento.html',
  styleUrl: './bento.css',
})
export class LenziBento {}
