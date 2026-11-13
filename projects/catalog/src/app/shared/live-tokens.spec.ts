import { TestBed } from '@angular/core/testing';

import { LiveTokens } from './live-tokens';

describe('the variables changed in this browser', () => {
  let live: LiveTokens;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ now: new Date('2026-11-13T10:00:00Z') });
    live = TestBed.inject(LiveTokens);
  });

  afterEach(() => vi.useRealTimers());

  it('writes down every change, from what to what; null is the value of the kit', () => {
    live.set('--lenzi-glass', '60%');
    vi.advanceTimersByTime(60_000);
    live.set('--lenzi-border', '3px');
    vi.advanceTimersByTime(60_000);
    live.reset('--lenzi-glass');
    expect(live.log().map(({ name, from, to }) => ({ name, from, to }))).toEqual([
      { name: '--lenzi-glass', from: null, to: '60%' },
      { name: '--lenzi-border', from: null, to: '3px' },
      { name: '--lenzi-glass', from: '60%', to: null },
    ]);
    expect(JSON.parse(localStorage.getItem('kit-catalog.variables-log')!)).toHaveLength(3);
  });

  it('a slider dragged is one change, and one that ends where it started is none', () => {
    live.set('--lenzi-glass', '57%');
    vi.advanceTimersByTime(200);
    live.set('--lenzi-glass', '58%');
    vi.advanceTimersByTime(200);
    live.set('--lenzi-glass', '70%');
    expect(live.log().map(({ from, to }) => ({ from, to }))).toEqual([{ from: null, to: '70%' }]);
    live.reset('--lenzi-glass');
    expect(live.log()).toEqual([]);
    // and the page is back on the kit's value
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue('--lenzi-glass')).toBe('');
  });

  it('what was saved into the kit is not a change of this browser', async () => {
    live.set('--lenzi-glass', '60%');
    await live.saved(['--lenzi-glass']);
    expect(live.overrides()).toEqual({});
    expect(live.log()).toHaveLength(1);
  });

  it('forgets the list and leaves the variables as they are', () => {
    live.set('--lenzi-glass', '60%');
    live.clearLog();
    expect(live.log()).toEqual([]);
    expect(live.overrides()).toEqual({ '--lenzi-glass': '60%' });
  });
});
