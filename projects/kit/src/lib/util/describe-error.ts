// How a failure reads on screen. A plain module (no schematic makes one).

/** The shape of an error the kit can describe: an ApiError (`@lenzi/ui-kit/http`), or anything with a message. */
export interface DescribableError {
  status?: number | null;
  title?: string;
  detail?: string;
  message?: string;
}

/**
 * One line for a failure: the API's detail (or title), then its status in brackets: "Batch is
 * finished (409)". The confirm dialog and the status messages say it the same way.
 */
export function describeError(error: unknown): string {
  const known = (typeof error === 'object' && error !== null ? error : {}) as DescribableError;
  // A resource wraps the interceptor's ApiError (not an Error) as its cause.
  const cause = (error as { cause?: unknown } | null)?.cause;
  if (!known.title && !known.detail && typeof cause === 'object' && cause !== null) return describeError(cause);
  const text = known.detail || known.title || known.message || 'Something went wrong';
  return known.status ? `${text} (${known.status})` : text;
}

/**
 * What a page says when a list or a panel could not be loaded (substance-tracker: "Could not load
 * the substances: Not found (404)"), so a failure is never a blank page.
 */
export function couldNotLoad(what: string, error: unknown): string {
  return `Could not load ${what}: ${describeError(error)}`;
}
