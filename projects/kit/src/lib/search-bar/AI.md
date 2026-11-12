# AI notes: Search bar

- The page keeps the text in the URL (`?q=`, `replaceUrl: true`) and asks the API with it; the bar only
  types and says when to search.
- The search runs on the server (names, case and accents ignored), not by filtering in the browser, unless
  the whole list is already on the page and small.
- Keep the old results on screen until the new ones arrive (`keptValue`).
- A hand-made search field (rare) takes `class="lenzi-search-bar"` on its mat-form-field; nothing else may
  take that shape.
