import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

import { LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';

import { KitFiles } from '../../shared/kit-files';
import { Markdown } from '../../shared/markdown/markdown';

/** A document of the kit as a page: RULES.md (the look) or AI-RULES.md (how Claude works with the kit). */
@Component({
  selector: 'app-markdown-page',
  imports: [LenziStatusMessage, Markdown, MatIconModule],
  templateUrl: './markdown-page.html',
  styleUrl: './markdown-page.css',
})
export class MarkdownPage {
  /** The file, relative to projects/kit (route data). */
  readonly file = input.required<string>();
  /** rules: for everyone; ai: instructions for Claude. */
  readonly kind = input<'rules' | 'ai'>('rules');

  private readonly files = inject(KitFiles);

  protected readonly document = rxResource({ params: () => this.file(), stream: ({ params }) => this.files.text(params) });
  protected readonly failure = computed(() => (this.document.error() ? couldNotLoad(this.file(), this.document.error()) : null));
}
