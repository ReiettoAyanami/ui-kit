import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiError, isApiError, isUnreachable, provideLenziHttp } from './api-error';
import { lenziErrorInterceptor } from './error-interceptor';

describe('lenziErrorInterceptor', () => {
  function setup(prefix: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([lenziErrorInterceptor])),
        provideHttpClientTesting(),
        provideLenziHttp({ problemTypePrefix: prefix, timeoutMs: 50 }),
      ],
    });
    return { http: TestBed.inject(HttpClient), backend: TestBed.inject(HttpTestingController) };
  }

  async function failure(answer: (backend: HttpTestingController) => void, prefix: string | null = null): Promise<ApiError> {
    const { http, backend } = setup(prefix);
    const request = firstValueFrom(http.get('/api/things'));
    answer(backend);
    try {
      await request;
    } catch (error) {
      return error as ApiError;
    }
    throw new Error('it did not fail');
  }

  it('a Problem Details body becomes an ApiError with its code and its field errors', async () => {
    const error = await failure((backend) =>
      backend.expectOne('/api/things').flush(
        { type: 'urn:substance-tracker:problem:validation', title: 'Invalid', detail: 'Check the fields', errors: [{ field: 'name', message: 'Required' }] },
        { status: 400, statusText: 'Bad Request' },
      ),
    );
    expect(error).toEqual({ status: 400, code: 'validation', title: 'Invalid', detail: 'Check the fields', fieldErrors: [{ field: 'name', message: 'Required' }] });
    expect(isApiError(error)).toBe(true);
    expect(isUnreachable(error)).toBe(false);
  });

  it('a prefix of the app keeps only the codes it knows', async () => {
    const body = { type: 'urn:my-app:problem:not-found', title: 'Not found' };
    expect((await failure((b) => b.expectOne('/api/things').flush(body, { status: 404, statusText: 'Not Found' }), 'urn:my-app:problem:')).code).toBe('not-found');
    TestBed.resetTestingModule();
    expect((await failure((b) => b.expectOne('/api/things').flush(body, { status: 404, statusText: 'Not Found' }), 'urn:other:')).code).toBeNull();
  });

  it('an error without a body keeps the status and its text; no answer at all has no status', async () => {
    expect(await failure((b) => b.expectOne('/api/things').flush('', { status: 500, statusText: 'Server Error' }))).toEqual({
      status: 500,
      code: null,
      title: 'Server Error',
      detail: '',
      fieldErrors: [],
    });
    TestBed.resetTestingModule();
    const down = await failure((b) => b.expectOne('/api/things').error(new ProgressEvent('error'), { status: 0 }));
    expect(down.status).toBeNull();
    expect(isUnreachable(down)).toBe(true);
  });

  it('no answer in time is the same as no answer', async () => {
    const error = await failure(() => undefined);
    expect(error.title).toBe('Server not reachable');
    expect(error.status).toBeNull();
  });
});
