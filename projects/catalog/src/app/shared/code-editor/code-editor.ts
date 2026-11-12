import { Component, ElementRef, computed, input, model, viewChild } from '@angular/core';

import { highlight } from '../highlight';

/**
 * Code you can edit, coloured as you type (lenzi, 2026-11-12: "everything that involves
 * code/configuration file must be put into a code-like textarea where the user can edit, and they
 * will take effect"). A textarea over the coloured code, the same font and size, so the caret and the
 * selection are the browser's own; line numbers at the left. Tab indents (two spaces), Shift+Tab
 * takes them back, Enter keeps the line's indent, Escape leaves the editor (Tab is the editor's).
 * What a change does is its host's: apply variables, move a demo's parameters, save a file.
 */
@Component({
  selector: 'app-code-editor',
  imports: [],
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.css',
})
export class CodeEditor {
  readonly value = model.required<string>();
  /** highlight.js's name of the language: typescript, xml (HTML), css, scss, json, markdown. */
  readonly language = input('typescript');
  /** What a screen reader hears for the editor: "Usage code". */
  readonly label = input.required<string>();
  /** Shown, selectable and copyable, but not changeable. */
  readonly readonly = input(false);
  /** The most it grows before it scrolls (CSS). */
  readonly maxHeight = input('70dvh');

  private readonly area = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');

  /** The code as coloured HTML; a last empty line still has its height. */
  protected readonly coloured = computed(() => highlight(this.value(), this.language()) + '\n');
  protected readonly lines = computed(() => this.value().split('\n').length);
  protected readonly numbers = computed(() => Array.from({ length: this.lines() }, (_, i) => i + 1));
  /** The textarea is as wide as the longest line, so the box scrolls, not the textarea. */
  protected readonly columns = computed(() => Math.max(20, ...this.value().split('\n').map((line) => line.length)) + 2);

  protected typed(text: string): void {
    this.value.set(text);
  }

  protected key(event: KeyboardEvent): void {
    if (this.readonly()) return;
    const area = this.area().nativeElement;
    if (event.key === 'Escape') {
      area.blur();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.indent(area, event.shiftKey);
      return;
    }
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const { selectionStart: start, selectionEnd: end, value } = area;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const indent = /^[ \t]*/.exec(value.slice(lineStart, start))?.[0] ?? '';
      this.replace(area, start, end, `\n${indent}`, start + 1 + indent.length);
    }
  }

  /** Two spaces in at the caret, or before every selected line; Shift: two spaces out. */
  private indent(area: HTMLTextAreaElement, out: boolean): void {
    const { selectionStart: start, selectionEnd: end, value } = area;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    if (!out && start === end) {
      this.replace(area, start, end, '  ', start + 2);
      return;
    }
    const block = value.slice(lineStart, end);
    const lines = block.split('\n');
    const changed = lines.map((line) => (out ? line.replace(/^ {1,2}/, '') : `  ${line}`)).join('\n');
    const firstShift = out ? -(lines[0]!.length - lines[0]!.replace(/^ {1,2}/, '').length) : 2;
    area.value = value.slice(0, lineStart) + changed + value.slice(end);
    area.selectionStart = Math.max(lineStart, start + firstShift);
    area.selectionEnd = end + (changed.length - block.length);
    this.value.set(area.value);
  }

  private replace(area: HTMLTextAreaElement, start: number, end: number, text: string, caret: number): void {
    area.value = area.value.slice(0, start) + text + area.value.slice(end);
    area.selectionStart = area.selectionEnd = caret;
    this.value.set(area.value);
  }
}
