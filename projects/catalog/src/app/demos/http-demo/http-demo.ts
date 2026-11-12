import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Component, EnvironmentInjector, computed, inject, input, runInInjectionContext, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Observable, throwError } from 'rxjs';

import { KitFigure, KitFigureGrid, describeError } from '@lenzi/ui-kit';
import { ApiError, isUnreachable, kitErrorInterceptor } from '@lenzi/ui-kit/http';

import { Markdown } from '../../shared/markdown/markdown';
import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

/** What the server answers in the demo: no server is asked, the interceptor gets the answer directly. */
function answer(kind: string): HttpErrorResponse {
  const url = '/api/consumptions';
  switch (kind) {
    case 'validation':
      return new HttpErrorResponse({
        url,
        status: 400,
        statusText: 'Bad Request',
        error: { type: 'urn:my-app:problem:validation', title: 'Invalid consumption', detail: 'Check the fields', errors: [{ field: 'quantity', message: 'Must be more than 0' }] },
      });
    case 'conflict':
      return new HttpErrorResponse({ url, status: 409, statusText: 'Conflict', error: { type: 'urn:my-app:problem:batch-finished', title: 'Conflict', detail: 'Batch 8 is finished' } });
    case 'plain':
      return new HttpErrorResponse({ url, status: 500, statusText: 'Internal Server Error', error: '' });
    default:
      return new HttpErrorResponse({ url, status: 0, statusText: 'Unknown Error', error: new ProgressEvent('error') });
  }
}

/** A failed request through kitErrorInterceptor: the ApiError the page gets, and how it reads. */
@Component({
  selector: 'app-http-demo',
  imports: [KitFigure, KitFigureGrid, Markdown, MatButtonModule],
  templateUrl: './http-demo.html',
  styleUrl: './http-demo.css',
})
export class HttpDemo {
  readonly values = input<Values>({});
  private readonly injector = inject(EnvironmentInjector);
  private readonly events = inject(DemoEvents);

  protected readonly error = signal<ApiError | null>(null);
  protected readonly json = computed(() => '```json\n' + JSON.stringify(this.error(), null, 2) + '\n```');
  protected readonly line = computed(() => (this.error() ? describeError(this.error()) : ''));
  protected readonly unreachable = computed(() => (this.error() ? isUnreachable(this.error()!) : false));

  protected send(): void {
    const kind = String(this.values()['answer'] ?? 'validation');
    const request = new HttpRequest('POST', '/api/consumptions', {});
    const next = (): Observable<HttpResponse<unknown>> => throwError(() => answer(kind));
    runInInjectionContext(this.injector, () => kitErrorInterceptor(request, next as never)).subscribe({
      error: (error: ApiError) => {
        this.error.set(error);
        this.events.log(`failed: ${describeError(error)}`);
      },
    });
  }
}
