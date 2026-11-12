# AI notes: App shell

- One per app, in `app.html`; the router outlet goes inside it, the version label after it.
- Give every route a `title`: the top bar shows it. Do not set the bar's title by hand unless a page truly
  needs another one.
- Things go in by attribute (`lenziShellNav`, `lenziShellActions`, `lenziShellBanner`, `lenziShellBelow`); never
  put them in the page's own template to "look like" they are in the bar.
- A sign-in page: `data: { bare: true }` on its route.
- Pages start under the bar: give a page `padding: 8px 16px 64px` and a `max-width` with `margin: 0 auto`;
  do not add a top margin for the bar.
- Never: a second toolbar, a permanent side navigation, a bottom navigation bar, a drawer that stays open on
  desktop. lenzi chose the drawer on every screen.
