import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';

import { CodeEditor } from '../code-editor/code-editor';
import { LiveTokens } from '../live-tokens';
import { readTokenCss, tokensToCss } from '../token-css';
import { TokenDef, TokenGroup } from '../tokens-api';

/**
 * Global variables as CSS text you can edit: every valid value applies at once (on this page, in
 * every demo); a wrong one is said and not applied. The text follows the variables changed elsewhere
 * (their controls), unless the change came from the text itself. Saving is its panel's (TokenPanel).
 */
@Component({
  selector: 'app-token-editor',
  imports: [CodeEditor],
  templateUrl: './token-editor.html',
  styleUrl: './token-editor.css',
})
export class TokenEditor {
  readonly groups = input.required<readonly TokenGroup[]>();
  /** Shown, not changed. */
  readonly readonly = input(false);
  readonly label = input('Variables');

  private readonly live = inject(LiveTokens);
  private readonly tokens = computed<TokenDef[]>(() => this.groups().flatMap((group) => group.tokens));
  private overridesFromText: Record<string, string> | null = null;

  /** The text: written from the variables, kept as typed while it is the text that changed them. */
  protected readonly text = linkedSignal<{ groups: readonly TokenGroup[]; overrides: Record<string, string> }, string>({
    source: () => ({ groups: this.groups(), overrides: this.live.overrides() }),
    computation: (source, previous) => {
      if (previous && source.overrides === this.overridesFromText && source.groups === previous.source.groups) return previous.value;
      return tokensToCss(source.groups, (token) => source.overrides[token.name] ?? token.value);
    },
  });

  protected readonly errors = signal<string[]>([]);

  protected edited(text: string): void {
    this.text.set(text);
    const reading = readTokenCss(text, this.tokens());
    this.errors.set(reading.errors);
    const overrides = { ...this.live.overrides() };
    for (const token of this.tokens()) {
      const value = reading.values[token.name];
      if (value === undefined) continue;
      if (value === token.value) delete overrides[token.name];
      else overrides[token.name] = value;
    }
    this.overridesFromText = overrides;
    this.live.replace(overrides);
  }
}
