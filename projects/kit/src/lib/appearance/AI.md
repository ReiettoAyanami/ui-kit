# AI notes: Setup and appearance

- `provideLenziKit({ appId })` in every app's `app.config.ts`, with the app's own id.
- An app's settings page offers "Reduce transparency" with `LenziAppearance`; nothing else stores it.
- Never set `MAT_DIALOG_DEFAULT_OPTIONS` in an app: `provideLenziKit` does.
