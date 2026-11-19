import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

import { LenziLightBlocker, LenziLightBlockers } from './light-blockers';

/** A word of the text and where it lies in the block, CSS px from the block's top left. */
interface Word {
  text: string;
  font: string;
  x: number;
  /** Its baseline. */
  y: number;
}

/**
 * Solid words between a glowing background and whoever looks (lenzi, 2026-11-19: "i boidi sono fatti di luce e il
 * testo blocca luce. Boidi > Testo > Utente. Quindi io dovrei vedere che i boidi mi castano la luce verso di me e la
 * tagliano come forma del testo"): the letters are the page's surface (`.lenzi-solid-text`), dark shapes over the glow,
 * and they stop its light: the light rays (`<lenzi-light-rays>`) cut the shape of every word out of the light coming
 * through the page, so the beams that reach the viewer carry the words' shadow.
 */
@Directive({
  selector: '[lenziSolidText]',
  host: { class: 'lenzi-solid-text' },
})
export class LenziSolidText implements LenziLightBlocker {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly view = inject(DOCUMENT).defaultView;
  private words: Word[] = [];

  constructor() {
    const destroyRef = inject(DestroyRef);
    const leave = inject(LenziLightBlockers).add(this);
    afterNextRender(() => {
      this.measure();
      const watch = new MutationObserver(() => this.measure());
      watch.observe(this.element, { childList: true, subtree: true, characterData: true });
      const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.measure()) : null;
      resize?.observe(this.element);
      void this.element.ownerDocument.fonts?.ready.then(() => this.measure());
      destroyRef.onDestroy(() => {
        watch.disconnect();
        resize?.disconnect();
      });
    });
    destroyRef.onDestroy(leave);
  }

  /** Its words as they lie in it (the browser's own boxes of each word), kept until it changes. */
  private measure(): void {
    const document = this.element.ownerDocument;
    const view = this.view;
    if (!view || !document.createTreeWalker) return;
    const block = this.element.getBoundingClientRect();
    const range = document.createRange();
    const measuring = document.createElement('canvas').getContext('2d');
    const words: Word[] = [];
    const walker = document.createTreeWalker(this.element, 4 /* NodeFilter.SHOW_TEXT */);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      const parent = node.parentElement;
      if (!text.trim() || !parent || parent.closest('[aria-hidden="true"]')) continue;
      const style = view.getComputedStyle(parent);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      let ascent = parseFloat(style.fontSize) * 0.8;
      if (measuring) {
        measuring.font = font;
        const metrics = measuring.measureText('Hg');
        ascent = metrics.fontBoundingBoxAscent || ascent;
      }
      for (const match of text.matchAll(/\S+/g)) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const box = range.getClientRects()[0];
        if (!box) continue;
        words.push({ text: match[0], font, x: box.left - block.left, y: box.top - block.top + ascent });
      }
    }
    range.detach?.();
    this.words = words;
  }

  /** Its words, where they are on the screen now. */
  draw(context: CanvasRenderingContext2D): void {
    const block = this.element.getBoundingClientRect();
    const height = this.view?.innerHeight ?? 0;
    if (block.bottom < 0 || block.top > height) return;
    let font = '';
    for (const word of this.words) {
      if (word.font !== font) {
        context.font = font = word.font;
      }
      context.fillText(word.text, block.left + word.x, block.top + word.y);
    }
  }
}
