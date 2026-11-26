import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * One slide of a `LenziShowcase`, on an `<ng-template>`: only the slide on show is made, so a slide that moves (a
 * scene, a chart) runs only while it is shown. Its name is what the showcase's list says; `caption` what it shows.
 */
@Directive({
  selector: 'ng-template[lenziShowcaseSlide]',
})
export class LenziShowcaseSlide {
  /** Its name in the showcase's list: "Glass slider". */
  readonly name = input.required<string>({ alias: 'lenziShowcaseSlide' });
  /** What it shows, under its name: "A player's volume". */
  readonly caption = input<string | null>(null);

  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
