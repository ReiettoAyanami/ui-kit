import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map, of } from 'rxjs';

import { LenziFigure, LenziFigureGrid, LenziNotFound, LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';

import { CodeEditor } from '../../shared/code-editor/code-editor';
import { CodeView } from '../../shared/code-view/code-view';
import { ControlsPanel } from '../../shared/controls-panel/controls-panel';
import { DemoStage } from '../../shared/demo-stage/demo-stage';
import { KitFiles } from '../../shared/kit-files';
import { DocView } from '../../shared/doc-view/doc-view';
import { TokenPanel } from '../../shared/token-panel/token-panel';
import { TokenGroup, TokensApi } from '../../shared/tokens-api';
import { DOCS, KitDoc, Values, codedControls, defaults, docById, readUsage } from '../../registry';
import { PublicPages } from '../../shared/public-pages';

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
    CodeEditor,
    CodeView,
    DocView,
    ControlsPanel,
    DemoStage,
    LenziFigure,
    LenziFigureGrid,
    LenziNotFound,
    LenziStatusMessage,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterLink,
    TokenPanel,
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
  private readonly publicPages = inject(PublicPages);

  protected readonly doc = computed(() => docById(this.id()));
  protected readonly values = linkedSignal<Values>(() => {
    const doc = this.doc();
    return doc ? defaults(doc) : {};
  });
  protected readonly copied = signal(false);

  protected readonly tabIndex = computed(() => Math.max(0, TABS.indexOf((this.tab() ?? 'playground') as Tab)));

  /** Whoever is looking may see the Variables page (the admin may hide it). */
  protected readonly variablesPage = computed(() => this.publicPages.shows('variables'));

  protected readonly neighbours = computed(() => {
    // among the pages whoever is looking may see
    const docs = DOCS.filter((doc) => this.publicPages.shows(`components/${doc.id}`));
    const index = docs.findIndex((doc) => doc.id === this.id());
    return index < 0 ? { previous: null, next: null } : { previous: docs[index - 1] ?? null, next: docs[index + 1] ?? null };
  });


  /**
   * The usage code: written from the parameters, and kept as typed while it is the code that moved
   * them (editing it moves the parameters back: readUsage).
   */
  private valuesFromCode: Values | null = null;
  protected readonly usage = linkedSignal<{ doc: KitDoc | undefined; values: Values }, string>({
    source: () => ({ doc: this.doc(), values: this.values() }),
    computation: (source, previous) => {
      if (previous && source.values === this.valuesFromCode && source.doc === previous.source.doc) return previous.value;
      return source.doc ? source.doc.usage(source.values) : '';
    },
  });
  protected readonly usageNotes = signal<string[]>([]);
  protected readonly coded = computed(() => {
    const doc = this.doc();
    return doc ? codedControls(doc).map((control) => control.label) : [];
  });
  protected readonly usageLanguage = computed(() => {
    const language = this.doc()?.usageLanguage ?? 'typescript';
    return language === 'html' ? 'xml' : language;
  });

  /** The global variables the styles of this piece use, in their groups. */
  protected readonly variables = rxResource({
    params: () => this.doc()?.files.filter((file) => /\.(s?css)$/.test(file)),
    stream: ({ params }) =>
      combineLatest([params.length ? combineLatest(params.map((file) => this.files.text(file))) : of([] as string[]), this.tokensApi.load()]).pipe(
        map(([styles, document]): TokenGroup[] => {
          const used = new Set(styles.join('\n').match(/--lenzi-[a-z0-9-]+/g) ?? []);
          return document.groups
            .map((group) => ({ ...group, tokens: group.tokens.filter((token) => used.has(token.name)) }))
            .filter((group) => group.tokens.length > 0);
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
    this.usageNotes.set([]);
  }

  /** The code was edited: the parameters it carries follow it, the demo with them. */
  protected usageEdited(text: string): void {
    const doc = this.doc();
    if (!doc) return;
    this.usage.set(text);
    const { values, notes } = readUsage(doc, text);
    const next = { ...this.values(), ...values };
    this.valuesFromCode = next;
    this.values.set(next);
    this.usageNotes.set(notes);
  }

  protected async copyUsage(): Promise<void> {
    await navigator.clipboard?.writeText(this.usage());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
