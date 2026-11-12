# AI notes: Pull to refresh

- Mostly for an app packaged for phones (Capacitor); on a website the browser has its own.
- `refresh` asks the server and the page's resources again, and resolves when they settled; errors are shown
  by the page, the disc just goes back up.
- Mark routes where a pull makes no sense with `data: { pullToRefresh: false }`.
