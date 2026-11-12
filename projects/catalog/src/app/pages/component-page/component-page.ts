import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map, of } from 'rxjs';

import { LenziFigure, LenziFigureGrid, LenziNotFound, LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';

import { CodeView } from '../../shared/code-view/code-view';
import { ControlsPanel } from '../../shared/controls-panel/controls-panel';
import { DemoStage } from '../../shared/demo-stage/demo-stage';
import { KitFiles } from '../../shared/kit-files';
import { Markdown } from '../../shared/markdown/markdown';
import { TokensApi } from '../../shared/tokens-api';
import { DOCS, Values, defaults, docById } from '../../registry';

const TABS = ['playground', 'rules', 'ai', 'code', 'variables'] as const;
type Tab = (typeof TABS)[number];

/**
 * One page of the kit: the demo with its parameters (the GUI), the rules (README.md), the notes for
 * Claude (AI.md), the real code, and the global variables its styles use. The tab is in the URL
 * (`?tab=code`), so a link can open it there.
 */
@Component({
  selector: 'app-component-page',
  imports: [
    CodeView,
    ControlsPanel,
    DemoStage,
    LenziFigure,
    LenziFigureGrid,
    LenziNotFound,
    LenziStatusMessage,
    Markdown,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterLink,
  ],
  templateUrl: './component-page.html',
  styleUrl: './component-page.css',
})
export class ComponentPage {
  readonly id = input.required<string>();
  readonly tab = input<string | undefined>(undefined);

  private readonly files = inject(KitFiles);
  private readonly tokensApi = inject(TokensApi);
  private readonly router = inject(Router);

  protected readonly doc = computed(() => docById(this.id()));
  protected readonly values = linkedSignal<Values>(() => {
    const doc = this.doc();
    return doc ? defaults(doc) : {};
  });
  protected readonly copied = signal(false);

  protected readonly tabIndex = computed(() => Math.max(0, TABS.indexOf((this.tab() ?? 'playground') as Tab)));

  protected readonly neighbours = computed(() => {
    const index = DOCS.findIndex((doc) => doc.id === this.id());
    return { previous: DOCS[index - 1] ?? null, next: DOCS[index + 1] ?? null };
  });

  protected readonly readme = rxResource({ params: () => this.doc()?.readme, stream: ({ params }) => this.files.text(params) });
  protected readonly ai = rxResource({ params: () => this.doc()?.ai, stream: ({ params }) => this.files.text(params) });

  protected readonly usage = computed(() => {
    const doc = this.doc();
    return doc ? doc.usage(this.values()) : '';
  });
  protected readonly usageMarkdown = computed(() => '```' + (this.doc()?.usageLanguage ?? '') + '\n' + this.usage() + '\n```');

  /** The global variables the styles of this piece use, with what they are now. */
  protected readonly variables = rxResource({
    params: () => this.doc()?.files.filter((file) => /\.(s?css)$/.test(file)),
    stream: ({ params }) =>
      combineLatest([params.length ? combineLatest(params.map((file) => this.files.text(file))) : of([] as string[]), this.tokensApi.load()]).pipe(
        map(([styles, document]) => {
          const used = new Set(styles.join('\n').match(/--lenzi-[a-z0-9-]+/g) ?? []);
          return document.groups.flatMap((group) => group.tokens.filter((token) => used.has(token.name)).map((token) => ({ ...token, group: group.id })));
        }),
      ),
  });

  protected failure(what: string, error: unknown): string {
    return couldNotLoad(what, error);
  }

  protected chooseTab(index: number): void {
    const tab = TABS[index] ?? 'playground';
    void this.router.navigate([], { queryParams: { tab: tab === 'playground' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected resetValues(): void {
    const doc = this.doc();
    if (doc) this.values.set(defaults(doc));
  }

  protected async copyUsage(): Promise<void> {
    await navigator.clipboard?.writeText(this.usage());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
