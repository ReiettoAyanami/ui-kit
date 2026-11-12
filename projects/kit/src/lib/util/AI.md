# AI notes: Utilities

- Any list or panel that reloads with new parameters: `keptValue(resource, () => <what makes it another thing>)`.
- Display preferences: `readPreference` with a validator, `writePreference` on change; never a service of your
  own around localStorage.
- Failure text: `describeError` / `couldNotLoad`; never format an error by hand.
