// The shape of a failed API call, for every app of the kit. A plain module (no schematic makes one).
// From substance-tracker `data/api-error.ts`.
import { InjectionToken, Provider } from '@angular/core';

/**
 * A failed API call, as kitErrorInterceptor hands it to the caller. Built from the Problem Details
 * body (RFC 9457) when there is one; a network failure, or no answer in time, has no status.
 */
export interface ApiError {
  status: number | null;
  /** The problem's code, the end of its `type` (`not-found`, `banned-user`); null without one. */
  code: string | null;
  title: string;
  detail: string;
  fieldErrors: FieldError[];
}

/** One validation error, for the form field named by `field` (empty for the whole body). */
export interface FieldError {
  field: string;
  message: string;
}

export interface KitHttpOptions {
  /** How long a request waits for an answer before it counts as unanswered, in ms. */
  timeoutMs: number;
  /** The start of the API's problem types (`urn:substance-tracker:problem:`): what is after it is the code. Null: the part after the last ":" or "/". */
  problemTypePrefix: string | null;
}

export const KIT_HTTP_OPTIONS = new InjectionToken<KitHttpOptions>('KIT_HTTP_OPTIONS', {
  factory: () => ({ timeoutMs: 15_000, problemTypePrefix: null }),
});

/** The app's own options for kitErrorInterceptor: `providers: [provideKitHttp({ problemTypePrefix: 'urn:my-app:problem:' })]`. */
export function provideKitHttp(options: Partial<KitHttpOptions>): Provider {
  return { provide: KIT_HTTP_OPTIONS, useValue: { timeoutMs: 15_000, problemTypePrefix: null, ...options } };
}

/**
 * The server gave no answer: no network, no answer in time, or the proxy in front of a stopped API
 * (502, 503, 504). Any other status is an answer.
 */
export function isUnreachable(error: ApiError): boolean {
  return error.status === null || error.status === 502 || error.status === 503 || error.status === 504;
}

/** Whether something is an ApiError (a failure from kitErrorInterceptor). */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'fieldErrors' in error && 'title' in error && 'status' in error;
}
