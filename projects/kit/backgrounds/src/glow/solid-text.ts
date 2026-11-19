import { Directive } from '@angular/core';

/**
 * Solid words over a glowing background (lenzi, 2026-11-19: "lettere scure sul bagliore"): the letters are the page's
 * surface (`.lenzi-solid-text`, `--lenzi-solid-surface`), dark shapes over the glow behind the page, unseen on the bare
 * page. Only the letters: no box round them (`lenziSolid` would make it opaque and hide the glow). The light rays that
 * this text cut (lenzi: "forse un po' too much") are kept on the kit's `light-rays` branch.
 */
@Directive({
  selector: '[lenziSolidText]',
  host: { class: 'lenzi-solid-text' },
})
export class LenziSolidText {}
