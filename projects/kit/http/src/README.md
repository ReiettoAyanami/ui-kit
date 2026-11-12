# API errors

`@lenzi/ui-kit/http`: every failed request becomes one `ApiError` (`kitErrorInterceptor`), so pages and forms
read failures the same way.

## Rules

- **Problem Details** (RFC 9457) from the API become `{ status, code, title, detail, fieldErrors }`; `code` is
  the end of the problem's `type` (`urn:my-app:problem:not-found` → `not-found`).
- **No answer** (network down, a stopped API, no answer in 15 s) is an `ApiError` with no status:
  `isUnreachable(error)` (502, 503, 504 too).
- **No retries, no messages**: the page decides what to say (`describeError`, a form's field errors).
- **Gateways are the only code that calls HttpClient**: one service per backend module, one method per
  operation, typed in and out, no state.
- A form shows each `fieldErrors` entry under its field, in the API's words; the rest above its buttons.

## API

- `kitErrorInterceptor`: `provideHttpClient(withFetch(), withInterceptors([kitErrorInterceptor]))`.
- `provideKitHttp({ problemTypePrefix?, timeoutMs? })`.
- `ApiError`, `FieldError`, `isApiError(error)`, `isUnreachable(error)`.

## Origin

substance-tracker `data/api-error.ts` and `data/error-interceptor.ts` (the prefix and the timeout now options).
