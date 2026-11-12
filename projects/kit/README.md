# @lenzi/ui-kit

lenzi's Angular component kit: Angular Material 3, heavily modified (dark violet on neutral greys, glass,
2 px borders, Roboto Mono), with the rules and the notes for Claude of every piece.

## Use

```jsonc
// angular.json, "styles"
"node_modules/@lenzi/ui-kit/styles/kit.scss",
"node_modules/@lenzi/ui-kit/styles/fonts.css",
```

```ts
// app.config.ts
providers: [provideLenziKit({ appId: 'my-app' }), provideHttpClient(withFetch(), withInterceptors([lenziErrorInterceptor]))]
```

| Entry point | What |
| --- | --- |
| `@lenzi/ui-kit` | the shell, navigation, buttons, toggles, search bar, figures, bars, tables, dialogs, messages, services, utilities |
| `@lenzi/ui-kit/charts` | `LenziChart` (peer dependencies: `echarts`, `ngx-echarts`) |
| `@lenzi/ui-kit/three` | `LenziThreeCanvas` (peer dependency: `three`) |
| `@lenzi/ui-kit/http` | `ApiError`, `lenziErrorInterceptor` |

## Read first

- `RULES.md`: the look and the behaviour every app follows.
- `AI-RULES.md`: how Claude works with the kit.
- `docs/`: every piece's `README.md` (rules, API) and `AI.md` (notes for Claude); `styles/docs/` for the styles.
- `libraries.json`: the frontend libraries and their rules.

The catalog (the `ui-kit` repo, `npm start`) shows every piece live, with its parameters and its code.
