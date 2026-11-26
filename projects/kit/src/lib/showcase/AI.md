# AI notes: Showcase

- `import { LenziShowcase, LenziShowcaseSlide } from '@lenzi/ui-kit'`. Every slide is an `<ng-template
  lenziShowcaseSlide="Name" caption="What it shows">`; never a plain element (it would be made, and run, all the time).
- Three to eight slides. Write their names as the things they show ("Glass slider"), the caption as what the slide is an
  example of ("A player's volume"): one fact each, no "·".
- A slide is live content laid out with a little grid or flex of the page's own; it has no panel, border or fill of its
  own (the showcase is the panel). A button inside it leads on ("Open the page").
- Do not drive it with a timer of your own: the showcase turns, holds and stops by itself. `[(index)]` only to start
  elsewhere or to know which is shown.
- Over a background, outside an app of Liquid Glass, give it `[lenziLit]="lit()"` as every panel.
- Never put it inside a card or a bento tile: it is the panel.
