import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DocView } from '../../shared/doc-view/doc-view';
import { LenziGlassPage, LenziLit, lenziOverBackground } from '@lenzi/ui-kit/backgrounds';

/** A document of the kit as a page, to read and to change: RULES.md (the look) or AI-RULES.md (how Claude works with the kit). */
@Component({
  selector: 'app-markdown-page',
  imports: [DocView, LenziGlassPage, LenziLit, MatIconModule],
  templateUrl: './markdown-page.html',
  styleUrl: './markdown-page.css',
})
export class MarkdownPage {
  /** Over a background its surfaces are lit, solid without one (RULES.md, 2026-11-17). */
  protected readonly lit = lenziOverBackground();

  /** The file, relative to projects/kit (route data). */
  readonly file = input.required<string>();
  /** rules: for everyone; ai: instructions for Claude. */
  readonly kind = input<'rules' | 'ai'>('rules');
}
