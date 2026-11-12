import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, throwError, timeout } from 'rxjs';

import { ApiError, KIT_HTTP_OPTIONS } from './api-error';

/**
 * Turns every failed response into an ApiError, and a request with no answer in time into one with
 * no status, like a network failure (RULES.md, "Data"; substance-tracker `data/error-interceptor.ts`).
 * No retries, no messages shown: the page decides what to say (describeError, KitStatusMessage, a
 * form's field errors). `provideHttpClient(withInterceptors([kitErrorInterceptor]))`.
 */
export const kitErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const options = inject(KIT_HTTP_OPTIONS);
  return next(req).pipe(
    // `each`: the first event (the request sent) comes at once; the answer must follow within the time.
    timeout({ each: options.timeoutMs }),
    catchError((error: unknown) => throwError(() => toError(error, options.problemTypePrefix))),
  );
};

function toError(error: unknown, prefix: string | null): unknown {
  if (error instanceof TimeoutError) {
    return { status: null, code: null, title: 'Server not reachable', detail: 'The server did not answer.', fieldErrors: [] } satisfies ApiError;
  }
  return error instanceof HttpErrorResponse ? toApiError(error, prefix) : error;
}

/** The Problem Details body (RFC 9457). */
interface ProblemDetails {
  type?: string;
  title: string;
  detail?: string;
  errors?: ApiError['fieldErrors'];
}

function toApiError(response: HttpErrorResponse, prefix: string | null): ApiError {
  // Status 0: no response at all (API or network down).
  if (response.status === 0) {
    return { status: null, code: null, title: 'Server not reachable', detail: 'The server could not be reached.', fieldErrors: [] };
  }
  const body: unknown = response.error;
  if (isProblemDetails(body)) {
    return {
      status: response.status,
      code: codeOf(body.type, prefix),
      title: body.title,
      detail: body.detail ?? '',
      fieldErrors: Array.isArray(body.errors) ? body.errors : [],
    };
  }
  return { status: response.status, code: null, title: response.statusText, detail: '', fieldErrors: [] };
}

/** `urn:my-app:problem:not-found` → `not-found`; `about:blank` or none → null. */
function codeOf(type: string | undefined, prefix: string | null): string | null {
  if (!type || type === 'about:blank') return null;
  if (prefix !== null) return type.startsWith(prefix) ? type.slice(prefix.length) || null : null;
  return type.split(/[:/]/).pop() || null;
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return typeof body === 'object' && body !== null && 'title' in body;
}
