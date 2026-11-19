import { TestBed } from '@angular/core/testing';

import { LENZI_PHONE_QUERY, LenziPhone, lenziPhone } from './phone';

type Listener = (event: { matches: boolean }) => void;

describe('LenziPhone', () => {
  const view = document.defaultView!;
  let asked: string[];
  let listeners: Listener[];
  let phoneNow: boolean;

  /** The window's matchMedia: it answers as wide as the test says, and says when the width crosses the line. */
  const ask = (value: ((query: string) => unknown) | undefined) => Object.defineProperty(view, 'matchMedia', { configurable: true, writable: true, value });
  const open = (phone: boolean) => {
    phoneNow = phone;
    ask((query) => {
      asked.push(query);
      return { get matches() { return phoneNow; }, addEventListener: (_: string, listener: Listener) => listeners.push(listener) };
    });
  };
  const resize = (phone: boolean) => {
    phoneNow = phone;
    for (const listener of listeners) listener({ matches: phone });
  };

  beforeEach(() => {
    asked = [];
    listeners = [];
  });
  afterEach(() => {
    delete (view as Partial<Window>).matchMedia;
  });

  it('is the width of the styles: under 600 px', () => {
    expect(LENZI_PHONE_QUERY).toBe('(max-width: 599px)');
  });

  it('says whether the window is a phone, and changes when the window does', () => {
    open(true);
    const phone = TestBed.runInInjectionContext(() => lenziPhone());
    expect(asked).toEqual([LENZI_PHONE_QUERY]);
    expect(phone()).toBe(true);
    resize(false);
    expect(phone()).toBe(false);
    resize(true);
    expect(phone()).toBe(true);
  });

  it('listens once for the whole app, however many ask', () => {
    open(false);
    const [one, other] = TestBed.runInInjectionContext(() => [lenziPhone(), lenziPhone()]);
    expect(one).toBe(other);
    expect(asked).toHaveLength(1);
    expect(listeners).toHaveLength(1);
  });

  it('is never a phone where the window cannot be asked', () => {
    ask(undefined);
    expect(TestBed.inject(LenziPhone).matches()).toBe(false);
  });
});
