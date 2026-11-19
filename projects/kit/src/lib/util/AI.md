# AI notes: Utilities

- Any list or panel that reloads with new parameters: `keptValue(resource, () => <what makes it another thing>)`.
- Display preferences: `readPreference` with a validator, `writePreference` on change; never a service of your
  own around localStorage.
- Failure text: `describeError` / `couldNotLoad`; never format an error by hand.
- Code that changes on a phone: `lenziPhone()` (a signal) or `LENZI_PHONE_QUERY`; never a `matchMedia` with a
  width of your own, never a resize listener to tell a phone. A scene of its own on a phone: `[phoneScene]` on
  `<lenzi-scene>`, no code.
