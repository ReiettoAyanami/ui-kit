import { Component, ElementRef, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Marked } from 'marked';

import { highlight } from '../highlight';

/** One Markdown renderer for the catalog: code blocks coloured, headings with an id to link to. */
const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      return `<pre class="code"><code class="hljs">${highlight(text, lang ?? '')}</code></pre>`;
    },
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = text
        .replace(/<[^>]+>/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
  },
});

/**
 * A Markdown file of the kit (RULES.md, AI-RULES.md, a component's README.md and AI.md), as a page.
 * A link to an address of the catalog ("/components/confirm-dialog") moves inside it.
 */
@Component({
  selector: 'app-markdown',
  imports: [],
  templateUrl: './markdown.html',
  styleUrl: './markdown.css',
  host: { '(click)': 'follow($event)' },
})
export class Markdown {
  readonly source = input.required<string>();

  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly html = computed(() => marked.parse(this.source(), { async: false }));

  protected follow(event: MouseEvent): void {
    const link = (event.target as Element | null)?.closest('a');
    const href = link?.getAttribute('href');
    if (!link || !href || event.ctrlKey || event.metaKey || event.shiftKey || !this.host.nativeElement.contains(link)) return;
    if (href.startsWith('#')) {
      event.preventDefault();
      this.host.nativeElement.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (href.startsWith('/')) {
      event.preventDefault();
      void this.router.navigateByUrl(href);
    }
  }
}
