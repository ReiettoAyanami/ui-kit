# AI notes: Status message

- Every list and panel that loads has the three states; never leave a blank area or a spinner of your own.
- Failures: `couldNotLoad('the <things>', error)`; the error is the interceptor's ApiError (a resource wraps
  it as `cause`: `describeError` unwraps it).
- Empty: a short sentence naming the things, never "No data".
