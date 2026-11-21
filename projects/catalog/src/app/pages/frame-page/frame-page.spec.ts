import { TestBed } from '@angular/core/testing';
import { UrlSegment, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { docById } from '../../registry';
import { FrameMessage } from '../../shared/demo-events';
import { FramePage } from './frame-page';

/** `/frame/<id>` and everything under it, as the catalog's routes match it (a demo's own links stay in its frame). */
const frame = (segments: UrlSegment[]) => (segments[0]?.path === 'frame' && segments.length >= 2 ? { consumed: segments, posParams: { id: segments[1]! } } : null);

describe('FramePage', () => {
  it('keeps the values the page sent when a link of the demo is followed inside the frame (lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente")', async () => {
    // the demo's module loaded first: the frame's own import of it is then done at once
    await docById('nav-list')!.demo();
    TestBed.configureTestingModule({ providers: [provideRouter([{ matcher: frame, component: FramePage }], withComponentInputBinding())] });
    const harness = await RouterTestingHarness.create();
    const appName = () => {
      harness.detectChanges();
      return harness.routeNativeElement?.querySelector('app-nav-list-demo .app-name')?.textContent?.trim();
    };

    // the values of the address, when the frame starts
    await harness.navigateByUrl(`/frame/nav-list?v=${encodeURIComponent(JSON.stringify({ appName: 'Shifts' }))}`);
    await vi.waitFor(() => expect(appName()).toBe('Shifts'), { timeout: 5000 });

    // the page's message: the demo follows it
    const message: FrameMessage = { type: 'kit-values', values: { appName: 'Teams', subtitle: 'lenzi', bottom: true }, pattern: false };
    window.dispatchEvent(new MessageEvent('message', { data: message, origin: window.location.origin }));
    expect(appName()).toBe('Teams');

    // a link of the demo, followed inside the frame: no values in its address, and the demo keeps the page's
    await harness.navigateByUrl('/frame/nav-list/substances');
    expect(appName()).toBe('Teams');
  });
});
