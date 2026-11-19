# AI notes: Glass page

- Every page of an app that may have a background behind it is `<main lenziGlassPage>`: import `LenziGlassPage` from
  `@lenzi/ui-kit/backgrounds`. Never write a glass pane of your own (a `lenziLit` div behind the page, its CSS).
- The page's cards and panels: `protected readonly lit = lenziOverBackground();` and `[lenziLit]="lit()"`. Never a
  flag of the app's own saying whether a background is there: the kit's backgrounds say it themselves.
- Never call `LenziBackgroundPresence.add()` from an app.
- Never give the page element a `z-index`, a `backdrop-filter`, a `filter` or an `opacity` under 1: the pane would no
  longer be glass over the background, and a search bar in the page would not ride into the top bar.
- Nothing to do for the phone: the pane fills the screen by itself under 600 px.
