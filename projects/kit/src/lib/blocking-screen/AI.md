# AI notes: Blocking screen

- One `@if` in `app.html` (outside the page), on a state the app knows for sure (an API level that does not
  match), never on a failed request.
- Say what happened and what the user can do, with the versions, in two or three sentences.
- The way out the user should take is `actionKind="flat"`; when the only way out is a poor one (reinstall,
  losing data), `stroked`, and say what it costs.
- Never use it for a failed page load, a session that ended (go to the sign-in page) or anything the user can
  fix inside the app.
